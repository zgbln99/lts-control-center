# LTS Control Center

Centralny panel operacyjny LTS Logistik. Repo zawiera kompletny skeleton aplikacji; prawdziwe dane dostępowe do systemów zewnętrznych są podpinane dopiero na etapie integracyjnym/development.

## Zasada UI

Fuhrpark rozwijamy **1:1 względem zaakceptowanej wizualizacji** `Fuhrpark-Dashboard mit Live-Fahrzeugübersicht.png`: ciemny sidebar, jasny workspace, KPI, główna tabela, prawy rail, wysuwana karta pojazdu i spójny język wizualny wszystkich modułów.

Nie dokładamy przypadkowego „admin panel look” ani redesignu podczas rozwoju funkcji.

## Moduły

### Control Center
- Dashboard
- globalne wyszukiwanie `Cmd/Ctrl + K`
- alerty terminów
- status integracji

### Fuhrpark
- aktywne Fahrzeuge
- Anhänger / Auflieger
- kategorie TRUCK / VAN / TRAILER / SEMITRAILER / OTHER
- karta i edycja pojazdu
- kamera / oklejenie
- TÜV / SP / Tacho / Service / Versicherung / Leasing / opcjonalne UVV
- Werkstatt
- Verkauf / Archiv bez kasowania historii
- dokumenty MEGA S4 + signed URL
- ręczny upload dokumentów
- Samsara snapshot: Standort, GPS, przebieg, online/last seen

### Fahrer
- Fahrer
- Führerscheine
- Fahrerkarten
- dokumenty kierowców w MEGA S4
- DDD / Verstoßauswertung

> Nie istnieje stałe przypisanie kierowca → pojazd. Obie encje są niezależne.

### Kommunikation
- Chatwoot / WhatsApp workspace adapter
- lokalne szablony komunikacji
- Meta WhatsApp templates adapter
- n8n workflow adapter
- lokalne definicje automatyzacji

### Dokumente
- centralna kartoteka pojazdów
- dokumenty kierowców
- szablony dokumentów

### Berichte
- koszty
- agregaty floty
- wygasające terminy i dokumenty

### Administration
- użytkownicy
- role
- aktywacja/blokowanie kont
- audit log

## Role

- `ADMIN` — pełny dostęp
- `FUHRPARK` — flota, terminy, warsztat, pojazdowe dokumenty, koszty, DDD
- `PERSONAL` — kierowcy, dokumenty kierowców, DDD
- `DISPOSITION` — komunikacja, odczyt kierowców, DDD
- `READ_ONLY` — odczyt floty/dokumentów/raportów bez zapisu

Role są egzekwowane w middleware po stronie serwera; UI dodatkowo ukrywa niedozwolone akcje.

## Stack

- Next.js / React
- PostgreSQL
- Prisma
- Docker / Docker Compose
- MEGA S4 (S3-compatible)
- Samsara API
- Chatwoot API
- Meta WhatsApp Cloud API
- n8n API / webhooks
- istniejący Urlaubsportal
- istniejący DDD Analyzer / alternatywnie Transinet JSON

## Konfiguracja

```bash
cp .env.example .env
```

Sekretów **nie commitujemy**. Komplet zmiennych znajduje się w `.env.example`.

Szczegóły architektury: [`docs/architecture.md`](docs/architecture.md)

Kontrakty integracji: [`docs/integrations.md`](docs/integrations.md)

Importer Kfz-Liste: [`docs/kfz-import.md`](docs/kfz-import.md)

## Uruchomienie lokalne / VPS

Na VPS z innymi aplikacjami używamy izolowanego deploymentu: aplikacja binduje się wyłącznie do `127.0.0.1:APP_PORT`, PostgreSQL nie jest publikowany, a publiczny ruch obsługuje istniejący nginx.

Pełna instrukcja: [`docs/deployment-vps-nginx.md`](docs/deployment-vps-nginx.md)

```bash
git clone https://github.com/zgbln99/lts-control-center.git
cd lts-control-center
cp .env.example .env
nano .env
chmod +x scripts/preflight-vps.sh
./scripts/preflight-vps.sh
docker compose up -d --build
```

Healthcheck z samego VPS:

```bash
curl -fsS http://127.0.0.1:$APP_PORT/api/health
```

## Pierwszy administrator

Ustaw w `.env`:

```env
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_NAME=
BOOTSTRAP_ADMIN_PASSWORD=
```

Następnie:

```bash
docker compose exec web npm run bootstrap:admin
```

Kolejnych użytkowników tworzy się już w `Einstellungen → Benutzer`.

## Import prawdziwego Excela

Workbook nie jest commitowany do repo.

```bash
docker cp "/lokalna/sciezka/Kfz Liste aktuell 2026.xlsx" \
  "$(docker compose ps -q web)":/tmp/kfz.xlsx

docker compose exec web npm run bootstrap:kfz -- /tmp/kfz.xlsx
```

Importer:
- normalizuje tablice i aliasy historyczne,
- zachowuje surowe wartości,
- rozdziela aktywną i historyczną część listy,
- rozpoznaje `verkauft` / `abgemeldet`,
- importuje arkusz `Hakenlast`,
- zatrzymuje import przy konflikcie canonical plate.

## MEGA S4

```bash
docker compose exec web npm run sync:mega-s4
```

Foldery mogą pozostać np. `TF-LS 5050`, `TF-LS1110`, `TF-NP 2002 Antos`. Synchronizator dopasowuje je po tablicy i aliasach.

## Samsara

```bash
docker compose exec web npm run sync:samsara
```

Nie kopiujemy całej Samsary — tylko dane potrzebne Control Center.

## DDD Analyzer

Neutralne wejście danych:

```text
POST /api/ddd/batches
```

Analyzer może później zostać podmieniony bez przebudowy UI. Przykładowy payload znajduje się w `docs/integrations.md`.

## CI

Repo posiada dwa niezależne checki:
- `CI` — dependency install → Prisma generate → production Next build
- `Docker CI` — budowa produkcyjnego obrazu Docker

Etap podpinania prawdziwych API zaczynamy dopiero, gdy oba checki przechodzą na aktualnym `main`.
