import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';
import { audit } from '@/lib/audit';

const VEHICLE_CATEGORIES=['TRUCK','VAN','TRAILER','SEMITRAILER','OTHER'] as const;
function formatDate(value: Date | null) {if (!value) return null;return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).format(value)}
function deadlineState(dueDate: Date | null) {if (!dueDate) return 'none';const days=Math.ceil((dueDate.getTime()-Date.now())/86_400_000);if(days<0)return'critical';if(days<=30)return'warning';return'ok'}
function normalizePlate(value:unknown){const raw=String(value??'').toUpperCase().trim().replace(/\s+/g,' ').replace(/\s*-\s*/g,'-');if(!raw)return'';const compact=raw.replace(/-/g,' ');const match=compact.match(/^([A-ZÄÖÜ]{1,3})\s+([A-ZÄÖÜ]{1,2})\s*([0-9]+[A-Z]?)$/);return match?`${match[1]}-${match[2]} ${match[3]}`:raw}
function optionalString(value:unknown){const text=String(value??'').trim();return text||null}
function optionalDate(value:unknown){if(!value)return null;const date=new Date(String(value));return Number.isNaN(date.getTime())?undefined:date}
function optionalBoolean(value:unknown){if(value===true||value==='true'||value===1||value==='1')return true;if(value===false||value==='false'||value===0||value==='0')return false;return null}
function parseCategory(value:unknown){const parsed=String(value??'').trim().toUpperCase();return VEHICLE_CATEGORIES.includes(parsed as typeof VEHICLE_CATEGORIES[number])?parsed:null}

export async function GET(request:NextRequest) {
  const typ=request.nextUrl.searchParams.get('typ');
  const categoryParam=request.nextUrl.searchParams.get('category');
  if(categoryParam&&!parseCategory(categoryParam))return NextResponse.json({error:'Invalid vehicle category'},{status:400});
  const categoryWhere=typ==='anhaenger'?{in:['TRAILER','SEMITRAILER'] as const}:categoryParam?parseCategory(categoryParam)??undefined:undefined;
  const vehicles=await prisma.vehicle.findMany({where:{lifecycle:'ACTIVE',...(categoryWhere?{category:categoryWhere as any}:{})},orderBy:[{sourcePosition:'asc'},{plate:'asc'}],include:{telemetry:true,deadlines:{where:{completedAt:null},orderBy:{dueDate:'asc'}},documents:{where:{type:'FAHRZEUGFOTO'},orderBy:{createdAt:'desc'},take:1,select:{id:true}},_count:{select:{documents:true}}}});
  const rows=vehicles.map(vehicle=>{const tuv=vehicle.deadlines.find(item=>item.type==='TUV')??null;const sp=vehicle.deadlines.find(item=>item.type==='SP')??null;const tacho=vehicle.deadlines.find(item=>item.type==='TACHO')??null;const uvv=vehicle.deadlines.find(item=>item.type==='UVV')??null;return {
    id:vehicle.id,plate:vehicle.plate,plateOriginal:vehicle.plateOriginal,plateAliases:vehicle.plateAliases,category:vehicle.category,
    vehicle:vehicle.displayName||[vehicle.manufacturer,vehicle.model].filter(Boolean).join(' ')||'—',firstRegistration:formatDate(vehicle.firstRegistration),vin:vehicle.vin,
    insuranceNumber:vehicle.insuranceNumber,taxNumber:vehicle.taxNumber,grossVehicleWeightKg:vehicle.grossVehicleWeightKg,powerKw:vehicle.powerKw?.toString()??null,powerHp:vehicle.powerHp?.toString()??null,inventoryNumber:vehicle.inventoryNumber,
    financingEnd:formatDate(vehicle.financingEnd),financingEndRaw:vehicle.financingEndRaw,monthlyRate:vehicle.monthlyRate?.toString()??vehicle.rateRaw,documentsNotes:vehicle.documentsNotes,notes:vehicle.notes,
    cameraInstalled:vehicle.cameraInstalled,wrapped:vehicle.wrapped,wrapType:vehicle.wrapType,photoId:vehicle.documents[0]?.id??null,
    samsara:{connected:Boolean(vehicle.samsaraId),id:vehicle.samsaraId,online:vehicle.telemetry?.online??null,location:vehicle.telemetry?.geofenceName||vehicle.telemetry?.locationLabel||vehicle.telemetry?.address||null,odometerKm:vehicle.telemetry?.odometerKm??null,latitude:vehicle.telemetry?.latitude??null,longitude:vehicle.telemetry?.longitude??null,lastSeenAt:vehicle.telemetry?.lastSeenAt?.toISOString()??null},
    deadlines:{tuv:tuv?{dueDate:tuv.dueDate.toISOString(),state:deadlineState(tuv.dueDate)}:null,sp:sp?{dueDate:sp.dueDate.toISOString(),state:deadlineState(sp.dueDate)}:null,tacho:tacho?{dueDate:tacho.dueDate.toISOString(),state:deadlineState(tacho.dueDate)}:null,uvv:uvv?{dueDate:uvv.dueDate.toISOString(),state:deadlineState(uvv.dueDate)}:null},documentCount:Math.max(0,vehicle._count.documents-vehicle.documents.length),
  }});
  return NextResponse.json({generatedAt:new Date().toISOString(),total:rows.length,vehicles:rows});
}

export async function POST(request:NextRequest){
  const body=await request.json();const plate=normalizePlate(body?.plate);if(!plate)return NextResponse.json({error:'Kennzeichen ist erforderlich.'},{status:400});
  const firstRegistration=optionalDate(body?.firstRegistration);if(firstRegistration===undefined)return NextResponse.json({error:'Ungültige Erstzulassung.'},{status:400});
  const vehicleCategory=parseCategory(body?.category||'OTHER');if(!vehicleCategory)return NextResponse.json({error:'Ungültige Fahrzeugkategorie.'},{status:400});
  const existing=await prisma.vehicle.findUnique({where:{plate},select:{id:true}});if(existing)return NextResponse.json({error:'Dieses Kennzeichen existiert bereits.'},{status:409});
  const vin=optionalString(body?.vin)?.toUpperCase()??null;if(vin){const vinMatch=await prisma.vehicle.findUnique({where:{vin},select:{id:true,plate:true}});if(vinMatch)return NextResponse.json({error:`VIN ist bereits ${vinMatch.plate} zugeordnet.`},{status:409})}
  const vehicle=await prisma.vehicle.create({data:{plate,plateOriginal:plate,plateAliases:[plate],vin,category:vehicleCategory as any,firstRegistration,manufacturer:optionalString(body?.manufacturer),model:optionalString(body?.model),displayName:optionalString(body?.displayName),insuranceNumber:optionalString(body?.insuranceNumber),inventoryNumber:optionalString(body?.inventoryNumber),notes:optionalString(body?.notes),cameraInstalled:optionalBoolean(body?.cameraInstalled),wrapped:optionalBoolean(body?.wrapped),wrapType:optionalString(body?.wrapType)}});
  await audit(request,'CREATE','Vehicle',vehicle.id,{plate:vehicle.plate,category:vehicle.category});
  return NextResponse.json(vehicle,{status:201});
}
