# LTS Control Center

Centralny panel operacyjny LTS Logistik.

## Zasada UI
Widok Fuhrpark rozwijamy **1:1 względem zaakceptowanej wizualizacji** `Fuhrpark-Dashboard mit Live-Fahrzeugübersicht.png`. Układ, hierarchia informacji, sidebar, KPI, tabela, prawy rail oraz karta pojazdu są traktowane jako zamrożony kierunek designu.

## Aktualny zakres
- Dashboard Control Center
- Fuhrpark / wszystkie aktywne pojazdy
- import danych z `Kfz Liste aktuell 2026.xlsx`
- pełna karta pojazdu + edycja
- ręczne dodawanie nowych pojazdów
- TÜV / SP / Tacho / opcjonalne UVV / pozostałe terminy
- kamera / oklejenie
- dokumenty z MEGA S4 + ręczny upload do S4
- Samsara live data / przebieg / lokalizacja
- sprzedaż i archiwum bez kasowania historii
- centralny panel dokumentów

## Docelowe moduły
- Chatwoot / WhatsApp Cloud API
- Meta templates
- n8n automations
- Urlaubsportal
- DDD Analyzer

## Production start na VPS

```bash
git clone https://github.com/zgbln99/lts-control-center.git
cd lts-control-center
cp .env.example .env
nano .env

docker compose up -d --build
```

Panel: `http://SERVER:3000/dashboard`

Healthcheck: `http://SERVER:3000/api/health`

> Przed startem zmień `POSTGRES_PASSWORD` i odpowiadający mu `DATABASE_URL`. Jeżeli hasło zawiera znaki specjalne, zakoduj je poprawnie w URL albo użyj osobnego URL-safe hasła do PostgreSQL.

## Pierwszy import prawdziwego Excela
Workbook nie jest commitowany do repo. Skopiuj go na VPS, np. do `/opt/lts-import/Kfz Liste aktuell 2026.xlsx`, a następnie:

```bash
docker compose exec web npm run bootstrap:kfz -- "/opt/lts-import/Kfz Liste aktuell 2026.xlsx"
```

Jeżeli plik nie istnieje wewnątrz kontenera, najprościej skopiować go tymczasowo:

```bash
docker cp "/lokalna/sciezka/Kfz Liste aktuell 2026.xlsx" \
  "$(docker compose ps -q web)":/tmp/kfz.xlsx

docker compose exec web npm run bootstrap:kfz -- /tmp/kfz.xlsx
```

Bootstrap najpierw aktualizuje schemat bazy, potem waliduje Excel i generuje preview. Przy konflikcie tablic import zatrzymuje się **przed zmianą danych pojazdów**.

## Synchronizacja MEGA S4
Po uzupełnieniu zmiennych `MEGA_S4_*` w `.env`:

```bash
docker compose exec web npm run sync:mega-s4
```

Foldery mogą pozostać w obecnym formacie, np. `TF-LS 5050`, `TF-LS1110` czy `TF-NP 2002 Antos`. Synchronizator normalizuje tablice i dopasowuje foldery do pojazdów.

## Synchronizacja Samsara
Po uzupełnieniu `SAMSARA_API_TOKEN`:

```bash
docker compose exec web npm run sync:samsara
```

## Architektura
- Next.js / React — UI i API
- PostgreSQL — centralna baza danych
- Prisma — model danych
- MEGA S4 — magazyn dokumentów
- Samsara — dane live pojazdów
- n8n — automatyzacje i harmonogramy
- Chatwoot — warstwa WhatsApp dla użytkowników
