#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  echo "ERROR: .env does not exist. Copy .env.example to .env first." >&2
  exit 1
fi

set -a
. ./.env
set +a

: "${APP_PORT:?APP_PORT must be set in .env}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set in .env}"
: "${DATABASE_URL:?DATABASE_URL must be set in .env}"
: "${AUTH_SECRET:?AUTH_SECRET must be set in .env}"

if [ "${#AUTH_SECRET}" -lt 32 ]; then
  echo "ERROR: AUTH_SECRET must contain at least 32 characters." >&2
  exit 1
fi

case "${POSTGRES_PASSWORD}" in
  CHANGE_THIS*|change-me|"")
    echo "ERROR: Replace the placeholder POSTGRES_PASSWORD." >&2
    exit 1
    ;;
esac

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is not installed." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: docker compose plugin is not available." >&2
  exit 1
fi

BIND_IP="${APP_BIND_IP:-127.0.0.1}"

if command -v ss >/dev/null 2>&1 && ss -ltnH | awk '{print $4}' | grep -Eq "(^|:)${APP_PORT}$"; then
  echo "ERROR: TCP port ${APP_PORT} is already in use on this VPS." >&2
  ss -ltnp 2>/dev/null | grep -E ":${APP_PORT}[[:space:]]" || true
  exit 1
fi

echo "OK: Docker and Compose are available."
echo "OK: APP_PORT=${APP_PORT} is free."
echo "OK: web will bind to ${BIND_IP}:${APP_PORT}, not directly to public 80/443."
echo
echo "Existing Docker containers:"
docker ps --format 'table {{.Names}}	{{.Ports}}	{{.Status}}' || true
echo
echo "Compose plan:"
docker compose config --services
echo
echo "Preflight passed."
