import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';
import { audit } from '@/lib/audit';
import { cleanRequired, cleanString, parseDate, parseDecimal, parseInteger } from '@/lib/input';

async function resolveVehicle(body:any){
  if(body.vehicleId) return prisma.vehicle.findUnique({where:{id:String(body.vehicleId)}});
  const plate=cleanString(body.plate);
  return plate?prisma.vehicle.findUnique({where:{plate:plate.toUpperCase()}}):null;
}

export async function GET(request:NextRequest){
  const status=request.nextUrl.searchParams.get('status');
  const orders=await prisma.workshopOrder.findMany({
    where:status&&status!=='ALL'?{status:status as never}:undefined,
    include:{vehicle:{select:{plate:true,displayName:true,manufacturer:true,model:true}}},
    orderBy:[{status:'asc'},{priority:'desc'},{dueAt:'asc'},{createdAt:'desc'}],
  });
  return NextResponse.json({orders:orders.map(row=>({...row,cost:row.cost?.toString()??null}))});
}

export async function POST(request:NextRequest){
  try{
    const body=await request.json();
    const vehicle=await resolveVehicle(body);
    if(!vehicle) return NextResponse.json({error:'Fahrzeug nicht gefunden.'},{status:400});
    const order=await prisma.workshopOrder.create({data:{
      vehicleId:vehicle.id,title:cleanRequired(body.title,'title'),description:cleanString(body.description),
      status:(cleanString(body.status)||'OPEN') as never,priority:(cleanString(body.priority)||'NORMAL') as never,
      workshop:cleanString(body.workshop),plannedAt:parseDate(body.plannedAt),dueAt:parseDate(body.dueAt),
      cost:parseDecimal(body.cost),mileageKm:parseInteger(body.mileageKm),invoiceNumber:cleanString(body.invoiceNumber),notes:cleanString(body.notes),
    },include:{vehicle:{select:{plate:true}}}});
    await audit(request,'CREATE','WorkshopOrder',order.id,{plate:order.vehicle.plate,title:order.title});
    return NextResponse.json({...order,cost:order.cost?.toString()??null},{status:201});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Werkstattauftrag konnte nicht angelegt werden.'},{status:400})}
}
