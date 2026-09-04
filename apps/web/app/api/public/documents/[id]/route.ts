import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '@lts/db';
import { getS4Bucket, getS4Client } from '@/lib/s4';
import { verifyDocumentShare } from '@/lib/document-share';

export const runtime='nodejs';

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const expiresAt=Number(request.nextUrl.searchParams.get('expires'));
  const signature=request.nextUrl.searchParams.get('signature')||'';
  if(!verifyDocumentShare(id,expiresAt,signature)) return NextResponse.json({error:'Link is invalid or expired'},{status:403});

  const document=await prisma.vehicleDocument.findUnique({
    where:{id},
    select:{filename:true,storageKey:true,source:true,mimeType:true},
  });
  if(!document) return NextResponse.json({error:'Document not found'},{status:404});
  if(document.source!=='MEGA_S4') return NextResponse.json({error:'Document is unavailable'},{status:400});

  const command=new GetObjectCommand({
    Bucket:getS4Bucket(),
    Key:document.storageKey,
    ResponseContentType:document.mimeType||'application/octet-stream',
    ResponseContentDisposition:`inline; filename*=UTF-8''${encodeURIComponent(document.filename)}`,
  });
  const url=await getSignedUrl(getS4Client(),command,{expiresIn:90});
  const response=NextResponse.redirect(url,302);
  response.headers.set('Cache-Control','no-store');
  return response;
}
