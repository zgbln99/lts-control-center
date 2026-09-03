# LTS Control Center

Centralny panel operacyjny LTS Logistik.

## Zasada UI
Widok Fuhrpark rozwijamy **1:1 względem zaakceptowanej wizualizacji** `Fuhrpark-Dashboard mit Live-Fahrzeugübersicht.png`. Układ, hierarchia informacji, sidebar, KPI, tabela, prawy rail oraz karta pojazdu są traktowane jako zamrożony kierunek designu.

## Pierwszy zakres
- Fuhrpark / wszystkie pojazdy
- import danych z `Kfz Liste aktuell 2026.xlsx`
- karta pojazdu
- TÜV / SP / Tacho / opcjonalne UVV / pozostałe terminy
- kamera / oklejenie
- dokumenty z MEGA S4
- przygotowanie pod Samsara
- sprzedaż i archiwum bez kasowania historii

## Docelowe moduły
- Samsara live data
- MEGA S4 document sync
- Chatwoot / WhatsApp Cloud API
- Meta templates
- n8n automations
- Urlaubsportal
- DDD Analyzer

## Start lokalny / VPS
```bash
docker compose up -d
```

Panel: `http://SERVER:3000/fuhrpark`

## Architektura
- Next.js / React — UI
- PostgreSQL — centralna baza danych
- Prisma — model danych
- MEGA S4 — magazyn dokumentów
- n8n — automatyzacje i harmonogramy
- Chatwoot — warstwa WhatsApp dla użytkowników
- Samsara — dane live pojazdów
