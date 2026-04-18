param(
    [ValidateSet("init", "start", "stop", "status")]
    [string]$Action = "start"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$composeFile = Join-Path $repoRoot "docker-compose.yml"
$serviceName = "db"
$databaseUrl = "postgresql://eduhub:eduhub@localhost:5433/eduhub"

if (!(Test-Path $composeFile)) {
    throw "Khong tim thay docker-compose.yml tai $composeFile"
}

function Invoke-DockerCompose {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Args
    )

    & docker compose -f $composeFile @Args
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose $($Args -join ' ') that bai."
    }
}

function Wait-ForDatabase {
    $maxAttempts = 24
    for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
        & docker compose -f $composeFile exec -T $serviceName pg_isready -U eduhub -d eduhub *> $null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Database da san sang tai $databaseUrl"
            return
        }
        Start-Sleep -Seconds 2
    }
    throw "Database chua san sang sau $maxAttempts lan kiem tra."
}

function Start-Database {
    Invoke-DockerCompose up -d $serviceName
    Wait-ForDatabase
}

function Stop-Database {
    Invoke-DockerCompose stop $serviceName
}

function Show-Status {
    Invoke-DockerCompose ps $serviceName
}

switch ($Action) {
    "init" { Start-Database }
    "start" { Start-Database }
    "stop" { Stop-Database }
    "status" { Show-Status }
}
