#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
project_root="$(cd "$script_dir/.." && pwd)"
container_name="kanban-codex"
port="$(printenv KANBAN_PORT 2>/dev/null || printf '8000')"
data_dir="$project_root/data"
env_file="$project_root/.env"

if [[ ! "$port" =~ ^[0-9]+$ ]]; then
  printf 'KANBAN_PORT must be a numeric TCP port.\n' >&2
  exit 1
fi

if docker container inspect "$container_name" >/dev/null 2>&1; then
  state="$(docker container inspect --format '{{.State.Status}}' "$container_name")"
  if [[ "$state" == "running" ]]; then
    printf 'Kanban Codex is already running at http://127.0.0.1:%s\n' "$port"
    exit 0
  fi
  docker container rm "$container_name" >/dev/null
fi

docker build -t "$container_name" "$project_root"
mkdir -p "$data_dir"

if [[ -f "$env_file" ]]; then
  docker run --rm --detach --name "$container_name" --publish "127.0.0.1:$port:8000" --mount "type=bind,source=$data_dir,target=/app/data" --env-file "$env_file" "$container_name"
else
  docker run --rm --detach --name "$container_name" --publish "127.0.0.1:$port:8000" --mount "type=bind,source=$data_dir,target=/app/data" "$container_name"
fi
printf 'Kanban Codex is ready at http://127.0.0.1:%s\n' "$port"
