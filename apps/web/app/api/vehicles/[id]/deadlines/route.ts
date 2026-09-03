import { NextRequest, NextResponse } from 'next/server';
import { DeadlineType, prisma } from '@lts/db';

const allowed=new Set<DeadlineType>(['TUV','SP','TACHO','UVV','SERVICE','INSURANCE','LEASING','OTHER']);

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const body=await request.json();
  const type=String(body?.type ?? '').toUpperCase() as DeadlineType;
  if(!allowed.has(type)) return NextResponse.json({error:'Invalid deadline type'},{status:400});

  const dueDate=new Date(body?.dueDate);
  if(Number.isNaN(dueDate.getTime())) return NextResponse.json({error:'Invalid dueDate'},{status:400});

  const vehicle=await prisma.vehicle.findUnique({where:{id},select:{id:true}});
  if(!vehicle) return NextResponse.json({error:'Vehicle not found'},{status:404});

  const replaceCurrent=body?.replaceCurrent !== false;
  const now=new Date();

  const deadline=await prisma.$transaction(async tx=>{
    if(replaceCurrent) {
      await tx.vehicleDeadline.updateMany({
        where:{vehicleId:id,type,completedAt:null},
        data:{completedAt:now},
      });
    }
    return tx.vehicleDeadline.create({
      data:{
        vehicleId:id,
        type,
        customType:type==='OTHER' ? String(body?.customType ?? '').trim() || null : null,
        dueDate,
        notes:String(body?.notes ?? '').trim() || null,
        optional:type==='UVV' ? true : Boolean(body?.optional),
      },
    });
  });

  return NextResponse.json(deadline,{status:201});
}
