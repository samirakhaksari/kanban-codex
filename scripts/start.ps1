$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$containerName = "kanban-codex"
$port = if ($env:KANBAN_PORT) { $env:KANBAN_PORT } else { "8000" }
$dataPath = Join-Path $projectRoot "data"
$envFile = Join-Path $projectRoot ".env"

if ($port -notmatch "^[0-9]+$") {
    throw "KANBAN_PORT must be a numeric TCP port."
}

$existing = & docker ps -a --filter "name=^/$($containerName)$" --format "{{.Names}}"
if ($LASTEXITCODE -ne 0) {
    throw "Docker is unavailable. Start Docker Desktop or Docker Engine and try again."
}
if ($existing -contains $containerName) {
    $state = & docker container inspect --format "{{.State.Status}}" $containerName
    if ($state -eq "running") {
        Write-Output "Kanban Codex is already running at http://127.0.0.1:$($port)"
        exit 0
    }
    & docker container rm $containerName | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Could not remove the stopped Kanban Codex container."
    }
}

& docker build -t $containerName $projectRoot
if ($LASTEXITCODE -ne 0) {
    throw "Docker image build failed."
}

New-Item -ItemType Directory -Force -Path $dataPath | Out-Null
$mountPath = (Resolve-Path $dataPath).Path -replace "\\", "/"
$publish = "127.0.0.1:$($port):8000"

if (Test-Path -LiteralPath $envFile) {
    & docker run --rm --detach --name $containerName --publish $publish --mount "type=bind,source=$($mountPath),target=/app/data" --env-file $envFile $containerName
} else {
    & docker run --rm --detach --name $containerName --publish $publish --mount "type=bind,source=$($mountPath),target=/app/data" $containerName
}
if ($LASTEXITCODE -ne 0) {
    throw "Could not start the Kanban Codex container."
}
Write-Output "Kanban Codex is ready at http://127.0.0.1:$($port)"
