import { NextResponse } from 'next/server';
import { prisma } from '@lts/db';

export const dynamic='force-dynamic';

export async function GET(){
  const started=Date.now();
  try{
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status:'ok',
      database:'ok',
      integrations:{
        megaS4:Boolean(process.env.MEGA_S4_ENDPOINT&&process.env.MEGA_S4_BUCKET&&process.env.MEGA_S4_ACCESS_KEY),
        samsara:Boolean(process.env.SAMSARA_API_TOKEN),
        chatwoot:Boolean(process.env.CHATWOOT_URL&&process.env.CHATWOOT_API_TOKEN),
        n8n:Boolean(process.env.N8N_WEBHOOK_BASE_URL),
      },
      responseMs:Date.now()-started,
      timestamp:new Date().toISOString(),
    });
  }catch{
    return NextResponse.json({status:'error',database:'error',timestamp:new Date().toISOString()},{status:503});
  }
}
