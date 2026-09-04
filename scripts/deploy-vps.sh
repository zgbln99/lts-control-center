#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT_DIR"

./scripts/preflight-vps.sh

APP_PORT="$(grep -E '^APP_PORT=' .env | tail -n 1 | cut -d= -f2- | tr -d '\r"')"

echo
echo "Building LTS Control Center only..."
docker compose build --pull web

echo
echo "Starting LTS Control Center project only..."
docker compose up -d

echo
docker compose ps

echo
echo "Waiting for application health..."
i=0
until curl -fsS "http://127.0.0.1:${APP_PORT}/api/health" >/tmp/lts-control-health.json 2>/dev/null; do
  i=$((i+1))
  if [ "$i" -ge 30 ]; then
    echo "ERROR: healthcheck did not become ready within 90 seconds." >&2
    docker compose ps >&2 || true
    docker compose logs --tail=120 web >&2 || true
    exit 1
  fi
  sleep 3
done

cat /tmp/lts-control-health.json
rm -f /tmp/lts-control-health.json

echo
echo "Deployment is healthy on 127.0.0.1:${APP_PORT}."
echo "Next: bootstrap the first admin, then enable the nginx vhost."
