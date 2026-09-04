import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@lts/db';
import { getS4Bucket, getS4Client } from '@/lib/s4';

export const runtime='nodejs';

function dispositionFilename(filename:string){
  return encodeURIComponent(filename).replace(/['()]/g,escape).replace(/\*/g,'%2A');
}

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const document=await prisma.vehicleDocument.findUnique({
    where:{id},
    select:{id:true,filename:true,storageKey:true,source:true,mimeType:true},
  });
  if(!document) return NextResponse.json({error:'Document not found'},{status:404});
  if(document.source!=='MEGA_S4') return NextResponse.json({error:'Document source is not available through S4'},{status:400});

  const download=request.nextUrl.searchParams.get('download')==='1';
  const range=request.headers.get('range')||undefined;
  const object=await getS4Client().send(new GetObjectCommand({
    Bucket:getS4Bucket(),
    Key:document.storageKey,
    Range:range,
  }));
  if(!object.Body) return NextResponse.json({error:'Document body is empty'},{status:502});

  const bytes=await object.Body.transformToByteArray();
  const headers=new Headers();
  headers.set('Content-Type',document.mimeType||object.ContentType||'application/octet-stream');
  headers.set('Content-Disposition',`${download?'attachment':'inline'}; filename*=UTF-8''${dispositionFilename(document.filename)}`);
  headers.set('Accept-Ranges','bytes');
  headers.set('Cache-Control','private, no-store');
  if(object.ContentLength!==undefined) headers.set('Content-Length',String(object.ContentLength));
  if(object.ContentRange) headers.set('Content-Range',object.ContentRange);
  if(object.ETag) headers.set('ETag',object.ETag);

  return new Response(bytes,{
    status:object.ContentRange?206:200,
    headers,
  });
}
