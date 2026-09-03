import { NextRequest, NextResponse } from 'next/server';
import { prisma, VehicleLifecycle } from '@lts/db';

const allowed=new Set<VehicleLifecycle>(['SOLD','RETURNED','SCRAPPED','ARCHIVED']);

function optionalNumber(value:unknown){
  if(value===null || value===undefined || value==='') return null;
  const parsed=Number(String(value).replace(',','.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const body=await request.json();
  const lifecycle=String(body?.lifecycle ?? 'SOLD').toUpperCase() as VehicleLifecycle;
  if(!allowed.has(lifecycle)) return NextResponse.json({error:'Invalid lifecycle value'},{status:400});

  const soldAt=body?.soldAt ? new Date(body.soldAt) : new Date();
  if(Number.isNaN(soldAt.getTime())) return NextResponse.json({error:'Invalid soldAt date'},{status:400});

  const soldPrice=optionalNumber(body?.soldPrice);
  const soldMileage=optionalNumber(body?.soldMileageKm);

  const existing=await prisma.vehicle.findUnique({where:{id},select:{id:true}});
  if(!existing) return NextResponse.json({error:'Vehicle not found'},{status:404});

  const vehicle=await prisma.vehicle.update({
    where:{id},
    data:{
      lifecycle,
      soldAt,
      soldTo:String(body?.soldTo ?? '').trim() || null,
      soldPrice,
      soldMileageKm:soldMileage===null ? null : Math.round(soldMileage),
      lifecycleNote:String(body?.lifecycleNote ?? '').trim() || null,
    },
  });

  return NextResponse.json(vehicle);
}
