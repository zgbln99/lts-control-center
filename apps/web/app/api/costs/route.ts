import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';
import { audit } from '@/lib/audit';
import { cleanRequired, cleanString, parseDate, parseDecimal } from '@/lib/input';

export async function GET(request:NextRequest){
 const from=request.nextUrl.searchParams.get('from');const to=request.nextUrl.searchParams.get('to');
 const costs=await prisma.costEntry.findMany({where:{...(from||to?{date:{...(from?{gte:new Date(from)}:{}),...(to?{lte:new Date(to)}:{})}}:{})},include:{vehicle:{select:{plate:true,displayName:true}},driver:{select:{firstName:true,lastName:true,personnelNumber:true}}},orderBy:{date:'desc'}});
 return NextResponse.json({costs:costs.map(row=>({...row,amount:row.amount.toString()}))});
}
export async function POST(request:NextRequest){
 try{const body=await request.json();let vehicleId=cleanString(body.vehicleId);let driverId=cleanString(body.driverId);if(!vehicleId&&body.plate){const vehicle=await prisma.vehicle.findUnique({where:{plate:String(body.plate).trim().toUpperCase()}});if(!vehicle)return NextResponse.json({error:'Fahrzeug nicht gefunden.'},{status:400});vehicleId=vehicle.id}if(!driverId&&body.personnelNumber){const driver=await prisma.driver.findUnique({where:{personnelNumber:String(body.personnelNumber).trim()}});if(!driver)return NextResponse.json({error:'Fahrer nicht gefunden.'},{status:400});driverId=driver.id}const amount=parseDecimal(body.amount);if(amount===null)throw new Error('amount is required');const item=await prisma.costEntry.create({data:{vehicleId,driverId,date:parseDate(body.date)||new Date(),category:cleanRequired(body.category,'category') as never,amount,currency:cleanString(body.currency)||'EUR',vendor:cleanString(body.vendor),invoiceNumber:cleanString(body.invoiceNumber),description:cleanString(body.description),source:cleanString(body.source)}});await audit(request,'CREATE','CostEntry',item.id,{category:item.category,amount:item.amount.toString()});return NextResponse.json({...item,amount:item.amount.toString()},{status:201})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Kostenposition konnte nicht angelegt werden.'},{status:400})}
}
