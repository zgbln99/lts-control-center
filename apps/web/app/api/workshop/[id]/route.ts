import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';
import { audit } from '@/lib/audit';
import { cleanString, parseDate, parseDecimal, parseInteger } from '@/lib/input';

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  try{
    const body=await request.json();
    const data:any={};
    if(body.plate){const vehicle=await prisma.vehicle.findUnique({where:{plate:String(body.plate).trim().toUpperCase()}});if(!vehicle)return NextResponse.json({error:'Fahrzeug nicht gefunden.'},{status:400});data.vehicleId=vehicle.id}
    for(const key of ['title','description','workshop','invoiceNumber','notes']) if(key in body)data[key]=cleanString(body[key]);
    for(const key of ['plannedAt','dueAt','completedAt']) if(key in body)data[key]=parseDate(body[key]);
    if('cost' in body)data.cost=parseDecimal(body.cost);
    if('mileageKm' in body)data.mileageKm=parseInteger(body.mileageKm);
    if('status' in body){data.status=cleanString(body.status)||'OPEN';if(data.status==='DONE'&&!('completedAt' in body))data.completedAt=new Date()}
    if('priority' in body)data.priority=cleanString(body.priority)||'NORMAL';
    const order=await prisma.workshopOrder.update({where:{id},data,include:{vehicle:{select:{plate:true,displayName:true}}}});
    await audit(request,'UPDATE','WorkshopOrder',id,{fields:Object.keys(data)});
    return NextResponse.json({...order,cost:order.cost?.toString()??null});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Werkstattauftrag konnte nicht gespeichert werden.'},{status:400})}
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const order=await prisma.workshopOrder.update({where:{id},data:{status:'CANCELLED'}});
  await audit(request,'ARCHIVE','WorkshopOrder',id);
  return NextResponse.json(order);
}
