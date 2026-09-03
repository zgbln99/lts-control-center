import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';

export async function GET(request:NextRequest){
  const {searchParams}=new URL(request.url);
  const vehicleId=searchParams.get('vehicleId') || undefined;
  const documents=await prisma.vehicleDocument.findMany({
    where:{...(vehicleId?{vehicleId}:{})},
    orderBy:[{vehicle:{plate:'asc'}},{filename:'asc'}],
    include:{vehicle:{select:{id:true,plate:true,displayName:true,manufacturer:true,model:true,lifecycle:true}}},
  });

  const rows=documents.map(document=>({
    id:document.id,
    vehicleId:document.vehicleId,
    plate:document.vehicle.plate,
    vehicle:document.vehicle.displayName || [document.vehicle.manufacturer,document.vehicle.model].filter(Boolean).join(' ') || '—',
    lifecycle:document.vehicle.lifecycle,
    type:document.type,
    filename:document.filename,
    mimeType:document.mimeType,
    sizeBytes:document.sizeBytes===null?null:Number(document.sizeBytes),
    source:document.source,
    documentDate:document.documentDate?.toISOString() ?? null,
    expiresAt:document.expiresAt?.toISOString() ?? null,
    createdAt:document.createdAt.toISOString(),
  }));

  return NextResponse.json({
    generatedAt:new Date().toISOString(),
    total:rows.length,
    activeVehicles:new Set(rows.filter(row=>row.lifecycle==='ACTIVE').map(row=>row.vehicleId)).size,
    documents:rows,
  });
}
