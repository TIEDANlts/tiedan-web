$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$wslDistro = "Ubuntu-24.04"
$composeFile = "docker-compose.dev.yml"
$postgresContainerName = "personal_site_postgres"
$loopbackDatabaseHost = "127.0.0.1"
$databasePort = 5432
$databaseName = "personal_site"
$databaseUser = "personal_site"
$keepAlivePidFile = "/tmp/personal-site-dev-local-keepalive.pid"
function Write-Step {
  param([Parameter(Mandatory = $true)][string]$Message)

  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Command {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$InstallHint
  )

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing command '$Name'. $InstallHint"
  }
}

function Convert-ToWslPath {
  param([Parameter(Mandatory = $true)][string]$WindowsPath)

  $fullPath = (Resolve-Path $WindowsPath).Path
  $drive = $fullPath.Substring(0, 1).ToLowerInvariant()
  $relativePath = $fullPath.Substring(2).Replace("\", "/")

  return "/mnt/$drive$relativePath"
}

function Quote-ShSingle {
  param([Parameter(Mandatory = $true)][string]$Value)

  return "'" + $Value.Replace("'", "'\''") + "'"
}

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$ArgumentList,
    [Parameter(Mandatory = $true)][string]$FailureMessage
  )

  & $FilePath @ArgumentList
  if ($LASTEXITCODE -ne 0) {
    throw "$FailureMessage Exit code: $LASTEXITCODE"
  }
}

function Wait-ForTcpPort {
  param(
    [Parameter(Mandatory = $true)][string]$HostName,
    [Parameter(Mandatory = $true)][int]$Port,
    [int]$TimeoutSeconds = 45,
    [int]$StableChecks = 1
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $successfulChecks = 0

  while ((Get-Date) -lt $deadline) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
      $connect = $client.BeginConnect($HostName, $Port, $null, $null)
      if ($connect.AsyncWaitHandle.WaitOne(1000)) {
        $client.EndConnect($connect)
        $successfulChecks += 1

        if ($successfulChecks -ge $StableChecks) {
          return
        }
      }
    }
    catch {
      $successfulChecks = 0
      Start-Sleep -Milliseconds 500
    }
    finally {
      $client.Close()
    }

    Start-Sleep -Milliseconds 500
  }

  throw "PostgreSQL is not reachable at ${HostName}:${Port} after ${TimeoutSeconds}s."
}

function Invoke-WslChecked {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(Mandatory = $true)][string]$FailureMessage
  )

  Invoke-Checked `
    -FilePath "wsl.exe" `
    -ArgumentList @("--distribution", $wslDistro, "--user", "root", "--", "sh", "-lc", $Command) `
    -FailureMessage $FailureMessage
}

function Wait-ForPostgresReady {
  param(
    [Parameter(Mandatory = $true)][string]$ContainerName,
    [Parameter(Mandatory = $true)][string]$DatabaseName,
    [Parameter(Mandatory = $true)][string]$DatabaseUser,
    [Parameter(Mandatory = $true)][int]$Port,
    [int]$TimeoutSeconds = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $readyCommand = "docker exec $ContainerName pg_isready -U $DatabaseUser -d $DatabaseName -h 127.0.0.1 -p $Port >/dev/null 2>&1"

  while ((Get-Date) -lt $deadline) {
    & wsl.exe --distribution $wslDistro --user root -- sh -lc $readyCommand
    if ($LASTEXITCODE -eq 0) {
      return
    }

    Start-Sleep -Seconds 1
  }

  throw "PostgreSQL container '$ContainerName' is not ready after ${TimeoutSeconds}s."
}

function Start-Postgres {
  param(
    [Parameter(Mandatory = $true)][string]$RepoWslPath,
    [Parameter(Mandatory = $true)][string]$ComposePath
  )

  $quotedRepo = Quote-ShSingle $RepoWslPath
  $command = "cd $quotedRepo && docker compose -f $ComposePath up -d"

  Invoke-WslChecked `
    -Command $command `
    -FailureMessage "Failed to start PostgreSQL through WSL Docker."
}

function Start-WslKeepAlive {
  $quotedPidFile = Quote-ShSingle $keepAlivePidFile
  $command = "if [ -f $quotedPidFile ]; then kill `$(cat $quotedPidFile) >/dev/null 2>&1 || true; rm -f $quotedPidFile; fi; nohup sh -c 'while :; do sleep 3600; done' >/dev/null 2>&1 & echo `$! > $quotedPidFile"

  Invoke-WslChecked `
    -Command $command `
    -FailureMessage "Failed to keep WSL distro '$wslDistro' alive for Docker port forwarding."
}

function Stop-WslKeepAlive {
  $quotedPidFile = Quote-ShSingle $keepAlivePidFile
  $command = "if [ -f $quotedPidFile ]; then kill `$(cat $quotedPidFile) >/dev/null 2>&1 || true; rm -f $quotedPidFile; fi"

  & wsl.exe --distribution $wslDistro --user root -- sh -lc $command | Out-Null
}

function Get-DotEnvValue {
  param([Parameter(Mandatory = $true)][string]$Name)

  $line = Get-Content -LiteralPath ".env" | Where-Object { $_ -match "^\s*$Name\s*=" } | Select-Object -First 1
  if (-not $line) {
    return $null
  }

  $value = $line -replace "^\s*$Name\s*=\s*", ""
  return $value.Trim().Trim('"').Trim("'")
}

function Get-WslPrimaryIp {
  $output = & wsl.exe --distribution $wslDistro --user root -- sh -lc "hostname -I"
  if ($LASTEXITCODE -ne 0) {
    return $null
  }

  $outputText = ($output -join " ").Replace([char]0, " ").Trim()
  $addresses = $outputText -split "\s+" | Where-Object { $_ -match "^\d{1,3}(\.\d{1,3}){3}$" }

  return $addresses | Where-Object {
    $_ -notmatch "^(127|169\.254)\."
  } | Select-Object -First 1
}

function Resolve-DatabaseHost {
  Write-Step "Checking Windows PostgreSQL access on ${loopbackDatabaseHost}:${databasePort}"
  try {
    Wait-ForTcpPort -HostName $loopbackDatabaseHost -Port $databasePort -TimeoutSeconds 20 -StableChecks 3
    return $loopbackDatabaseHost
  }
  catch {
    Write-Host "127.0.0.1 forwarding is not stable yet. Falling back to the WSL IP." -ForegroundColor Yellow
  }

  $wslIp = Get-WslPrimaryIp
  if (-not $wslIp) {
    throw "Could not determine the WSL IP address for PostgreSQL fallback."
  }

  Write-Step "Checking PostgreSQL access on ${wslIp}:${databasePort}"
  Wait-ForTcpPort -HostName $wslIp -Port $databasePort -TimeoutSeconds 45 -StableChecks 2

  return $wslIp
}

function Set-DatabaseHost {
  param([Parameter(Mandatory = $true)][string]$HostName)

  $databaseUrl = Get-DotEnvValue "DATABASE_URL"

  if (-not $databaseUrl) {
    throw "DATABASE_URL is missing from .env."
  }

  try {
    $uri = [System.UriBuilder]::new($databaseUrl)
    $uri.Host = $HostName
    $env:DATABASE_URL = $uri.Uri.AbsoluteUri
  }
  catch {
    $env:DATABASE_URL = $databaseUrl -replace "(@)(localhost|127\.0\.0\.1|\[[^\]]+\]|[^:/?]+)(:)", "`${1}${HostName}`$3"
  }

  Write-Host "Using PostgreSQL host ${HostName}:${databasePort} for Prisma and Next.js." -ForegroundColor Green
}

Write-Step "Checking local prerequisites"
Assert-Command "wsl.exe" "Install WSL and the $wslDistro distribution first."
Assert-Command "npm.cmd" "Install Node.js and npm first."
Assert-Command "npx.cmd" "Install Node.js and npm first."

if (-not (Test-Path -LiteralPath ".env")) {
  throw "Missing .env. Copy .env.example to .env and fill AUTH_SECRET, ADMIN_USERNAME, and ADMIN_PASSWORD."
}

if (-not (Test-Path -LiteralPath "node_modules")) {
  throw "Missing node_modules. Run npm.cmd install first."
}

$repoWslPath = Convert-ToWslPath $repoRoot

Write-Step "Keeping WSL alive for local port forwarding"
Start-WslKeepAlive

Write-Step "Starting PostgreSQL in WSL Docker"
Start-Postgres -RepoWslPath $repoWslPath -ComposePath $composeFile

try {
  Write-Step "Waiting for PostgreSQL inside WSL Docker"
  Wait-ForPostgresReady `
    -ContainerName $postgresContainerName `
    -DatabaseName $databaseName `
    -DatabaseUser $databaseUser `
    -Port $databasePort `
    -TimeoutSeconds 60

  $resolvedDatabaseHost = Resolve-DatabaseHost
  Set-DatabaseHost -HostName $resolvedDatabaseHost

  Write-Step "Applying Prisma migrations"
  Invoke-Checked `
    -FilePath "npx.cmd" `
    -ArgumentList @("prisma", "migrate", "deploy") `
    -FailureMessage "Prisma migration failed."

  Write-Step "Generating Prisma client"
  Invoke-Checked `
    -FilePath "npx.cmd" `
    -ArgumentList @("prisma", "generate") `
    -FailureMessage "Prisma generate failed."

  Write-Step "Seeding local data"
  Invoke-Checked `
    -FilePath "npm.cmd" `
    -ArgumentList @("run", "db:seed") `
    -FailureMessage "Database seed failed."

  Write-Step "Starting Next.js dev server"
  Write-Host "Open http://127.0.0.1:3000 after the server is ready." -ForegroundColor Green
  & npm.cmd run dev
}
finally {
  Stop-WslKeepAlive
}
