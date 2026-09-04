# Bezpieczny deployment na istniejącym VPS z nginx

Ten wariant jest przygotowany dla serwera, na którym działają już inne aplikacje.

## Zasada

- nie zmieniamy istniejącego nginx ani jego portów 80/443,
- PostgreSQL nie ma żadnego publicznego portu,
- LTS Control Center binduje się wyłącznie do `127.0.0.1:APP_PORT`,
- publiczny ruch trafia przez osobny nginx server block / subdomenę,
- Compose używa własnego projektu `lts-control-center`, własnej sieci i volume.

## 1. Wybierz katalog

```bash
sudo mkdir -p /srv/lts-control-center
sudo chown "$USER":"$USER" /srv/lts-control-center
cd /srv/lts-control-center
```

## 2. Pobierz repo

```bash
git clone https://github.com/zgbln99/lts-control-center.git .
cp .env.example .env
```

## 3. Ustaw .env

Najpierw sprawdź porty:

```bash
ss -ltnp
docker ps --format 'table {{.Names}}\t{{.Ports}}'
```

W `.env` ustaw m.in.:

```env
APP_BIND_IP=127.0.0.1
APP_PORT=3100

POSTGRES_DB=lts_control
POSTGRES_USER=lts
POSTGRES_PASSWORD=<długie-losowe-hasło>
DATABASE_URL=postgresql://lts:<URL_ENCODED_PASSWORD>@postgres:5432/lts_control

AUTH_SECRET=<minimum-32-znaki>
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_NAME=
BOOTSTRAP_ADMIN_PASSWORD=
```

Sekrety możesz wygenerować:

```bash
openssl rand -hex 32
openssl rand -base64 36
```

Jeżeli hasło PostgreSQL zawiera znaki specjalne, hasło w `DATABASE_URL` musi być URL-encoded.

## 4. Preflight

```bash
chmod +x scripts/preflight-vps.sh scripts/deploy-vps.sh
./scripts/preflight-vps.sh
```

## 5. Start

Najbezpieczniej użyć helpera, który uruchamia wyłącznie projekt `lts-control-center` i czeka na healthcheck:

```bash
./scripts/deploy-vps.sh
```

Ręczny odpowiednik:

```bash
docker compose build --pull web
docker compose up -d
docker compose ps
curl -fsS http://127.0.0.1:$APP_PORT/api/health
```

## 6. Pierwszy administrator

```bash
docker compose exec web npm run bootstrap:admin
```

Po bootstrapie usuń `BOOTSTRAP_ADMIN_PASSWORD` z `.env` i:

```bash
docker compose up -d --force-recreate web
```

## 7. nginx

```bash
sudo cp deploy/nginx/lts-control-center.conf.example /etc/nginx/sites-available/lts-control-center
sudo nano /etc/nginx/sites-available/lts-control-center
sudo ln -s /etc/nginx/sites-available/lts-control-center /etc/nginx/sites-enabled/lts-control-center
sudo nginx -t
sudo systemctl reload nginx
```

Przed włączeniem zmień `control.example.com` i port `3100`.

## 8. TLS

Jeśli obecny nginx używa Certbota:

```bash
sudo certbot --nginx -d control.example.com
```

Jeśli TLS kończy Cloudflare Tunnel/proxy, trzymaj się istniejącego sposobu publikacji i nie dodawaj drugiego reverse proxy.

## 9. Import Kfz-Liste

```bash
docker cp "/ścieżka/Kfz Liste aktuell 2026.xlsx" "$(docker compose ps -q web)":/tmp/kfz.xlsx
docker compose exec web npm run bootstrap:kfz -- /tmp/kfz.xlsx
```

## 10. Integracje

Kolejność:
1. MEGA S4,
2. Samsara,
3. Chatwoot,
4. n8n,
5. Meta WhatsApp,
6. DDD Analyzer,
7. Urlaubsportal.

Klucze trafiają wyłącznie do `.env` na VPS.
