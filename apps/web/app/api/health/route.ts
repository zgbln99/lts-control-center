import { NextResponse } from 'next/server';
import { prisma } from '@lts/db';

export const dynamic='force-dynamic';

export async function GET(){
  const started=Date.now();
  try{
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({status:'ok',database:'ok',responseMs:Date.now()-started,timestamp:new Date().toISOString()});
  }catch{
    return NextResponse.json({status:'error',database:'error',timestamp:new Date().toISOString()},{status:503});
  }
}
