import { NextResponse } from 'next/server';
import { prisma } from '@lts/db';

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const deadline=await prisma.vehicleDeadline.update({
    where:{id},
    data:{completedAt:new Date()},
  });
  return NextResponse.json(deadline);
}
