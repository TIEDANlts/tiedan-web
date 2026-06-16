$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$wslDistro = "Ubuntu-24.04"
$composeFile = "docker-compose.dev.yml"
$postgresContainerName = "personal_site_postgres"
$databasePort = 5432
$databaseName = "personal_site"
$databaseUser = "personal_site"
$wslDatabaseUrl = "postgresql://${databaseUser}:${databaseUser}@127.0.0.1:${databasePort}/${databaseName}?schema=public"
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

function Invoke-WslChecked {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(Mandatory = $true)][string]$FailureMessage
  )

  & wsl.exe -d $wslDistro -u root -- sh -lc $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$FailureMessage Exit code: $LASTEXITCODE"
  }
}

function Invoke-WslCommand {
  param([Parameter(Mandatory = $true)][string]$Command)

  & wsl.exe -d $wslDistro -u root -- sh -lc $Command
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
    & wsl.exe -d $wslDistro -u root -- sh -lc $readyCommand
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
$quotedRepo = Quote-ShSingle $repoWslPath
$quotedWslDatabaseUrl = Quote-ShSingle $wslDatabaseUrl
$wslDatabaseEnv = "DATABASE_URL=$quotedWslDatabaseUrl"

Write-Step "Starting PostgreSQL in WSL Docker"
Start-Postgres -RepoWslPath $repoWslPath -ComposePath $composeFile

Write-Step "Waiting for PostgreSQL inside WSL Docker"
Wait-ForPostgresReady `
  -ContainerName $postgresContainerName `
  -DatabaseName $databaseName `
  -DatabaseUser $databaseUser `
  -Port $databasePort `
  -TimeoutSeconds 60

Write-Step "Applying Prisma migrations in WSL"
Invoke-WslChecked `
  -Command "cd $quotedRepo && $wslDatabaseEnv npx prisma migrate deploy" `
  -FailureMessage "Prisma migration failed."

Write-Step "Generating Prisma client in WSL"
Invoke-WslChecked `
  -Command "cd $quotedRepo && $wslDatabaseEnv npx prisma generate" `
  -FailureMessage "Prisma generate failed."

Write-Step "Seeding local data in WSL"
Invoke-WslChecked `
  -Command "cd $quotedRepo && $wslDatabaseEnv npm run db:seed" `
  -FailureMessage "Database seed failed."

Write-Step "Starting Next.js dev server in WSL"
Write-Host "Open http://localhost:3000 after the server is ready. Stop it with Ctrl+C." -ForegroundColor Green
Invoke-WslCommand -Command "cd $quotedRepo && $wslDatabaseEnv npm run dev -- --hostname 0.0.0.0"
