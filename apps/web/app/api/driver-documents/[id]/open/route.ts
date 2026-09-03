import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '@lts/db';
import { getS4Bucket, getS4Client } from '@/lib/s4';

export async function GET(_:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const document=await prisma.driverDocument.findUnique({where:{id},select:{filename:true,storageKey:true,source:true}});
  if(!document)return NextResponse.json({error:'Dokument nicht gefunden.'},{status:404});
  if(document.source!=='MEGA_S4')return NextResponse.json({error:'Dokument ist nicht über MEGA S4 verfügbar.'},{status:400});
  const command=new GetObjectCommand({Bucket:getS4Bucket(),Key:document.storageKey,ResponseContentDisposition:`inline; filename*=UTF-8''${encodeURIComponent(document.filename)}`});
  const url=await getSignedUrl(getS4Client(),command,{expiresIn:300});
  return NextResponse.json({url,expiresIn:300});
}
