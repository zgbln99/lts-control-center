import { NextResponse } from 'next/server';
import { prisma } from '@lts/db';

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const vehicle=await prisma.vehicle.update({
    where:{id},
    data:{
      lifecycle:'ACTIVE',
      soldAt:null,
      soldTo:null,
      soldPrice:null,
      soldMileageKm:null,
    },
  });
  return NextResponse.json(vehicle);
}
