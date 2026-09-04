#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  echo "ERROR: .env does not exist. Copy .env.example to .env first." >&2
  exit 1
fi

env_value() {
  key="$1"
  value="$(grep -E "^\${key}=" .env | tail -n 1 | cut -d= -f2- | tr -d '\r' || true)"
  case "$value" in
    \"*\") value="$(printf '%s' "$value" | sed 's/^"//;s/"$//')" ;;
    \'*\') value="$(printf '%s' "$value" | sed "s/^'//;s/'$//")" ;;
  esac
  printf '%s' "$value"
}

APP_PORT="$(env_value APP_PORT)"
APP_BIND_IP="$(env_value APP_BIND_IP)"
POSTGRES_PASSWORD="$(env_value POSTGRES_PASSWORD)"
DATABASE_URL="$(env_value DATABASE_URL)"
AUTH_SECRET="$(env_value AUTH_SECRET)"

APP_BIND_IP="\${APP_BIND_IP:-127.0.0.1}"

if [ -z "$APP_PORT" ]; then
  echo "ERROR: APP_PORT must be set in .env." >&2
  exit 1
fi

case "$APP_PORT" in
  *[!0-9]*|"")
    echo "ERROR: APP_PORT must be a numeric TCP port." >&2
    exit 1
    ;;
esac

if [ "$APP_PORT" -lt 1024 ] || [ "$APP_PORT" -gt 65535 ]; then
  echo "ERROR: APP_PORT must be between 1024 and 65535." >&2
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL must be set in .env." >&2
  exit 1
fi

if [ "\${#AUTH_SECRET}" -lt 32 ]; then
  echo "ERROR: AUTH_SECRET must contain at least 32 characters." >&2
  exit 1
fi

case "$POSTGRES_PASSWORD" in
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

if ! docker compose config >/dev/null; then
  echo "ERROR: docker compose config failed. Check .env and docker-compose.yml." >&2
  exit 1
fi

if command -v ss >/dev/null 2>&1 && ss -ltnH | awk '{print $4}' | grep -Eq "(^|:)\${APP_PORT}$"; then
  echo "ERROR: TCP port \${APP_PORT} is already in use on this VPS." >&2
  ss -ltnp 2>/dev/null | grep -E ":\${APP_PORT}[[:space:]]" || true
  exit 1
fi

echo "OK: Docker and Compose are available."
echo "OK: APP_PORT=\${APP_PORT} is free."
echo "OK: web will bind to \${APP_BIND_IP}:\${APP_PORT}, not directly to public 80/443."
echo
echo "Existing Docker containers:"
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}' || true
echo
echo "Control Center Compose services:"
docker compose config --services
echo
echo "Preflight passed."
