import { NextResponse } from 'next/server';
import { prisma } from '@lts/db';

export async function GET(){
  const vehicles=await prisma.vehicle.findMany({
    where:{lifecycle:{not:'ACTIVE'}},
    orderBy:[{soldAt:'desc'},{plate:'asc'}],
    include:{telemetry:true,_count:{select:{documents:true}}},
  });

  const rows=vehicles.map(vehicle=>({
    id:vehicle.id,
    plate:vehicle.plate,
    vehicle:vehicle.displayName || [vehicle.manufacturer,vehicle.model].filter(Boolean).join(' ') || '—',
    lifecycle:vehicle.lifecycle,
    vin:vehicle.vin,
    inventoryNumber:vehicle.inventoryNumber,
    firstRegistration:vehicle.firstRegistration?.toISOString() ?? null,
    soldAt:vehicle.soldAt?.toISOString() ?? null,
    soldTo:vehicle.soldTo,
    soldPrice:vehicle.soldPrice?.toString() ?? null,
    soldMileageKm:vehicle.soldMileageKm,
    lastKnownMileageKm:vehicle.telemetry?.odometerKm ?? null,
    notes:vehicle.notes,
    documentsNotes:vehicle.documentsNotes,
    documentCount:vehicle._count.documents,
  }));

  return NextResponse.json({generatedAt:new Date().toISOString(),total:rows.length,vehicles:rows});
}
