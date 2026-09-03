import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';

const editable = new Set([
  'manufacturer','model','displayName','cameraInstalled','wrapped','wrapType','notes','documentsNotes'
]);

export async function GET(_:NextRequest,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const vehicle=await prisma.vehicle.findUnique({
    where:{id},
    include:{
      telemetry:true,
      deadlines:{orderBy:{dueDate:'desc'}},
      documents:{orderBy:{filename:'asc'}},
      syncMappings:true,
      hookLoadPeriods:{orderBy:{startsAt:'desc'}},
    },
  });
  if(!vehicle) return NextResponse.json({error:'Vehicle not found'},{status:404});

  return NextResponse.json({
    ...vehicle,
    documents:vehicle.documents.map(document=>({
      ...document,
      sizeBytes:document.sizeBytes?.toString() ?? null,
    })),
  });
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const body=await request.json();
  const data:Record<string,unknown>={};
  for(const [key,value] of Object.entries(body ?? {})) {
    if(editable.has(key)) data[key]=value;
  }
  if(!Object.keys(data).length) return NextResponse.json({error:'No editable fields supplied'},{status:400});
  const vehicle=await prisma.vehicle.update({where:{id},data});
  return NextResponse.json(vehicle);
}
