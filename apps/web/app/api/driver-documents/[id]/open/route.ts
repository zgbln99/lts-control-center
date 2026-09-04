import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@lts/db';
import { getS4Bucket, getS4Client } from '@/lib/s4';

export const runtime='nodejs';

function dispositionFilename(filename:string){
  return encodeURIComponent(filename).replace(/['()*]/g,char=>'%'+char.charCodeAt(0).toString(16).toUpperCase());
}
function effectiveMime(filename:string,mimeType:string|null|undefined){
  if(mimeType&&mimeType!=='application/octet-stream') return mimeType;
  const lower=filename.toLowerCase();
  if(lower.endsWith('.pdf')) return 'application/pdf';
  if(lower.endsWith('.jpg')||lower.endsWith('.jpeg')) return 'image/jpeg';
  if(lower.endsWith('.png')) return 'image/png';
  if(lower.endsWith('.webp')) return 'image/webp';
  return mimeType||'application/octet-stream';
}

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const document=await prisma.driverDocument.findUnique({where:{id},select:{filename:true,storageKey:true,source:true,mimeType:true}});
  if(!document)return NextResponse.json({error:'Dokument nicht gefunden.'},{status:404});
  if(document.source!=='MEGA_S4')return NextResponse.json({error:'Dokument ist nicht über MEGA S4 verfügbar.'},{status:400});

  const download=request.nextUrl.searchParams.get('download')==='1';
  const range=request.headers.get('range')||undefined;
  const object=await getS4Client().send(new GetObjectCommand({Bucket:getS4Bucket(),Key:document.storageKey,Range:range}));
  if(!object.Body)return NextResponse.json({error:'Dokumentinhalt ist leer.'},{status:502});

  const bytes=await object.Body.transformToByteArray();
  const headers=new Headers();
  headers.set('Content-Type',effectiveMime(document.filename,document.mimeType||object.ContentType));
  headers.set('Content-Disposition',`${download?'attachment':'inline'}; filename*=UTF-8''${dispositionFilename(document.filename)}`);
  headers.set('Accept-Ranges','bytes');
  headers.set('Cache-Control','private, no-store');
  if(object.ContentLength!==undefined)headers.set('Content-Length',String(object.ContentLength));
  if(object.ContentRange)headers.set('Content-Range',object.ContentRange);
  if(object.ETag)headers.set('ETag',object.ETag);

  return new Response(bytes,{status:object.ContentRange?206:200,headers});
}
