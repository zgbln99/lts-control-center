import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';

function formatDate(value: Date | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(value);
}

function deadlineState(dueDate: Date | null) {
  if (!dueDate) return 'none';
  const now = new Date();
  const days = Math.ceil((dueDate.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return 'critical';
  if (days <= 30) return 'warning';
  return 'ok';
}

function normalizePlate(value:unknown){
  const raw=String(value ?? '').toUpperCase().trim().replace(/\s+/g,' ').replace(/\s*-\s*/g,'-');
  if(!raw) return '';
  const compact=raw.replace(/-/g,' ');
  const match=compact.match(/^([A-ZÄÖÜ]{1,3})\s+([A-ZÄÖÜ]{1,2})\s*([0-9]+[A-Z]?)$/);
  return match ? `${match[1]}-${match[2]} ${match[3]}` : raw;
}

function optionalString(value:unknown){
  const text=String(value ?? '').trim();
  return text || null;
}

function optionalDate(value:unknown){
  if(!value) return null;
  const date=new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function optionalBoolean(value:unknown){
  if(value===true||value==='true'||value===1||value==='1') return true;
  if(value===false||value==='false'||value===0||value==='0') return false;
  return null;
}

export async function GET() {
  const vehicles = await prisma.vehicle.findMany({
    where: { lifecycle: 'ACTIVE' },
    orderBy: [{ sourcePosition: 'asc' }, { plate: 'asc' }],
    include: {
      telemetry: true,
      deadlines: {
        where: { completedAt: null },
        orderBy: { dueDate: 'asc' },
      },
      _count: { select: { documents: true } },
    },
  });

  const rows = vehicles.map(vehicle => {
    const tuv = vehicle.deadlines.find(item => item.type === 'TUV') ?? null;
    const sp = vehicle.deadlines.find(item => item.type === 'SP') ?? null;
    const tacho = vehicle.deadlines.find(item => item.type === 'TACHO') ?? null;

    return {
      id: vehicle.id,
      plate: vehicle.plate,
      plateOriginal: vehicle.plateOriginal,
      plateAliases: vehicle.plateAliases,
      vehicle: vehicle.displayName || [vehicle.manufacturer, vehicle.model].filter(Boolean).join(' ') || '—',
      firstRegistration: formatDate(vehicle.firstRegistration),
      vin: vehicle.vin,
      insuranceNumber: vehicle.insuranceNumber,
      taxNumber: vehicle.taxNumber,
      grossVehicleWeightKg: vehicle.grossVehicleWeightKg,
      inventoryNumber: vehicle.inventoryNumber,
      financingEnd: formatDate(vehicle.financingEnd),
      financingEndRaw: vehicle.financingEndRaw,
      monthlyRate: vehicle.monthlyRate?.toString() ?? vehicle.rateRaw,
      documentsNotes: vehicle.documentsNotes,
      notes: vehicle.notes,
      cameraInstalled: vehicle.cameraInstalled,
      wrapped: vehicle.wrapped,
      wrapType: vehicle.wrapType,
      samsara: {
        connected: Boolean(vehicle.samsaraId),
        id: vehicle.samsaraId,
        online: vehicle.telemetry?.online ?? null,
        location: vehicle.telemetry?.geofenceName || vehicle.telemetry?.locationLabel || vehicle.telemetry?.address || null,
        odometerKm: vehicle.telemetry?.odometerKm ?? null,
        lastSeenAt: vehicle.telemetry?.lastSeenAt?.toISOString() ?? null,
      },
      deadlines: {
        tuv: tuv ? { dueDate: tuv.dueDate.toISOString(), state: deadlineState(tuv.dueDate) } : null,
        sp: sp ? { dueDate: sp.dueDate.toISOString(), state: deadlineState(sp.dueDate) } : null,
        tacho: tacho ? { dueDate: tacho.dueDate.toISOString(), state: deadlineState(tacho.dueDate) } : null,
      },
      documentCount: vehicle._count.documents,
    };
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    total: rows.length,
    vehicles: rows,
  });
}

export async function POST(request:NextRequest){
  const body=await request.json();
  const plate=normalizePlate(body?.plate);
  if(!plate) return NextResponse.json({error:'Kennzeichen ist erforderlich.'},{status:400});

  const firstRegistration=optionalDate(body?.firstRegistration);
  if(firstRegistration===undefined) return NextResponse.json({error:'Ungültige Erstzulassung.'},{status:400});

  const existing=await prisma.vehicle.findUnique({where:{plate},select:{id:true}});
  if(existing) return NextResponse.json({error:'Dieses Kennzeichen existiert bereits.'},{status:409});

  const vin=optionalString(body?.vin)?.toUpperCase() ?? null;
  if(vin){
    const vinMatch=await prisma.vehicle.findUnique({where:{vin},select:{id:true,plate:true}});
    if(vinMatch) return NextResponse.json({error:`VIN ist bereits ${vinMatch.plate} zugeordnet.`},{status:409});
  }

  const vehicle=await prisma.vehicle.create({
    data:{
      plate,
      plateOriginal:plate,
      plateAliases:[plate],
      vin,
      firstRegistration,
      manufacturer:optionalString(body?.manufacturer),
      model:optionalString(body?.model),
      displayName:optionalString(body?.displayName),
      insuranceNumber:optionalString(body?.insuranceNumber),
      inventoryNumber:optionalString(body?.inventoryNumber),
      notes:optionalString(body?.notes),
      cameraInstalled:optionalBoolean(body?.cameraInstalled),
      wrapped:optionalBoolean(body?.wrapped),
      wrapType:optionalString(body?.wrapType),
    },
  });

  return NextResponse.json(vehicle,{status:201});
}
