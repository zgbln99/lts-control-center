# Integrationen — Kontrakty

Sekrety nie są zapisywane w Git. Konfiguracja odbywa się przez `.env` na środowisku docelowym.

## Samsara

Zmienne:

```env
SAMSARA_API_BASE_URL=https://api.eu.samsara.com
SAMSARA_API_TOKEN=
SAMSARA_ONLINE_THRESHOLD_MINUTES=15
```

Synchronizacja:

```bash
npm run sync:samsara
```

Matching pojazdów:
1. VIN
2. aktualna tablica
3. alias historycznej tablicy

Zapisywane dane:
- `samsaraId`
- marka/model, jeśli dostępne
- przebieg
- GPS
- adres / geofence / Standort
- lastSeenAt / online

Pełnej historii Samsara nie duplikujemy.

## MEGA S4

Zmienne:

```env
MEGA_S4_ENDPOINT=
MEGA_S4_REGION=
MEGA_S4_BUCKET=
MEGA_S4_PREFIX=fahrzeuge
MEGA_S4_DRIVER_PREFIX=fahrer
MEGA_S4_FORCE_PATH_STYLE=false
MEGA_S4_ACCESS_KEY=
MEGA_S4_SECRET_KEY=
```

Synchronizacja kartotek pojazdów:

```bash
npm run sync:mega-s4
```

Obsługiwane nazwy folderów m.in.:
- `TF-LS 5050`
- `TF-LS1110`
- `TF-NP 2002 Antos`

System normalizuje tablicę i sprawdza aliasy. Pliki pozostają prywatne; UI otwiera je przez krótkotrwały signed URL.

## Chatwoot

```env
CHATWOOT_URL=
CHATWOOT_ACCOUNT_ID=
CHATWOOT_INBOX_ID=
CHATWOOT_API_TOKEN=
```

Adapter: `/api/integrations/chatwoot/conversations`.

Chatwoot jest workspace'em dla pracowników. Nie staje się źródłem danych floty ani kierowców.

## Meta WhatsApp

```env
META_GRAPH_API_VERSION=v23.0
META_WABA_ID=
META_PHONE_NUMBER_ID=
META_ACCESS_TOKEN=
```

Adapter template'ów: `/api/integrations/meta/templates`.

Lokalny `MessageTemplate` może zawierać `metaTemplateName`, dzięki czemu logika Control Center nie zależy od identyfikatorów Meta.

## n8n

```env
N8N_API_URL=
N8N_API_KEY=
N8N_WEBHOOK_BASE_URL=
```

Adapter workflowów: `/api/integrations/n8n/workflows`.

Typowe workflowy docelowe:
- TÜV/SP/Tacho: 30 / 14 / 7 dni + overdue
- synchronizacja Samsara
- synchronizacja dokumentów
- eskalacje WhatsApp
- import DDD

## Urlaubsportal

```env
VACATION_PORTAL_URL=
```

Portal pozostaje osobną aplikacją. Control Center może otwierać go bezpośrednio i później pobierać wyłącznie wybrane dane do Dashboardu.

## DDD Analyzer / Transinet

```env
DDD_ANALYZER_URL=
DDD_ANALYZER_API_TOKEN=
```

Control Center posiada neutralny endpoint wejściowy:

```http
POST /api/ddd/batches
Content-Type: application/json
```

Przykład:

```json
{
  "source": "LTS DDD Analyzer",
  "externalId": "2026-09",
  "periodStart": "2026-08-01T00:00:00Z",
  "periodEnd": "2026-08-31T23:59:59Z",
  "violations": [
    {
      "driverCardNumber": "D123456789012345",
      "plate": "TF-LS 5050",
      "sourceId": "external-4711",
      "code": "EU561-DRIVE",
      "type": "DAILY_DRIVING_TIME",
      "legalReference": "VO (EG) 561/2006",
      "severity": "MAJOR",
      "startsAt": "2026-08-14T18:30:00Z",
      "endsAt": "2026-08-14T19:07:00Z",
      "durationMinutes": 37,
      "description": "Überschreitung der täglichen Lenkzeit"
    }
  ]
}
```

Matching jest wykonywany automatycznie:
- `driverCardNumber` → kierowca
- `plate` / alias → pojazd

Brak matchu nie blokuje importu: surowy numer karty/tablica nadal zostaje przy naruszeniu i może zostać przypisana później.

## Status integracji

`GET /api/integrations/status` zwraca wyłącznie niesekretne informacje: konfigurację, liczniki i timestamps. Nigdy nie zwraca tokenów ani kluczy API.
