import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';
import { audit } from '@/lib/audit';
import { cleanRequired, cleanString, parseDate, parseInteger } from '@/lib/input';

function normalizePlate(value:unknown){
  const raw=String(value??'').toUpperCase().trim().replace(/\s+/g,' ').replace(/\s*-\s*/g,'-');
  if(!raw)return null;
  const compact=raw.replace(/-/g,' ');
  const match=compact.match(/^([A-ZÄÖÜ]{1,3})\s+([A-ZÄÖÜ]{1,2})\s*([0-9]+[A-Z]?)$/);
  return match?`${match[1]}-${match[2]} ${match[3]}`:raw;
}

export async function GET(){
  const batches=await prisma.dddAnalysisBatch.findMany({orderBy:{createdAt:'desc'},take:100,include:{_count:{select:{violations:true}}}});
  return NextResponse.json({batches:batches.map(row=>({...row,violationCount:row._count.violations,_count:undefined}))});
}

export async function POST(request:NextRequest){
  try{
    const body=await request.json();
    const violations=Array.isArray(body.violations)?body.violations:[];
    if(!violations.length) return NextResponse.json({error:'violations array is required'},{status:400});

    const cardNumbers=[...new Set(violations.map((row:any)=>cleanString(row.driverCardNumber)).filter(Boolean))] as string[];
    const plates=[...new Set(violations.map((row:any)=>normalizePlate(row.plate)).filter(Boolean))] as string[];
    const [drivers,vehicles]=await Promise.all([
      prisma.driver.findMany({where:{driverCardNumber:{in:cardNumbers}},select:{id:true,driverCardNumber:true}}),
      prisma.vehicle.findMany({where:{OR:[{plate:{in:plates}},{plateAliases:{hasSome:plates}}]},select:{id:true,plate:true,plateAliases:true}}),
    ]);
    const driverByCard=new Map(drivers.filter(row=>row.driverCardNumber).map(row=>[row.driverCardNumber!,row.id]));
    const vehicleByPlate=new Map<string,string>();
    for(const vehicle of vehicles){vehicleByPlate.set(vehicle.plate.toUpperCase(),vehicle.id);for(const alias of vehicle.plateAliases)vehicleByPlate.set(alias.toUpperCase(),vehicle.id)}

    const batch=await prisma.dddAnalysisBatch.create({data:{
      source:cleanRequired(body.source,'source'),periodStart:parseDate(body.periodStart),periodEnd:parseDate(body.periodEnd),status:cleanString(body.status)||'IMPORTED',externalId:cleanString(body.externalId),raw:body.raw??undefined,
    }});

    const rows=violations.map((row:any)=>{
      const card=cleanString(row.driverCardNumber);const plate=normalizePlate(row.plate);const startsAt=parseDate(row.startsAt);if(!startsAt)throw new Error('Every violation requires startsAt');
      return {batchId:batch.id,driverId:cleanString(row.driverId)|| (card?driverByCard.get(card)??null:null),driverCardNumber:card,vehicleId:cleanString(row.vehicleId)||(plate?vehicleByPlate.get(plate.toUpperCase())??null:null),plate,sourceId:cleanString(row.sourceId),code:cleanString(row.code),type:cleanRequired(row.type,'type'),legalReference:cleanString(row.legalReference),severity:cleanString(row.severity),startsAt,endsAt:parseDate(row.endsAt),durationMinutes:parseInteger(row.durationMinutes),description:cleanString(row.description),raw:row.raw??undefined};
    });
    await prisma.tachographViolation.createMany({data:rows as any[]});
    await audit(request,'CREATE','DddAnalysisBatch',batch.id,{source:batch.source,violations:rows.length,externalId:batch.externalId});
    return NextResponse.json({...batch,violationCount:rows.length},{status:201});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'DDD batch could not be imported'},{status:400})}
}
