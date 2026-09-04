import process from 'node:process';
import { PrismaClient } from '@prisma/client';

const token=process.env.SAMSARA_API_TOKEN;
if(!token)throw new Error('Missing environment variable: SAMSARA_API_TOKEN');
const baseUrl=(process.env.SAMSARA_API_BASE_URL??'https://api.eu.samsara.com').replace(/\/$/,'');
const onlineThresholdMinutes=Number(process.env.SAMSARA_ONLINE_THRESHOLD_MINUTES??15);
const prisma=new PrismaClient();

function clean(value){return String(value??'').trim().replace(/\s+/g,' ')}
function normalizePlate(value){const raw=clean(value).toUpperCase();if(!raw)return null;const compact=raw.replace(/-/g,' ');const match=compact.match(/^([A-ZÄÖÜ]{1,3})\s+([A-ZÄÖÜ]{1,2})\s*([0-9]+[A-Z]?)$/);return match?`${match[1]}-${match[2]} ${match[3]}`:raw.replace(/\s*-\s*/g,'-').replace(/\s+/g,' ')}
async function samsaraGet(pathname,params={}){const url=new URL(`${baseUrl}${pathname}`);for(const [key,value] of Object.entries(params)){if(value!==null&&value!==undefined&&value!=='')url.searchParams.set(key,String(value))}const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`,Accept:'application/json'}});if(!response.ok){const body=await response.text();throw new Error(`Samsara ${response.status} ${pathname}: ${body.slice(0,500)}`)}return response.json()}
async function paginate(pathname,params={}){const data=[];let after;do{const payload=await samsaraGet(pathname,{...params,after});data.push(...(payload.data??[]));after=payload.pagination?.hasNextPage?payload.pagination?.endCursor:undefined}while(after);return data}

function samsaraVin(vehicle){return clean(vehicle.vin||vehicle.vehicleVin||vehicle.externalIds?.['samsara.vin'])||null}
function samsaraPlate(vehicle){return normalizePlate(vehicle.licensePlate||vehicle.externalIds?.['samsara.licensePlate'])}
function displayName(vehicle,existing){const make=clean(vehicle.make)||existing?.manufacturer||null;const model=clean(vehicle.model)||existing?.model||null;const name=[make,model].filter(Boolean).join(' ');return{manufacturer:make,model,displayName:name||existing?.displayName||clean(vehicle.name)||null}}
function odometerKm(stat){const meters=stat?.obdOdometerMeters?.value??stat?.gpsOdometerMeters?.value;return typeof meters==='number'&&Number.isFinite(meters)?Math.round(meters/1000):null}
function onlineFromGps(gps){if(!gps?.time)return null;const happened=new Date(gps.time).getTime();if(!Number.isFinite(happened))return null;return Date.now()-happened<=onlineThresholdMinutes*60_000}

function splitDriverName(value){
  const name=clean(value);
  if(!name)return{firstName:'',lastName:'Unbekannt'};
  const parts=name.split(' ');
  if(parts.length===1)return{firstName:parts[0],lastName:''};
  return{firstName:parts.slice(0,-1).join(' '),lastName:parts.at(-1)??''};
}
function personnelNumberFromExternalIds(externalIds){
  if(!externalIds||typeof externalIds!=='object')return null;
  const preferred=['personnelNumber','personalnummer','payrollId','employeeId','employeeNumber','mitarbeiterId','mitarbeiternummer'];
  for(const key of preferred){const value=clean(externalIds[key]);if(value)return value}
  for(const [key,value] of Object.entries(externalIds)){if(/person|personal|payroll|employee|mitarbeiter/i.test(key)){const cleaned=clean(value);if(cleaned)return cleaned}}
  return null;
}

async function setState(status,message,counters){
  await prisma.integrationState.upsert({
    where:{key:'SAMSARA'},
    create:{key:'SAMSARA',enabled:true,lastSyncAt:new Date(),lastStatus:status,lastMessage:message,counters},
    update:{enabled:true,lastSyncAt:new Date(),lastStatus:status,lastMessage:message,counters},
  });
}

async function syncVehicles(){
  const dbVehicles=await prisma.vehicle.findMany({where:{lifecycle:'ACTIVE'},select:{id:true,plate:true,plateAliases:true,vin:true,samsaraId:true,manufacturer:true,model:true,displayName:true}});
  const byVin=new Map(dbVehicles.filter(v=>v.vin).map(v=>[v.vin.toUpperCase(),v]));
  const byPlate=new Map();
  for(const vehicle of dbVehicles){byPlate.set(vehicle.plate.toUpperCase(),vehicle);for(const alias of vehicle.plateAliases)byPlate.set(alias.toUpperCase(),vehicle)}

  const samsaraVehicles=await paginate('/fleet/vehicles',{limit:512});
  const stats=await paginate('/fleet/vehicles/stats',{types:'gps,obdOdometerMeters,gpsOdometerMeters'});
  const statsById=new Map(stats.map(item=>[String(item.id),item]));
  let matched=0,unmatched=0,telemetryUpdated=0;
  const matchedDbIds=new Set();
  const unmatchedSamsara=[];

  for(const samsaraVehicle of samsaraVehicles){
    const vin=samsaraVin(samsaraVehicle);
    const plate=samsaraPlate(samsaraVehicle);
    const existing=(vin?byVin.get(vin.toUpperCase()):null)||(plate?byPlate.get(plate.toUpperCase()):null);
    if(!existing){unmatched+=1;unmatchedSamsara.push({id:String(samsaraVehicle.id),name:samsaraVehicle.name??null,vin,plate});continue}

    matched+=1;
    matchedDbIds.add(existing.id);
    const names=displayName(samsaraVehicle,existing);
    await prisma.vehicle.update({where:{id:existing.id},data:{samsaraId:String(samsaraVehicle.id),manufacturer:names.manufacturer,model:names.model,displayName:names.displayName}});
    const stat=statsById.get(String(samsaraVehicle.id));
    if(!stat)continue;
    const gps=stat.gps??null;
    const geofenceName=clean(gps?.address?.name)||null;
    const reverseGeo=clean(gps?.reverseGeo?.formattedLocation)||null;
    const locationLabel=geofenceName||reverseGeo||null;
    await prisma.vehicleTelemetry.upsert({
      where:{vehicleId:existing.id},
      create:{vehicleId:existing.id,samsaraId:String(samsaraVehicle.id),online:onlineFromGps(gps),odometerKm:odometerKm(stat),latitude:typeof gps?.latitude==='number'?gps.latitude:null,longitude:typeof gps?.longitude==='number'?gps.longitude:null,address:reverseGeo,locationLabel,geofenceName,lastSeenAt:gps?.time?new Date(gps.time):null,raw:stat},
      update:{samsaraId:String(samsaraVehicle.id),online:onlineFromGps(gps),odometerKm:odometerKm(stat),latitude:typeof gps?.latitude==='number'?gps.latitude:null,longitude:typeof gps?.longitude==='number'?gps.longitude:null,address:reverseGeo,locationLabel,geofenceName,lastSeenAt:gps?.time?new Date(gps.time):null,raw:stat},
    });
    telemetryUpdated+=1;
  }

  const dbWithoutMatch=dbVehicles.filter(vehicle=>!matchedDbIds.has(vehicle.id)).map(vehicle=>({plate:vehicle.plate,vin:vehicle.vin,samsaraId:vehicle.samsaraId}));
  return{
    samsaraVehicles:samsaraVehicles.length,
    samsaraStats:stats.length,
    matched,
    unmatched,
    telemetryUpdated,
    databaseWithoutMatch:dbWithoutMatch.length,
    unmatchedSamsara:unmatchedSamsara.slice(0,100),
    databaseVehiclesWithoutSamsaraMatch:dbWithoutMatch.slice(0,100),
  };
}

async function syncDrivers(){
  const [activeDrivers,deactivatedDrivers]=await Promise.all([
    paginate('/fleet/drivers',{limit:512,driverActivationStatus:'active'}),
    paginate('/fleet/drivers',{limit:512,driverActivationStatus:'deactivated'}),
  ]);
  const samsaraDrivers=[
    ...activeDrivers.map(row=>({...row,_activationStatus:'active'})),
    ...deactivatedDrivers.map(row=>({...row,_activationStatus:'deactivated'})),
  ];

  const dbDrivers=await prisma.driver.findMany({select:{id:true,samsaraId:true,personnelNumber:true,driverCardNumber:true,language:true}});
  const bySamsara=new Map(dbDrivers.filter(row=>row.samsaraId).map(row=>[String(row.samsaraId),row]));
  const byPersonnel=new Map(dbDrivers.filter(row=>row.personnelNumber).map(row=>[String(row.personnelNumber).toUpperCase(),row]));
  const byCard=new Map(dbDrivers.filter(row=>row.driverCardNumber).map(row=>[String(row.driverCardNumber).toUpperCase(),row]));
  const matchedDbIds=new Set();

  let driversCreated=0,driversUpdated=0,driverConflicts=0;
  const conflicts=[];

  for(const samsaraDriver of samsaraDrivers){
    const samsaraId=String(samsaraDriver.id);
    const personnelNumber=personnelNumberFromExternalIds(samsaraDriver.externalIds);
    const driverCardNumber=clean(samsaraDriver.tachographCardNumber)||null;
    const candidates=[
      bySamsara.get(samsaraId),
      personnelNumber?byPersonnel.get(personnelNumber.toUpperCase()):null,
      driverCardNumber?byCard.get(driverCardNumber.toUpperCase()):null,
    ].filter(Boolean);
    const candidateIds=[...new Set(candidates.map(row=>row.id))];

    if(candidateIds.length>1){
      driverConflicts+=1;
      conflicts.push({samsaraId,name:samsaraDriver.name??null,personnelNumber,driverCardNumber,matches:candidates.map(row=>row.id)});
      continue;
    }

    const existing=candidates[0]??null;
    const samsaraName=clean(samsaraDriver.name)||`Samsara ${samsaraId}`;
    const split=splitDriverName(samsaraName);
    const data={
      samsaraId,
      samsaraName,
      samsaraSyncedAt:new Date(),
      profileImageUrl:clean(samsaraDriver.profileImageUrl)||null,
      personnelNumber,
      firstName:split.firstName,
      lastName:split.lastName,
      phone:clean(samsaraDriver.phone)||null,
      email:clean(samsaraDriver.email)||null,
      language:clean(samsaraDriver.locale)||existing?.language||'de',
      status:(samsaraDriver.driverActivationStatus??samsaraDriver._activationStatus)==='deactivated'?'LEFT':'ACTIVE',
      licenseNumber:clean(samsaraDriver.licenseNumber)||null,
      licenseState:clean(samsaraDriver.licenseState)||null,
      driverCardNumber,
      notes:clean(samsaraDriver.notes)||null,
      sourceRaw:samsaraDriver,
    };

    let saved;
    if(existing){
      saved=await prisma.driver.update({where:{id:existing.id},data});
      driversUpdated+=1;
    }else{
      saved=await prisma.driver.create({data});
      driversCreated+=1;
    }
    matchedDbIds.add(saved.id);
    bySamsara.set(samsaraId,saved);
    if(saved.personnelNumber)byPersonnel.set(saved.personnelNumber.toUpperCase(),saved);
    if(saved.driverCardNumber)byCard.set(saved.driverCardNumber.toUpperCase(),saved);
  }

  const localWithoutSamsara=dbDrivers.filter(row=>!matchedDbIds.has(row.id)&&!row.samsaraId).length;
  return{
    samsaraDrivers:samsaraDrivers.length,
    samsaraDriversActive:activeDrivers.length,
    samsaraDriversDeactivated:deactivatedDrivers.length,
    driversCreated,
    driversUpdated,
    driverConflicts,
    localDriversWithoutSamsara:localWithoutSamsara,
    driverConflictDetails:conflicts.slice(0,100),
  };
}

async function main(){
  const [vehicleResult,driverResult]=await Promise.all([syncVehicles(),syncDrivers()]);
  const counters={
    samsaraVehicles:vehicleResult.samsaraVehicles,
    samsaraStats:vehicleResult.samsaraStats,
    matched:vehicleResult.matched,
    unmatched:vehicleResult.unmatched,
    telemetryUpdated:vehicleResult.telemetryUpdated,
    databaseWithoutMatch:vehicleResult.databaseWithoutMatch,
    samsaraDrivers:driverResult.samsaraDrivers,
    samsaraDriversActive:driverResult.samsaraDriversActive,
    samsaraDriversDeactivated:driverResult.samsaraDriversDeactivated,
    driversCreated:driverResult.driversCreated,
    driversUpdated:driverResult.driversUpdated,
    driverConflicts:driverResult.driverConflicts,
  };
  await setState('OK',`Vehicles: ${vehicleResult.matched}/${vehicleResult.samsaraVehicles} matched. Drivers: ${driverResult.samsaraDrivers} synced.`,counters);
  console.log(JSON.stringify({
    ...counters,
    baseUrl,
    unmatchedSamsara:vehicleResult.unmatchedSamsara,
    databaseVehiclesWithoutSamsaraMatch:vehicleResult.databaseVehiclesWithoutSamsaraMatch,
    localDriversWithoutSamsara:driverResult.localDriversWithoutSamsara,
    driverConflictDetails:driverResult.driverConflictDetails,
  },null,2));
}

main().catch(async error=>{
  console.error(error);
  try{await setState('ERROR',String(error?.message??error).slice(0,1000),{})}catch(stateError){console.error('Could not persist Samsara error state',stateError)}
  process.exitCode=1;
}).finally(async()=>{await prisma.$disconnect()});
