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

function vehicleData(row) {
  return {
    sourcePosition: row.sourcePosition ?? null,
    plateOriginal: row.plateOriginal ?? null,
    plateAliases: Array.isArray(row.plateAliases) ? row.plateAliases : [],
    firstRegistration: asDate(row.firstRegistration),
    vin: row.vin ?? null,
    insuranceNumber: row.insuranceNumber ?? null,
    taxNumber: row.taxNumber ?? null,
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
