$ErrorActionPreference = "Stop"
$containerName = "kanban-codex"

$state = & docker container inspect --format "{{.State.Status}}" $containerName 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Output "Kanban Codex is not running."
    exit 0
}
if ($state -eq "running") {
    & docker container stop $containerName
    if ($LASTEXITCODE -ne 0) {
        throw "Could not stop the Kanban Codex container."
    }
    Write-Output "Kanban Codex stopped."
}
