import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';
import { audit } from '@/lib/audit';
import { cleanString, parseDate, parseStringArray } from '@/lib/input';

export async function GET(_:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const driver=await prisma.driver.findUnique({where:{id},include:{documents:{orderBy:{createdAt:'desc'}}}});
  if(!driver) return NextResponse.json({error:'Driver not found'},{status:404});
  return NextResponse.json(driver);
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  try{
    const body=await request.json();
    const data:any={};
    for(const key of ['personnelNumber','firstName','lastName','phone','email','language','licenseNumber','driverCardNumber','notes']){
      if(key in body) data[key]=cleanString(body[key]);
    }
    if('status' in body) data.status=cleanString(body.status)||'ACTIVE';
    if('licenseClasses' in body) data.licenseClasses=parseStringArray(body.licenseClasses);
    for(const key of ['employmentStart','employmentEnd','licenseExpiresAt','driverCardExpiresAt','code95ExpiresAt','medicalExpiresAt']){
      if(key in body) data[key]=parseDate(body[key]);
    }
    const driver=await prisma.driver.update({where:{id},data});
    await audit(request,'UPDATE','Driver',id,{fields:Object.keys(data)});
    return NextResponse.json(driver);
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:'Driver could not be updated'},{status:400});
  }
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const driver=await prisma.driver.update({where:{id},data:{status:'LEFT',employmentEnd:new Date()}});
  await audit(request,'ARCHIVE','Driver',id);
  return NextResponse.json(driver);
}
