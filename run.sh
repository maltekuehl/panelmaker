#!/usr/bin/env bash
# Spin up the development stack (containerized `npm run dev` + Postgres).
#
#   ./run.sh             # start (foreground, with logs)
#   ./run.sh --build     # rebuild the dev image first
#   ./run.sh -d          # start detached
#   ./run.sh down        # tear the stack down
#
# Any extra arguments are passed straight through to docker compose.
set -euo pipefail

cd "$(dirname "$0")"

COMPOSE_FILE="docker-compose.dev.yml"

if [ ! -f .env ]; then
  echo "warning: .env not found. Copy .env.local.example to .env first." >&2
fi

# Allow `./run.sh down`, `./run.sh logs`, etc. to address the dev stack.
if [ "${1:-}" = "down" ] || [ "${1:-}" = "logs" ] || [ "${1:-}" = "ps" ]; then
  exec docker compose -f "$COMPOSE_FILE" "$@"
fi

exec docker compose -f "$COMPOSE_FILE" up "$@"
