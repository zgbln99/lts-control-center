import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';

export async function GET(_:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const driver=await prisma.driver.findFirst({where:{id,samsaraId:{not:null}}});
  if(!driver)return NextResponse.json({error:'Driver not found'},{status:404});
  return NextResponse.json(driver);
}

export async function PATCH(){
  return NextResponse.json({error:'Drivers are managed in Samsara and are read-only in Control Center.'},{status:405});
}

export async function DELETE(){
  return NextResponse.json({error:'Driver activation is managed in Samsara.'},{status:405});
}
