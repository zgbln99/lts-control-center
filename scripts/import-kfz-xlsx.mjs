import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import * as XLSX from 'xlsx';

const input = process.argv[2];
const output = process.argv[3] ?? './tmp/kfz-import-preview.json';

if (!input) {
  console.error('Usage: npm run import:kfz -- "/path/Kfz Liste aktuell 2026.xlsx" [output.json]');
  process.exit(1);
}

function cleanString(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim().replace(/\s+/g, ' ');
  return text || null;
}

function excelDateToIso(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const d = XLSX.SSF.parse_date_code(value);
  if (!d?.y || !d?.m || !d?.d) return null;
  return `${String(d.y).padStart(4, '0')}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
}

function germanTextDateToIso(value) {
  const text = cleanString(value);
  if (!text) return null;
  const matches = [...text.matchAll(/\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/g)];
  if (!matches.length) return null;
  const [, day, month, yearRaw] = matches[matches.length - 1];
  const year = yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);
  if (!year || Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function asDecimal(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asInteger(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;
}

function asIdentifier(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return String(Math.trunc(value));
  return cleanString(value);
}

function normalizeSinglePlate(raw, inheritedPrefix = null) {
  let value = cleanString(raw)?.toUpperCase();
  if (!value) return null;

  // Alias RHS can contain only the numeric part, e.g. "TF-LS 1169 = 3069".
  if (/^\d+[A-Z]?$/.test(value) && inheritedPrefix) {
    value = `${inheritedPrefix} ${value}`;
  }

  value = value.replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ').trim();

  // Standardize common German registration variants: TF LS 200 -> TF-LS 200,
  // H LD 3116 -> H-LD 3116, TF MP100E -> TF-MP 100E.
  const compact = value.replace(/-/g, ' ');
  const match = compact.match(/^([A-ZÄÖÜ]{1,3})\s+([A-ZÄÖÜ]{1,2})\s*([0-9]+[A-Z]?)$/);
  if (match) return `${match[1]}-${match[2]} ${match[3]}`;

  return value;
}

function parsePlateExpression(rawValue) {
  const original = cleanString(rawValue);
  if (!original) return { original: null, plate: null, aliases: [] };

  const parts = original.split('=').map(v => cleanString(v)).filter(Boolean);
  const first = normalizeSinglePlate(parts[0]);
  const prefixMatch = first?.match(/^([A-ZÄÖÜ]{1,3}-[A-ZÄÖÜ]{1,2})\s+/);
  const inheritedPrefix = prefixMatch?.[1] ?? null;

  const aliases = [];
  for (const part of parts) {
    const normalized = normalizeSinglePlate(part, inheritedPrefix);
    if (normalized && !aliases.includes(normalized)) aliases.push(normalized);
  }

  return {
    original,
    plate: aliases[0] ?? original.toUpperCase(),
    aliases,
  };
}

function parseLifecycle(row) {
  const note = cleanString(row['__col_16']);
  if (!note) return { lifecycle: 'ACTIVE', lifecycleNote: null, soldAt: null, soldTo: null };

  const lower = note.toLowerCase();
  if (lower.includes('verkauft')) {
    const buyerMatch = note.match(/verkauft\s+an\s+(.+?)(?:,\s*(?:am\s*)?\d{1,2}\.\d{1,2}\.\d{2,4}|,\s*(?:re|rechnung)\b|$)/i);
    return {
      lifecycle: 'SOLD',
      lifecycleNote: note,
      soldAt: germanTextDateToIso(note),
      soldTo: cleanString(buyerMatch?.[1]),
    };
  }

  if (lower.includes('abgemeldet')) {
    return {
      lifecycle: 'ARCHIVED',
      lifecycleNote: note,
      soldAt: null,
      soldTo: null,
    };
  }

  return { lifecycle: 'ARCHIVED', lifecycleNote: note, soldAt: null, soldTo: null };
}

function findHeaderRow(rows, expectedHeader) {
  const index = rows.findIndex(row => row.some(cell => cleanString(cell) === expectedHeader));
  if (index < 0) throw new Error(`Could not find header '${expectedHeader}'`);
  return index;
}

function rowsToObjects(rows, headerRowIndex) {
  const headers = rows[headerRowIndex].map(cleanString);
  return rows.slice(headerRowIndex + 1)
    .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
    .map(row => Object.fromEntries(headers.map((header, index) => [header ?? `__col_${index}`, row[index] ?? null])));
}

const workbook = XLSX.readFile(input, { cellDates: false, raw: true });
const fleetSheet = workbook.Sheets.Tabelle1;
if (!fleetSheet) throw new Error('Missing worksheet: Tabelle1');

const fleetRows = XLSX.utils.sheet_to_json(fleetSheet, { header: 1, raw: true, defval: null });
const fleetHeaderRow = findHeaderRow(fleetRows, 'Kennzeichen');
const rawFleet = rowsToObjects(fleetRows, fleetHeaderRow);

const vehicles = rawFleet.map(row => {
  const plate = parsePlateExpression(row['Kennzeichen']);
  const financingEndIso = excelDateToIso(row['Vertragsende, wenn finanziert']);
  const registeredAtIso = excelDateToIso(row['angemeldet am']);
  const firstRegistrationIso = excelDateToIso(row['Erstzulassung']);
  const numericRate = asDecimal(row['Rate']);
  const lifecycle = parseLifecycle(row);

  return {
    sourcePosition: asInteger(row['Pos.']),
    plate: plate.plate,
    plateOriginal: plate.original,
    plateAliases: plate.aliases,
    firstRegistration: firstRegistrationIso,
    vin: cleanString(row['Kfz-Ident. Nummer']),
    insuranceNumber: asIdentifier(row['Versicherungsnummer']),
    taxMonthAmount: asDecimal(row['Monat']),
    taxQuarterAmount: asDecimal(row['Quartal']),
    taxNumber: cleanString(row['Kfz St.nummer']),
    taxSumAmount: asDecimal(row['Summe Steuer']),
    grossVehicleWeightKg: asInteger(row['Gesamtmasse']),
    documentsNotes: cleanString(row['Unterl. vorhanden']),
    financingEnd: financingEndIso,
    financingEndRaw: financingEndIso ? null : cleanString(row['Vertragsende, wenn finanziert']),
    registeredAt: registeredAtIso,
    monthlyRate: numericRate,
    rateRaw: numericRate === null ? cleanString(row['Rate']) : null,
    inventoryNumber: asIdentifier(row['Inventarnummer']),
    notes: cleanString(row['Besonderheiten']),
    lifecycle: lifecycle.lifecycle,
    lifecycleNote: lifecycle.lifecycleNote,
    soldAt: lifecycle.soldAt,
    soldTo: lifecycle.soldTo,
    sourceRaw: row,
  };
});

const hookLoadSheet = workbook.Sheets.Hakenlast;
let hookLoadPeriods = [];
if (hookLoadSheet) {
  const rows = XLSX.utils.sheet_to_json(hookLoadSheet, { header: 1, raw: true, defval: null });
  const headerIndex = findHeaderRow(rows, 'Kennzeichen');
  const objects = rowsToObjects(rows, headerIndex);
  hookLoadPeriods = objects.map(row => ({
    plateText: cleanString(row['Kennzeichen']),
    normalizedPlate: normalizeSinglePlate(row['Kennzeichen']),
    startsAt: excelDateToIso(row['ab wann']),
    endsAt: excelDateToIso(row['bis wann']),
    sourceRaw: row,
  })).filter(row => row.plateText && row.startsAt);
}

const duplicateCanonicalPlates = Object.entries(
  vehicles.reduce((acc, vehicle) => {
    if (vehicle.plate) acc[vehicle.plate] = (acc[vehicle.plate] ?? 0) + 1;
    return acc;
  }, {})
).filter(([, count]) => count > 1);

const result = {
  generatedAt: new Date().toISOString(),
  sourceFile: path.basename(input),
  stats: {
    vehicles: vehicles.length,
    activeVehicles: vehicles.filter(v => v.lifecycle === 'ACTIVE').length,
    soldVehicles: vehicles.filter(v => v.lifecycle === 'SOLD').length,
    archivedVehicles: vehicles.filter(v => v.lifecycle === 'ARCHIVED').length,
    vehiclesWithAliases: vehicles.filter(v => v.plateAliases.length > 1).length,
    hookLoadPeriods: hookLoadPeriods.length,
    duplicateCanonicalPlates,
  },
  vehicles,
  hookLoadPeriods,
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(result, null, 2));

console.log(`Imported ${result.stats.vehicles} vehicle rows.`);
console.log(`Active: ${result.stats.activeVehicles}, sold: ${result.stats.soldVehicles}, archived: ${result.stats.archivedVehicles}.`);
console.log(`Historical plate aliases: ${result.stats.vehiclesWithAliases}.`);
console.log(`Hakenlast periods: ${result.stats.hookLoadPeriods}.`);
console.log(`Preview written to ${output}`);
if (duplicateCanonicalPlates.length) {
  console.warn('Duplicate canonical plates require manual review:', duplicateCanonicalPlates);
  process.exitCode = 2;
}
