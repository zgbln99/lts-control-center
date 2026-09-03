import fs from 'node:fs';
import process from 'node:process';
import { PrismaClient } from '@prisma/client';

const input = process.argv[2] ?? './tmp/kfz-import-preview.json';
const prisma = new PrismaClient();

function asDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function inferVehicleDescription(row) {
  const notes = String(row.documentsNotes ?? '').toLowerCase();
  const weight = Number(row.grossVehicleWeightKg ?? 0);

  if (notes.includes('vito')) return { manufacturer: 'Mercedes-Benz', model: 'Vito', displayName: 'Mercedes-Benz Vito', category: 'VAN' };
  if (notes.includes('atego')) return { manufacturer: 'Mercedes-Benz', model: 'Atego', displayName: 'Mercedes-Benz Atego', category: 'TRUCK' };
  if (notes.includes('actros')) return { manufacturer: 'Mercedes-Benz', model: 'Actros', displayName: 'Mercedes-Benz Actros', category: 'TRUCK' };
  if (notes.includes('sprinter')) return { manufacturer: 'Mercedes-Benz', model: 'Sprinter', displayName: 'Mercedes-Benz Sprinter', category: 'VAN' };
  if (notes.includes('transit')) return { manufacturer: 'Ford', model: 'Transit', displayName: 'Ford Transit', category: 'VAN' };
  if (notes.includes('niewiadow') || notes.includes('niewiadów')) return { manufacturer: 'Niewiadów', model: null, displayName: 'Anhänger Niewiadów', category: 'TRAILER' };
  if (notes.includes('anhänger') || notes.includes('anhaenger')) return { manufacturer: null, model: null, displayName: 'Anhänger', category: 'TRAILER' };
  if (/\bszm\b/i.test(row.documentsNotes ?? '')) return { manufacturer: null, model: null, displayName: 'Sattelzugmaschine', category: 'TRUCK' };
  if (weight > 7500) return { manufacturer: null, model: null, displayName: 'Lkw', category: 'TRUCK' };
  if (weight > 0 && weight <= 3500) return { manufacturer: null, model: null, displayName: 'Transporter / Pkw', category: 'VAN' };
  return { manufacturer: null, model: null, displayName: null, category: 'OTHER' };
}

function vehicleData(row) {
  const inferred = inferVehicleDescription(row);
  return {
    sourcePosition: row.sourcePosition ?? null,
    plateOriginal: row.plateOriginal ?? null,
    plateAliases: Array.isArray(row.plateAliases) ? row.plateAliases : [],
    firstRegistration: asDate(row.firstRegistration),
    vin: row.vin ?? null,
    insuranceNumber: row.insuranceNumber ?? null,
    taxNumber: row.taxNumber ?? null,
    manufacturer: inferred.manufacturer,
    model: inferred.model,
    displayName: inferred.displayName,
    category: inferred.category,
    taxMonthAmount: row.taxMonthAmount ?? null,
    taxQuarterAmount: row.taxQuarterAmount ?? null,
    taxSumAmount: row.taxSumAmount ?? null,
    grossVehicleWeightKg: row.grossVehicleWeightKg ?? null,
    documentsNotes: row.documentsNotes ?? null,
    financingEnd: asDate(row.financingEnd),
    financingEndRaw: row.financingEndRaw ?? null,
    registeredAt: asDate(row.registeredAt),
    monthlyRate: row.monthlyRate ?? null,
    rateRaw: row.rateRaw ?? null,
    inventoryNumber: row.inventoryNumber ?? null,
    notes: row.notes ?? null,
    sourceRaw: row.sourceRaw ?? null,
  };
}

async function resolveVehicleId(period) {
  const normalized = period.normalizedPlate?.toUpperCase();
  if (!normalized) return null;

  const direct = await prisma.vehicle.findUnique({
    where: { plate: normalized },
    select: { id: true },
  });
  if (direct) return direct.id;

  const alias = await prisma.vehicle.findFirst({
    where: { plateAliases: { has: normalized } },
    select: { id: true },
  });
  return alias?.id ?? null;
}

async function main() {
  if (!fs.existsSync(input)) {
    throw new Error(`Import preview not found: ${input}`);
  }

  const payload = JSON.parse(fs.readFileSync(input, 'utf8'));
  const rows = Array.isArray(payload.vehicles) ? payload.vehicles : [];
  const hookPeriods = Array.isArray(payload.hookLoadPeriods) ? payload.hookLoadPeriods : [];

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.plate) {
      skipped += 1;
      continue;
    }

    const existing = await prisma.vehicle.findUnique({
      where: { plate: row.plate },
      select: { id: true },
    });

    const data = vehicleData(row);
    if (existing) {
      await prisma.vehicle.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.vehicle.create({ data: { plate: row.plate, ...data } });
      created += 1;
    }
  }

  // The source sheet describes date ranges, so replace those rows on every full import.
  await prisma.vehicleHookLoadPeriod.deleteMany({});
  let hookImported = 0;
  let hookUnmatched = 0;

  for (const period of hookPeriods) {
    const startsAt = asDate(period.startsAt);
    if (!period.plateText || !startsAt) continue;

    const vehicleId = await resolveVehicleId(period);
    if (!vehicleId) hookUnmatched += 1;

    await prisma.vehicleHookLoadPeriod.create({
      data: {
        vehicleId,
        plateText: period.plateText,
        startsAt,
        endsAt: asDate(period.endsAt),
        sourceRaw: period.sourceRaw ?? null,
      },
    });
    hookImported += 1;
  }

  console.log(JSON.stringify({
    sourceFile: payload.sourceFile ?? input,
    vehicles: { created, updated, skipped },
    hookLoadPeriods: { imported: hookImported, unmatched: hookUnmatched },
  }, null, 2));
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
