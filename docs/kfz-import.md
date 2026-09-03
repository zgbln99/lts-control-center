# Kfz workbook import

Importer is based on the current production workbook `Kfz Liste aktuell 2026.xlsx` but the workbook itself is **not committed** to the repository.

## Source layout

### Sheet `Tabelle1`
Header row starts at row 4. The importer maps these source columns without discarding the original value:

| Excel | Vehicle field |
|---|---|
| Pos. | `sourcePosition` |
| Kennzeichen | `plateOriginal`, normalized `plate`, `plateAliases[]` |
| Erstzulassung | `firstRegistration` |
| Kfz-Ident. Nummer | `vin` |
| Versicherungsnummer | `insuranceNumber` |
| Monat | `taxMonthAmount` |
| Quartal | `taxQuarterAmount` |
| Kfz St.nummer | `taxNumber` |
| Summe Steuer | `taxSumAmount` |
| Gesamtmasse | `grossVehicleWeightKg` |
| Unterl. vorhanden | `documentsNotes` |
| Vertragsende, wenn finanziert | `financingEnd` and/or `financingEndRaw` |
| angemeldet am | `registeredAt` |
| Rate | `monthlyRate` and/or `rateRaw` |
| Inventarnummer | `inventoryNumber` |
| Besonderheiten | `notes` |

`sourceRaw` keeps a copy of the complete row for audit/debugging.

## Important source-data rules

- Excel dates are serial numbers and are converted to ISO dates.
- Financing end and rate are **mixed-type fields**. Values such as `abbezahlt`, `abgekauft`, `x`, `-` or free text must be preserved instead of being coerced into numbers/dates.
- Inventory numbers are identifiers, not numbers. They are stored as strings.
- `Gesamtmasse` is gross vehicle weight in kilograms.
- Registration strings can contain historical aliases, e.g. `TF-LS 1044 = TF-LS 3073` or an abbreviated RHS such as `TF-LS 1169 = 3069`. All recognizable plates are stored in `plateAliases[]` for later MEGA S4 and Samsara matching.
- The importer must never silently merge two vehicles only because a normalized plate looks similar. Ambiguous matches go to a review queue.

## Sheet `Hakenlast`
The second sheet is imported into `VehicleHookLoadPeriod`. It is linked to a vehicle only if a plate can be resolved confidently. The original plate text remains stored.

## MEGA S4 matching order
When document folders are synchronized, matching should use:

1. exact current `plate`
2. exact `plateAliases[]`
3. normalized folder-name plate extraction
4. VIN if available in a document/index
5. manual review

A manual mapping is saved permanently in `StorageFolderMapping` so the same folder never needs to be resolved twice.
