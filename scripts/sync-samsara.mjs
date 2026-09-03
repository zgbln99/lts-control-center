import process from 'node:process';
import { PrismaClient } from '@prisma/client';

const token = process.env.SAMSARA_API_TOKEN;
if (!token) throw new Error('Missing environment variable: SAMSARA_API_TOKEN');

const baseUrl = (process.env.SAMSARA_API_BASE_URL ?? 'https://api.eu.samsara.com').replace(/\/$/,'');
const onlineThresholdMinutes = Number(process.env.SAMSARA_ONLINE_THRESHOLD_MINUTES ?? 15);
const prisma = new PrismaClient();

function clean(value) {
  return String(value ?? '').trim().replace(/\s+/g,' ');
}

function normalizePlate(value) {
  const raw = clean(value).toUpperCase();
  if (!raw) return null;
  const compact = raw.replace(/-/g,' ');
  const match = compact.match(/^([A-ZÄÖÜ]{1,3})\s+([A-ZÄÖÜ]{1,2})\s*([0-9]+[A-Z]?)$/);
  return match ? `${match[1]}-${match[2]} ${match[3]}` : raw.replace(/\s*-\s*/g,'-').replace(/\s+/g,' ');
}

async function samsaraGet(pathname, params = {}) {
  const url = new URL(`${baseUrl}${pathname}`);
  for (const [key,value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') url.searchParams.set(key,String(value));
  }

  const response = await fetch(url, {
    headers: {
      Authorization:`Bearer ${token}`,
      Accept:'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Samsara ${response.status} ${pathname}: ${body.slice(0,500)}`);
  }
  return response.json();
}

async function paginate(pathname, params = {}) {
  const data = [];
  let after;
  do {
    const payload = await samsaraGet(pathname,{...params,after});
    data.push(...(payload.data ?? []));
    after = payload.pagination?.hasNextPage ? payload.pagination?.endCursor : undefined;
  } while (after);
  return data;
}

function samsaraVin(vehicle) {
  return clean(vehicle.vin || vehicle.vehicleVin || vehicle.externalIds?.['samsara.vin']) || null;
}

function samsaraPlate(vehicle) {
  return normalizePlate(vehicle.licensePlate || vehicle.externalIds?.['samsara.licensePlate']);
}

function displayName(vehicle, existing) {
  const make = clean(vehicle.make) || existing?.manufacturer || null;
  const model = clean(vehicle.model) || existing?.model || null;
  const name = [make,model].filter(Boolean).join(' ');
  return {
    manufacturer:make,
    model,
    displayName:name || existing?.displayName || clean(vehicle.name) || null,
  };
}

function odometerKm(stat) {
  const meters = stat?.obdOdometerMeters?.value ?? stat?.gpsOdometerMeters?.value;
  return typeof meters === 'number' && Number.isFinite(meters) ? Math.round(meters / 1000) : null;
}

function onlineFromGps(gps) {
  if (!gps?.time) return null;
  const happened = new Date(gps.time).getTime();
  if (!Number.isFinite(happened)) return null;
  return Date.now() - happened <= onlineThresholdMinutes * 60_000;
}

async function main() {
  const dbVehicles = await prisma.vehicle.findMany({
    where:{lifecycle:'ACTIVE'},
    select:{
      id:true, plate:true, plateAliases:true, vin:true, samsaraId:true,
      manufacturer:true, model:true, displayName:true,
    },
  });

  const byVin = new Map(dbVehicles.filter(v=>v.vin).map(v=>[v.vin.toUpperCase(),v]));
  const byPlate = new Map();
  for (const vehicle of dbVehicles) {
    byPlate.set(vehicle.plate.toUpperCase(),vehicle);
    for (const alias of vehicle.plateAliases) byPlate.set(alias.toUpperCase(),vehicle);
  }

  const samsaraVehicles = await paginate('/fleet/vehicles',{limit:512});
  const stats = await paginate('/fleet/vehicles/stats',{types:'gps,obdOdometerMeters,gpsOdometerMeters'});
  const statsById = new Map(stats.map(item=>[String(item.id),item]));

  let matched = 0;
  let unmatched = 0;
  let telemetryUpdated = 0;
  const matchedDbIds = new Set();
  const unmatchedSamsara = [];

  for (const samsaraVehicle of samsaraVehicles) {
    const vin = samsaraVin(samsaraVehicle);
    const plate = samsaraPlate(samsaraVehicle);
    const existing = (vin ? byVin.get(vin.toUpperCase()) : null) || (plate ? byPlate.get(plate.toUpperCase()) : null);

    if (!existing) {
      unmatched += 1;
      unmatchedSamsara.push({
        id:String(samsaraVehicle.id),
        name:samsaraVehicle.name ?? null,
        vin,
        plate,
      });
      continue;
    }

    matched += 1;
    matchedDbIds.add(existing.id);
    const names = displayName(samsaraVehicle,existing);
    await prisma.vehicle.update({
      where:{id:existing.id},
      data:{
        samsaraId:String(samsaraVehicle.id),
        manufacturer:names.manufacturer,
        model:names.model,
        displayName:names.displayName,
      },
    });

    const stat = statsById.get(String(samsaraVehicle.id));
    if (!stat) continue;
    const gps = stat.gps ?? null;
    const geofenceName = clean(gps?.address?.name) || null;
    const reverseGeo = clean(gps?.reverseGeo?.formattedLocation) || null;
    const locationLabel = geofenceName || reverseGeo || null;

    await prisma.vehicleTelemetry.upsert({
      where:{vehicleId:existing.id},
      create:{
        vehicleId:existing.id,
        samsaraId:String(samsaraVehicle.id),
        online:onlineFromGps(gps),
        odometerKm:odometerKm(stat),
        latitude:typeof gps?.latitude==='number'?gps.latitude:null,
        longitude:typeof gps?.longitude==='number'?gps.longitude:null,
        address:reverseGeo,
        locationLabel,
        geofenceName,
        lastSeenAt:gps?.time?new Date(gps.time):null,
        raw:stat,
      },
      update:{
        samsaraId:String(samsaraVehicle.id),
        online:onlineFromGps(gps),
        odometerKm:odometerKm(stat),
        latitude:typeof gps?.latitude==='number'?gps.latitude:null,
        longitude:typeof gps?.longitude==='number'?gps.longitude:null,
        address:reverseGeo,
        locationLabel,
        geofenceName,
        lastSeenAt:gps?.time?new Date(gps.time):null,
        raw:stat,
      },
    });
    telemetryUpdated += 1;
  }

  const dbWithoutMatch = dbVehicles
    .filter(vehicle=>!matchedDbIds.has(vehicle.id))
    .map(vehicle=>({plate:vehicle.plate,vin:vehicle.vin,samsaraId:vehicle.samsaraId}));

  console.log(JSON.stringify({
    baseUrl,
    samsaraVehicles:samsaraVehicles.length,
    samsaraStats:stats.length,
    matched,
    unmatched,
    telemetryUpdated,
    unmatchedSamsara:unmatchedSamsara.slice(0,100),
    databaseVehiclesWithoutSamsaraMatch:dbWithoutMatch.slice(0,100),
  },null,2));
}

main()
  .catch(error=>{
    console.error(error);
    process.exitCode=1;
  })
  .finally(async()=>{
    await prisma.$disconnect();
  });
