import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';

export const dynamic='force-dynamic';

export async function GET(request:NextRequest){
  const q=String(request.nextUrl.searchParams.get('q') ?? '').trim();
  if(q.length<2) return NextResponse.json({query:q,results:[]});

  const [vehicles,documents]=await Promise.all([
    prisma.vehicle.findMany({
      where:{OR:[
        {plate:{contains:q,mode:'insensitive'}},
        {plateOriginal:{contains:q,mode:'insensitive'}},
        {vin:{contains:q,mode:'insensitive'}},
        {inventoryNumber:{contains:q,mode:'insensitive'}},
        {manufacturer:{contains:q,mode:'insensitive'}},
        {model:{contains:q,mode:'insensitive'}},
        {displayName:{contains:q,mode:'insensitive'}},
      ]},
      orderBy:[{lifecycle:'asc'},{plate:'asc'}],
      take:8,
      select:{id:true,plate:true,vin:true,inventoryNumber:true,displayName:true,manufacturer:true,model:true,lifecycle:true},
    }),
    prisma.vehicleDocument.findMany({
      where:{filename:{contains:q,mode:'insensitive'}},
      take:6,
      orderBy:{updatedAt:'desc'},
      select:{id:true,filename:true,type:true,vehicle:{select:{id:true,plate:true,lifecycle:true}}},
    }),
  ]);

  const results=[
    ...vehicles.map(vehicle=>({
      type:'vehicle',id:vehicle.id,title:vehicle.plate,
      subtitle:[vehicle.displayName||[vehicle.manufacturer,vehicle.model].filter(Boolean).join(' '),vehicle.vin?`VIN ${vehicle.vin}`:null,vehicle.inventoryNumber?`Inventar ${vehicle.inventoryNumber}`:null].filter(Boolean).join(' · '),
      lifecycle:vehicle.lifecycle,
      href:vehicle.lifecycle==='ACTIVE'?`/fuhrpark?vehicle=${vehicle.id}`:'/fuhrpark/archiv',
    })),
    ...documents.map(document=>({
      type:'document',id:document.id,title:document.filename,
      subtitle:`${document.vehicle.plate}${document.type?` · ${document.type}`:''}`,
      lifecycle:document.vehicle.lifecycle,
      href:'/documents',
    })),
  ];

  return NextResponse.json({query:q,results});
}
