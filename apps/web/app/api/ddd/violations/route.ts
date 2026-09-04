import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';

export async function GET(request:NextRequest){
  const params=request.nextUrl.searchParams;
  const q=params.get('q')?.trim();
  const severity=params.get('severity')?.trim();
  const from=params.get('from');
  const to=params.get('to');
  const acknowledged=params.get('acknowledged');
  const driverId=params.get('driverId')?.trim();
  const take=Math.min(500,Math.max(25,Number(params.get('take')||250)));
  const violations=await prisma.tachographViolation.findMany({
    where:{
      ...(driverId?{driverId}:{}),
      ...(severity&&severity!=='ALL'?{severity}:{}),
      ...(from||to?{startsAt:{...(from?{gte:new Date(from)}:{}),...(to?{lte:new Date(to)}:{})}}:{}),
      ...(acknowledged==='true'?{acknowledgedAt:{not:null}}:acknowledged==='false'?{acknowledgedAt:null}:{}),
      ...(q?{OR:[
        {driverCardNumber:{contains:q,mode:'insensitive'}},{plate:{contains:q,mode:'insensitive'}},{type:{contains:q,mode:'insensitive'}},{code:{contains:q,mode:'insensitive'}},{description:{contains:q,mode:'insensitive'}},{legalReference:{contains:q,mode:'insensitive'}},
      ]}:{}),
    },
    orderBy:{startsAt:'desc'},take,
  });
  const driverIds=[...new Set(violations.map(row=>row.driverId).filter(Boolean))] as string[];
  const vehicleIds=[...new Set(violations.map(row=>row.vehicleId).filter(Boolean))] as string[];
  const [drivers,vehicles]=await Promise.all([
    prisma.driver.findMany({where:{id:{in:driverIds}},select:{id:true,firstName:true,lastName:true,personnelNumber:true}}),
    prisma.vehicle.findMany({where:{id:{in:vehicleIds}},select:{id:true,plate:true,displayName:true}}),
  ]);
  const driverMap=new Map(drivers.map(row=>[row.id,row]));const vehicleMap=new Map(vehicles.map(row=>[row.id,row]));
  return NextResponse.json({violations:violations.map(row=>({...row,driver:row.driverId?driverMap.get(row.driverId)??null:null,vehicle:row.vehicleId?vehicleMap.get(row.vehicleId)??null:null}))});
}

export async function PATCH(request:NextRequest){
  const body=await request.json();const ids=Array.isArray(body.ids)?body.ids.map(String):[];if(!ids.length)return NextResponse.json({error:'ids array is required'},{status:400});
  const acknowledged=body.acknowledged!==false;
  const result=await prisma.tachographViolation.updateMany({where:{id:{in:ids}},data:{acknowledgedAt:acknowledged?new Date():null}});
  return NextResponse.json({updated:result.count,acknowledged});
}
