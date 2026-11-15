#!/usr/bin/env bash
set -euo pipefail

container_name="kanban-codex"
if docker container inspect "$container_name" >/dev/null 2>&1; then
  docker container stop "$container_name"
else
  printf 'Kanban Codex is not running.\n'
fi
