import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@lts/db';
import { getS4Bucket, getS4Client } from '@/lib/s4';
import { verifyDriverDocumentShare } from '@/lib/driver-document-share';

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
  const expiresAt=Number(request.nextUrl.searchParams.get('expires'));
  const signature=request.nextUrl.searchParams.get('signature')||'';
  if(!verifyDriverDocumentShare(id,expiresAt,signature))return NextResponse.json({error:'Link ist ungültig oder abgelaufen.'},{status:403});

  const document=await prisma.driverDocument.findUnique({where:{id},select:{filename:true,storageKey:true,source:true,mimeType:true}});
  if(!document)return NextResponse.json({error:'Dokument nicht gefunden.'},{status:404});
  if(document.source!=='MEGA_S4')return NextResponse.json({error:'Dokument ist nicht verfügbar.'},{status:400});

  const range=request.headers.get('range')||undefined;
  const object=await getS4Client().send(new GetObjectCommand({Bucket:getS4Bucket(),Key:document.storageKey,Range:range}));
  if(!object.Body)return NextResponse.json({error:'Dokumentinhalt ist leer.'},{status:502});

  const bytes=await object.Body.transformToByteArray();
  const headers=new Headers();
  headers.set('Content-Type',effectiveMime(document.filename,document.mimeType||object.ContentType));
  headers.set('Content-Disposition',`inline; filename*=UTF-8''${dispositionFilename(document.filename)}`);
  headers.set('Accept-Ranges','bytes');
  headers.set('Cache-Control','private, no-store');
  if(object.ContentLength!==undefined)headers.set('Content-Length',String(object.ContentLength));
  if(object.ContentRange)headers.set('Content-Range',object.ContentRange);
  if(object.ETag)headers.set('ETag',object.ETag);
  return new Response(bytes,{status:object.ContentRange?206:200,headers});
}
