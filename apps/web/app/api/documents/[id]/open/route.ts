import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '@lts/db';
import { getS4Bucket, getS4Client } from '@/lib/s4';

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const document=await prisma.vehicleDocument.findUnique({
    where:{id},
    select:{id:true,filename:true,storageKey:true,source:true},
  });
  if(!document) return NextResponse.json({error:'Document not found'},{status:404});
  if(document.source!=='MEGA_S4') return NextResponse.json({error:'Document source is not available through S4'},{status:400});

  const download=request.nextUrl.searchParams.get('download')==='1';
  const command=new GetObjectCommand({
    Bucket:getS4Bucket(),
    Key:document.storageKey,
    ResponseContentDisposition:`${download?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(document.filename)}`,
  });
  const url=await getSignedUrl(getS4Client(),command,{expiresIn:300});
  return NextResponse.json({url,expiresIn:300});
}
