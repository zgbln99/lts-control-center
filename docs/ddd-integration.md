# DDD / Verstoßauswertung integration contract

Control Center stores normalized tachograph violations. The source system may be the local DDD portal, Qivalon/Transinet, n8n, or another analyzer.

## Endpoint

`POST /api/ddd/batches`

Machine authentication:

```
Authorization: Bearer <DDD_ANALYZER_API_TOKEN>
```

or:

```
X-API-Key: <DDD_ANALYZER_API_TOKEN>
```

The endpoint is idempotent:

- `source + externalId` identifies a source batch.
- each violation receives a deterministic fingerprint;
- repeated imports are skipped instead of creating duplicates.

## Request

```json
{
  "source": "QIVALON",
  "externalId": "2026-08",
  "periodStart": "2026-08-01T00:00:00+02:00",
  "periodEnd": "2026-08-31T23:59:59+02:00",
  "violations": [
    {
      "sourceId": "provider-violation-12345",
      "driverCardNumber": "D123456789012345",
      "plate": "TF-LS 1234",
      "type": "DAILY_DRIVING_TIME",
      "code": "DRIVE_DAILY_10H",
      "legalReference": "Art. 6 VO (EG) 561/2006",
      "severity": "SERIOUS",
      "startsAt": "2026-08-18T06:00:00+02:00",
      "endsAt": "2026-08-18T17:20:00+02:00",
      "durationMinutes": 80,
      "description": "Daily driving time exceeded",
      "raw": {}
    }
  ],
  "raw": {}
}
```

## Matching rules

Driver matching is performed only against the local Samsara driver mirror:

1. normalize `driverCardNumber`,
2. match to `Driver.driverCardNumber` populated by the Samsara sync,
3. store the matched internal `driverId`.

The source must not send or maintain a permanent driver-to-vehicle assignment.

Vehicle matching:

1. normalize registration plate,
2. current plate,
3. historical plate aliases.

Unmatched violations remain stored. Every Samsara driver sync tries to relink older unassigned violations by tachograph card number.

## Response counters

Successful imports return operational counters including:

- `imported`
- `skippedDuplicates`
- `matchedDrivers`
- `unmatchedDrivers`
- `matchedVehicles`
- `unmatchedVehicles`

Repeated batches return `duplicateBatch: true`.

## Local VPS topology

The existing DDD reader can stay as an independent service. Control Center reaches host-published local services through `host.docker.internal`; no additional PostgreSQL or public Control Center endpoint is required for the reader.

The current reader parses DDD card data and work shifts. Violation calculation should come from the agreed violation analyzer/feed rather than being inferred from payroll/work-time calculations.
