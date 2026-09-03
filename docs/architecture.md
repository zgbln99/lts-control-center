# LTS Control Center — Architektur

## Cel
LTS Control Center jest centralną warstwą operacyjną LTS Logistik. Nie zastępuje na siłę wyspecjalizowanych systemów; łączy ich dane w jednej, spójnej aplikacji.

## Źródła prawdy

| Obszar | Źródło prawdy | Control Center |
|---|---|---|
| Flota / dane podstawowe | PostgreSQL po imporcie Kfz-Liste | edycja, historia, wyszukiwanie |
| Dokumenty pojazdów i kierowców | MEGA S4 | metadata + signed URL |
| Lokalizacja / przebieg | Samsara | snapshot telemetryczny |
| Terminy TÜV/SP/Tacho/UVV | PostgreSQL | alerty + automatyzacje |
| WhatsApp | Meta / Chatwoot | widok rozmów + szablony + logika |
| Automatyzacje | n8n + definicje w PostgreSQL | konfiguracja/status |
| Urlopy | osobny Urlaubsportal | link + wybrane dane w przyszłości |
| Naruszenia DDD | istniejący analyzer / Transinet / inny provider | neutralny import batch JSON |
| Raporty i koszty | PostgreSQL | agregacje i dashboardy |

## Zasady projektowe

1. **Brak stałego przypisania auta do kierowcy.** Kierowca i pojazd są niezależnymi encjami. Powiązanie może wystąpić tylko jako fakt historyczny/zdarzenie, jeśli kiedyś będzie potrzebne.
2. **MEGA S4 przechowuje pliki, PostgreSQL nie.** Baza przechowuje wyłącznie metadata, storage key, checksum/ETag i relacje.
3. **Samsara nie jest kopiowana.** Przechowujemy tylko dane potrzebne operacyjnie: Samsara ID, przebieg, ostatnią pozycję, Standort/geofence i timestamp.
4. **UVV jest opcjonalne.** Jest typem terminu, nie obowiązkowym polem pojazdu.
5. **Sprzedaż/wyrejestrowanie nie usuwa danych.** `Vehicle.lifecycle` przenosi pojazd do archiwum, pozostawiając dokumenty, terminy, koszty i historię.
6. **Integracje są adapterami.** UI nie zależy bezpośrednio od kształtu API Samsara/Meta/Chatwoot/n8n.
7. **Brak sekretów w repo.** Wszystkie klucze i tokeny są wyłącznie w `.env`/sekretach środowiska.
8. **Role są egzekwowane po stronie serwera.** Ukrywanie elementów w UI jest tylko warstwą UX.

## Moduły

### Fuhrpark
- Fahrzeuge
- Anhänger / Auflieger
- Termine
- Werkstatt
- Verkauf / Archiv
- Kategorien / porządkowanie starego importu
- dokumenty MEGA S4
- live snapshot Samsara

### Fahrer
- Fahrer
- Führerscheine
- Fahrerkarten
- Fahrerdokumente
- Verstoßauswertung / DDD

### Kommunikation
- WhatsApp / Chatwoot
- lokalne szablony wiadomości
- Meta templates
- automatyzacje / n8n

### Dokumente
- centralna kartoteka pojazdów
- szablony dokumentów
- kartoteka kierowców

### Berichte
- koszty
- zbiorcze KPI i wygasające dokumenty/terminy

### Administration
- użytkownicy
- role
- audit log
- status integracji

## Role

| Rola | Główne uprawnienia |
|---|---|
| `ADMIN` | pełny dostęp, użytkownicy, audit, wszystkie integracje |
| `FUHRPARK` | flota, terminy, warsztat, dokumenty pojazdów, DDD, koszty |
| `PERSONAL` | kierowcy, dokumenty kierowców, DDD |
| `DISPOSITION` | kierowcy read, komunikacja, WhatsApp, DDD |
| `READ_ONLY` | odczyt floty, dokumentów i raportów bez zapisu |

## Docelowy przepływ danych

```text
Kfz Excel ───────────────┐
                         v
                    PostgreSQL
                         ^
                         |
Samsara ── telemetry ────┤
                         |
DDD Analyzer ─ violations┤
                         |
n8n ───── workflow state ┤
                         |
Chatwoot / Meta ─────────┤
                         |
                         +──── LTS Control Center UI
                         |
MEGA S4 <── signed URLs ─+

Urlaubsportal <── link / selective API data
```

## Etap integracyjny
Po zamknięciu skeletonu jedyną rzeczą potrzebną do uruchamiania adapterów są prawdziwe dane dostępowe w `.env` oraz — jeśli zewnętrzne API różni się od przygotowanego kontraktu — dopasowanie konkretnego adaptera bez przebudowy reszty aplikacji.
