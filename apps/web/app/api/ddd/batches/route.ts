import { createHash } from 'node:crypto';
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
function normalizeCard(value:unknown){
  const card=String(value??'').trim().toUpperCase().replace(/\s+/g,'');
  return card||null;
}
function fingerprint(source:string,row:{
  sourceId:string|null;driverCardNumber:string|null;plate:string|null;type:string;code:string|null;
  startsAt:Date;endsAt:Date|null;durationMinutes:number|null;
}){
  const identity=row.sourceId
    ?[source,'sourceId',row.sourceId]
    :[source,row.driverCardNumber,row.plate,row.type,row.code,row.startsAt.toISOString(),row.endsAt?.toISOString()??null,row.durationMinutes];
  return createHash('sha256').update(JSON.stringify(identity)).digest('hex');
}

export async function GET(){
  const batches=await prisma.dddAnalysisBatch.findMany({orderBy:{createdAt:'desc'},take:100,include:{_count:{select:{violations:true}}}});
  return NextResponse.json({batches:batches.map(row=>({...row,violationCount:row._count.violations,_count:undefined}))});
}

export async function POST(request:NextRequest){
  try{
    const body=await request.json();
    const source=cleanRequired(body.source,'source');
    const externalId=cleanString(body.externalId);
    const violations=Array.isArray(body.violations)?body.violations:[];
    if(!violations.length)return NextResponse.json({error:'violations array is required'},{status:400});

    if(externalId){
      const existing=await prisma.dddAnalysisBatch.findFirst({where:{source,externalId},include:{_count:{select:{violations:true}}}});
      if(existing){
        return NextResponse.json({
          id:existing.id,
          source:existing.source,
          externalId:existing.externalId,
          violationCount:existing._count.violations,
          duplicateBatch:true,
          imported:0,
          skippedDuplicates:violations.length,
        });
      }
    }

    const allDrivers=await prisma.driver.findMany({
      where:{samsaraId:{not:null},driverCardNumber:{not:null}},
      select:{id:true,driverCardNumber:true},
    });
    const driverByCard=new Map(allDrivers.flatMap(row=>{
      const card=normalizeCard(row.driverCardNumber);
      return card?[[card,row.id] as const]:[];
    }));

    const plates=[...new Set(violations.map((row:any)=>normalizePlate(row.plate)).filter(Boolean))] as string[];
    const vehicles=plates.length?await prisma.vehicle.findMany({
      where:{OR:[{plate:{in:plates}},{plateAliases:{hasSome:plates}}]},
      select:{id:true,plate:true,plateAliases:true},
    }):[];
    const vehicleByPlate=new Map<string,string>();
    for(const vehicle of vehicles){
      vehicleByPlate.set(vehicle.plate.toUpperCase(),vehicle.id);
      for(const alias of vehicle.plateAliases)vehicleByPlate.set(alias.toUpperCase(),vehicle.id);
    }

    let matchedDrivers=0,unmatchedDrivers=0,matchedVehicles=0,unmatchedVehicles=0;
    const prepared=violations.map((row:any)=>{
      const card=normalizeCard(row.driverCardNumber);
      const plate=normalizePlate(row.plate);
      const startsAt=parseDate(row.startsAt);
      if(!startsAt)throw new Error('Every violation requires startsAt');
      const driverId=card?driverByCard.get(card)??null:null;
      const vehicleId=plate?vehicleByPlate.get(plate.toUpperCase())??null:null;
      if(driverId)matchedDrivers+=1;else unmatchedDrivers+=1;
      if(vehicleId)matchedVehicles+=1;else if(plate)unmatchedVehicles+=1;

      const normalized={
        sourceId:cleanString(row.sourceId),
        driverCardNumber:card,
        plate,
        type:cleanRequired(row.type,'type'),
        code:cleanString(row.code),
        startsAt,
        endsAt:parseDate(row.endsAt),
        durationMinutes:parseInteger(row.durationMinutes),
      };
      return{
        ...normalized,
        driverId,
        vehicleId,
        legalReference:cleanString(row.legalReference),
        severity:cleanString(row.severity),
        description:cleanString(row.description),
        raw:row.raw??undefined,
        fingerprint:fingerprint(source,normalized),
      };
    });

    const batch=await prisma.dddAnalysisBatch.create({data:{
      source,
      periodStart:parseDate(body.periodStart),
      periodEnd:parseDate(body.periodEnd),
      status:cleanString(body.status)||'IMPORTED',
      externalId,
      raw:body.raw??undefined,
    }});

    const result=await prisma.tachographViolation.createMany({
      data:prepared.map(row=>({...row,batchId:batch.id})) as any[],
      skipDuplicates:true,
    });

    const skippedDuplicates=prepared.length-result.count;
    if(result.count===0){
      await prisma.dddAnalysisBatch.delete({where:{id:batch.id}});
      return NextResponse.json({
        duplicateBatch:true,
        imported:0,
        skippedDuplicates,
        matchedDrivers,
        unmatchedDrivers,
        matchedVehicles,
        unmatchedVehicles,
      });
    }

    await audit(request,'CREATE','DddAnalysisBatch',batch.id,{
      source:batch.source,
      imported:result.count,
      skippedDuplicates,
      matchedDrivers,
      unmatchedDrivers,
      matchedVehicles,
      unmatchedVehicles,
      externalId:batch.externalId,
    });

    return NextResponse.json({
      ...batch,
      violationCount:result.count,
      imported:result.count,
      skippedDuplicates,
      matchedDrivers,
      unmatchedDrivers,
      matchedVehicles,
      unmatchedVehicles,
    },{status:201});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:'DDD batch could not be imported'},{status:400});
  }
}
