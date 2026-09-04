import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';
import { audit } from '@/lib/audit';
import { signDriverDocumentShare } from '@/lib/driver-document-share';

export const runtime='nodejs';

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const document=await prisma.driverDocument.findUnique({
    where:{id},
    select:{id:true,filename:true,source:true,driver:{select:{id:true,firstName:true,lastName:true,personnelNumber:true}}},
  });
  if(!document)return NextResponse.json({error:'Dokument nicht gefunden.'},{status:404});
  if(document.source!=='MEGA_S4')return NextResponse.json({error:'Nur MEGA-S4-Dokumente können freigegeben werden.'},{status:400});

  const body=await request.json().catch(()=>({}));
  const requested=Number(body?.expiresInHours??168);
  const expiresInHours=Number.isFinite(requested)?Math.max(1,Math.min(720,Math.round(requested))):168;
  const expiresAt=Date.now()+expiresInHours*60*60*1000;
  const signature=signDriverDocumentShare(document.id,expiresAt);
  const base=(process.env.PUBLIC_APP_URL?.trim()||request.nextUrl.origin).replace(/\/$/,'');
  const url=`${base}/api/public/driver-documents/${document.id}?expires=${expiresAt}&signature=${encodeURIComponent(signature)}`;

  await audit(request,'CREATE','DriverDocumentShare',document.id,{
    driverId:document.driver.id,
    driver:`${document.driver.lastName}, ${document.driver.firstName}`,
    personnelNumber:document.driver.personnelNumber,
    filename:document.filename,
    expiresAt:new Date(expiresAt).toISOString(),
  });
  return NextResponse.json({url,expiresAt:new Date(expiresAt).toISOString(),expiresInHours});
}
