import { NextRequest, NextResponse } from 'next/server';
import { DeadlineType, prisma } from '@lts/db';

const allowedTypes=new Set<DeadlineType>(['TUV','SP','TACHO','UVV','SERVICE','INSURANCE','LEASING','OTHER']);

function stateFor(dueDate:Date){
  const now=new Date();
  const days=Math.ceil((dueDate.getTime()-now.getTime())/86_400_000);
  if(days<0) return 'critical';
  if(days<=30) return 'warning';
  return 'ok';
}

export async function GET(request:NextRequest){
  const {searchParams}=new URL(request.url);
  const requested=searchParams.get('type')?.toUpperCase() as DeadlineType | undefined;
  const type=requested && allowedTypes.has(requested) ? requested : undefined;

  const deadlines=await prisma.vehicleDeadline.findMany({
    where:{
      completedAt:null,
      ...(type?{type}:{}),
      vehicle:{lifecycle:'ACTIVE'},
    },
    orderBy:[{dueDate:'asc'},{vehicle:{plate:'asc'}}],
    include:{vehicle:{select:{id:true,plate:true,displayName:true,manufacturer:true,model:true}}},
  });

  const rows=deadlines.map(item=>({
    id:item.id,
    vehicleId:item.vehicleId,
    plate:item.vehicle.plate,
    vehicle:item.vehicle.displayName || [item.vehicle.manufacturer,item.vehicle.model].filter(Boolean).join(' ') || '—',
    type:item.type,
    customType:item.customType,
    dueDate:item.dueDate.toISOString(),
    state:stateFor(item.dueDate),
    optional:item.optional,
    notes:item.notes,
  }));

  return NextResponse.json({
    generatedAt:new Date().toISOString(),
    total:rows.length,
    counts:{
      critical:rows.filter(row=>row.state==='critical').length,
      warning:rows.filter(row=>row.state==='warning').length,
      ok:rows.filter(row=>row.state==='ok').length,
    },
    deadlines:rows,
  });
}
