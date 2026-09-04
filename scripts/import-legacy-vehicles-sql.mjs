import fs from 'node:fs';
import process from 'node:process';
import { PrismaClient } from '@prisma/client';

const input = process.argv[2] || './vehicles.sql';
const prisma = new PrismaClient();

const clean = value => String(value || '').trim();

function normalizePlate(value) {
  let raw = clean(value).toUpperCase();
  if (!raw) return null;
  raw = raw.split('(')[0].trim().replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ');
  const compact = raw.replace(/-/g, ' ');
  const match = compact.match(/^([A-ZÄÖÜ]{1,3})\s+([A-ZÄÖÜ]{1,2})\s*([0-9]+[A-Z]?)$/);
  return match ? match[1] + '-' + match[2] + ' ' + match[3] : raw;
}

function plateCandidates(value) {
  const raw = clean(value).toUpperCase().split('(')[0].trim();
  if (!raw) return [];
  const result = new Set();
  const first = normalizePlate(raw.split('/')[0]);
  if (first) result.add(first);
  const slash = raw.match(/^([A-ZÄÖÜ]{1,3})[- ]([A-ZÄÖÜ]{1,2})\s*([0-9]+[A-Z]?)\/([0-9]+[A-Z]?)$/);
  if (slash) {
    result.add(slash[1] + '-' + slash[2] + ' ' + slash[3]);
    result.add(slash[1] + '-' + slash[2] + ' ' + slash[4]);
  }
  const whole = normalizePlate(raw);
  if (whole) result.add(whole);
  return [...result];
}

function parseTuple(tuple) {
  const values = [];
  let current = '', quoted = false, escaped = false;
  for (const char of tuple) {
    if (quoted) {
      if (escaped) { current += char; escaped = false; }
      else if (char === '\\') escaped = true;
      else if (char === "'") quoted = false;
      else current += char;
    } else if (char === "'") quoted = true;
    else if (char === ',') {
      const value = current.trim();
      values.push(!value || value.toUpperCase() === 'NULL' ? null : value);
      current = '';
    } else current += char;
  }
  const value = current.trim();
  values.push(!value || value.toUpperCase() === 'NULL' ? null : value);
  return values;
}

function extractRows(sql) {
  const rows = [];
  const insertPattern = /INSERT INTO [\x60]vehicles[\x60] \(([^)]+)\) VALUES\s*([\s\S]*?);/g;
  let match;
  while ((match = insertPattern.exec(sql))) {
    const columns = match[1].split(',').map(column => column.trim().replace(/\x60/g, ''));
    const block = match[2];
    let quoted = false, escaped = false, depth = 0, start = -1;
    for (let index = 0; index < block.length; index += 1) {
      const char = block[index];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === "'") quoted = false;
        continue;
      }
      if (char === "'") { quoted = true; continue; }
      if (char === '(') { if (depth === 0) start = index + 1; depth += 1; }
      else if (char === ')') {
        depth -= 1;
        if (depth === 0 && start >= 0) {
          const values = parseTuple(block.slice(start, index));
          rows.push(Object.fromEntries(columns.map((column, i) => [column, values[i] || null])));
          start = -1;
        }
      }
    }
  }
  return rows;
}

function decimal(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function monthEnd(value) {
  const match = clean(value).match(/^(0?[1-9]|1[0-2])\.(\d{4})$/);
  return match ? new Date(Date.UTC(Number(match[2]), Number(match[1]), 0, 23, 59, 59, 999)) : null;
}

function categoryFromLegacy(value) {
  return value === 'truck' ? 'TRUCK' : value === 'van' ? 'VAN' : value === 'trailer' ? 'TRAILER' : 'OTHER';
}

function isGenericName(value) {
  const text = clean(value).toLowerCase();
  return !text || ['lkw','sattelzugmaschine','transporter / pkw','anhänger','anhaenger','fahrzeug'].includes(text);
}

async function importDeadline(vehicleId, type, incomingDate, counters, sourceLabel) {
  if (!incomingDate) return;
  const existing = await prisma.vehicleDeadline.findFirst({
    where: { vehicleId, type, completedAt: null },
    orderBy: { dueDate: 'desc' }
  });
  if (!existing) {
    await prisma.vehicleDeadline.create({
      data: { vehicleId, type, dueDate: incomingDate, notes: sourceLabel, optional: type === 'UVV' }
    });
    counters.created += 1;
    return;
  }
  const sameMonth = existing.dueDate.getUTCFullYear() === incomingDate.getUTCFullYear()
    && existing.dueDate.getUTCMonth() === incomingDate.getUTCMonth();
  if (sameMonth) {
    if (existing.dueDate.getTime() !== incomingDate.getTime()) {
      await prisma.vehicleDeadline.update({ where: { id: existing.id }, data: { dueDate: incomingDate } });
      counters.updated += 1;
    } else counters.unchanged += 1;
    return;
  }
  if (incomingDate > existing.dueDate) {
    await prisma.vehicleDeadline.update({
      where: { id: existing.id },
      data: { dueDate: incomingDate, notes: existing.notes || sourceLabel, optional: type === 'UVV' ? true : existing.optional }
    });
    counters.updated += 1;
  } else counters.keptNewerExisting += 1;
}

async function main() {
  if (!fs.existsSync(input)) throw new Error('SQL file not found: ' + input);
  const rows = extractRows(fs.readFileSync(input, 'utf8'));
  if (!rows.length) throw new Error('No vehicles INSERT rows found.');

  const vehicles = await prisma.vehicle.findMany({
    select: {
      id:true, plate:true, plateAliases:true, vin:true, category:true, displayName:true,
      grossVehicleWeightKg:true, powerKw:true, powerHp:true, sourceRaw:true
    }
  });

  const byVin = new Map(), byPlate = new Map();
  for (const vehicle of vehicles) {
    if (vehicle.vin) byVin.set(vehicle.vin.toUpperCase(), vehicle);
    byPlate.set(vehicle.plate.toUpperCase(), vehicle);
    for (const alias of vehicle.plateAliases) byPlate.set(alias.toUpperCase(), vehicle);
  }

  const counters = { sourceRows:rows.length, matched:0, unmatched:0, conflicts:0, powerUpdated:0, weightFilled:0, categoryFilled:0, nameFilled:0 };
  const deadlines = {
    TUV:{created:0,updated:0,unchanged:0,keptNewerExisting:0},
    SP:{created:0,updated:0,unchanged:0,keptNewerExisting:0},
    UVV:{created:0,updated:0,unchanged:0,keptNewerExisting:0}
  };
  const unmatched = [], conflicts = [];
  const sourceLabel = 'Import vehicles.sql ' + new Date().toISOString().slice(0,10);

  for (const row of rows) {
    const vin = clean(row.vin).toUpperCase() || null;
    const vinMatch = vin ? byVin.get(vin) || null : null;
    const plateMatches = [...new Set(plateCandidates(row.license_plate).map(candidate => byPlate.get(candidate.toUpperCase())).filter(Boolean))];
    if (plateMatches.length > 1 || (vinMatch && plateMatches.length === 1 && vinMatch.id !== plateMatches[0].id)) {
      counters.conflicts += 1;
      conflicts.push({legacyId:row.id,legacyPlate:row.license_plate,vin,vinMatch:vinMatch ? vinMatch.plate : null,plateMatches:plateMatches.map(v=>v.plate)});
      continue;
    }
    const vehicle = vinMatch || plateMatches[0] || null;
    if (!vehicle) {
      counters.unmatched += 1;
      unmatched.push({legacyId:row.id,plate:row.license_plate,vin,name:row.name});
      continue;
    }

    counters.matched += 1;
    const data = {};
    const powerKw = decimal(row.power_kw), powerHp = decimal(row.power_hp);
    const weight = decimal(row.weight);

    if (powerKw !== null && Number(vehicle.powerKw ? vehicle.powerKw.toString() : NaN) !== powerKw) {
      data.powerKw = powerKw; counters.powerUpdated += 1;
    }
    if (powerHp !== null && Number(vehicle.powerHp ? vehicle.powerHp.toString() : NaN) !== powerHp) data.powerHp = powerHp;
    if (weight !== null && vehicle.grossVehicleWeightKg === null) {
      data.grossVehicleWeightKg = Math.round(weight); counters.weightFilled += 1;
    }
    const legacyCategory = categoryFromLegacy(row.type);
    if (vehicle.category === 'OTHER' && legacyCategory !== 'OTHER') {
      data.category = legacyCategory; counters.categoryFilled += 1;
    }
    if (row.name && isGenericName(vehicle.displayName)) {
      data.displayName = row.name; counters.nameFilled += 1;
    }

    const baseRaw = vehicle.sourceRaw && typeof vehicle.sourceRaw === 'object' && !Array.isArray(vehicle.sourceRaw) ? vehicle.sourceRaw : {};
    data.sourceRaw = {
      ...baseRaw,
      legacyVehiclesSql:{
        id:row.id ? Number(row.id) : null,
        name:row.name || null,
        originalPlate:row.license_plate || null,
        type:row.type || null,
        imageFilename:row.image_filename || null
      }
    };

    await prisma.vehicle.update({ where:{id:vehicle.id}, data });
    await importDeadline(vehicle.id, 'TUV', monthEnd(row.hu_date), deadlines.TUV, sourceLabel);
    await importDeadline(vehicle.id, 'SP', monthEnd(row.sp_date), deadlines.SP, sourceLabel);
    await importDeadline(vehicle.id, 'UVV', monthEnd(row.uvv_date), deadlines.UVV, sourceLabel);
  }

  console.log(JSON.stringify({
    sourceFile:input,
    ...counters,
    deadlines,
    unmatched:unmatched.slice(0,100),
    conflicts:conflicts.slice(0,100)
  }, null, 2));

  if (conflicts.length) process.exitCode = 2;
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
