$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$wslDistro = "Ubuntu-24.04"
$composeFile = "docker-compose.dev.yml"
$databaseHost = "127.0.0.1"
$databasePort = 5432
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
    [int]$TimeoutSeconds = 45
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
      $connect = $client.BeginConnect($HostName, $Port, $null, $null)
      if ($connect.AsyncWaitHandle.WaitOne(1000)) {
        $client.EndConnect($connect)
        return
      }
    }
    catch {
      Start-Sleep -Milliseconds 500
    }
    finally {
      $client.Close()
    }

    Start-Sleep -Milliseconds 500
  }

  throw "PostgreSQL is not reachable at ${HostName}:${Port} after ${TimeoutSeconds}s."
}

function Start-Postgres {
  param(
    [Parameter(Mandatory = $true)][string]$RepoWslPath,
    [Parameter(Mandatory = $true)][string]$ComposePath
  )

  $quotedRepo = Quote-ShSingle $RepoWslPath
  $command = "cd $quotedRepo && docker compose -f $ComposePath up -d"

  Invoke-Checked `
    -FilePath "wsl.exe" `
    -ArgumentList @("-d", $wslDistro, "-u", "root", "--", "sh", "-lc", $command) `
    -FailureMessage "Failed to start PostgreSQL through WSL Docker."
}

function Start-WslKeepAlive {
  Start-Process `
    -FilePath "wsl.exe" `
    -ArgumentList @("-d", $wslDistro, "-u", "root", "--", "sh", "-lc", "sleep infinity") `
    -WindowStyle Hidden `
    -PassThru
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

function Use-LoopbackDatabaseHost {
  $databaseUrl = Get-DotEnvValue "DATABASE_URL"

  if (-not $databaseUrl) {
    throw "DATABASE_URL is missing from .env."
  }

  $env:DATABASE_URL = $databaseUrl.Replace("@localhost:", "@127.0.0.1:")
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

Write-Step "Starting PostgreSQL in WSL Docker"
Start-Postgres -RepoWslPath $repoWslPath -ComposePath $composeFile

Write-Step "Keeping WSL alive for local port forwarding"
$keepAliveProcess = Start-WslKeepAlive

try {
  Write-Step "Waiting for PostgreSQL on ${databaseHost}:${databasePort}"
  Wait-ForTcpPort -HostName $databaseHost -Port $databasePort -TimeoutSeconds 60
  Use-LoopbackDatabaseHost

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
  if ($null -ne $keepAliveProcess -and -not $keepAliveProcess.HasExited) {
    Stop-Process -Id $keepAliveProcess.Id -Force
  }
}
