import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';
import { audit } from '@/lib/audit';
import { signDocumentShare } from '@/lib/document-share';

export const runtime='nodejs';

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const document=await prisma.vehicleDocument.findUnique({
    where:{id},
    select:{id:true,filename:true,source:true,vehicle:{select:{plate:true}}},
  });
  if(!document) return NextResponse.json({error:'Document not found'},{status:404});
  if(document.source!=='MEGA_S4') return NextResponse.json({error:'Only MEGA S4 documents can be shared'},{status:400});

  const body=await request.json().catch(()=>({}));
  const requested=Number(body?.expiresInHours??168);
  const expiresInHours=Number.isFinite(requested)?Math.max(1,Math.min(720,Math.round(requested))):168;
  const expiresAt=Date.now()+expiresInHours*60*60*1000;
  const signature=signDocumentShare(document.id,expiresAt);
  const base=(process.env.PUBLIC_APP_URL?.trim()||request.nextUrl.origin).replace(/\/$/,'');
  const url=`${base}/api/public/documents/${document.id}?expires=${expiresAt}&signature=${encodeURIComponent(signature)}`;

  await audit(request,'CREATE','DocumentShare',document.id,{filename:document.filename,plate:document.vehicle.plate,expiresAt:new Date(expiresAt).toISOString()});
  return NextResponse.json({url,expiresAt:new Date(expiresAt).toISOString(),expiresInHours});
}
