import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@lts/db';
import { getS4Bucket, getS4Client } from '@/lib/s4';
import { audit } from '@/lib/audit';
import { parseDate } from '@/lib/input';

export const runtime='nodejs';
const MAX_FILE_SIZE=30*1024*1024;
function safe(value:string){return value.trim().replace(/[\\/:*?"<>|]/g,'_').replace(/\s+/g,' ')}

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const driver=await prisma.driver.findUnique({where:{id},select:{id:true,personnelNumber:true,firstName:true,lastName:true}});
  if(!driver)return NextResponse.json({error:'Fahrer nicht gefunden.'},{status:404});
  const form=await request.formData();const file=form.get('file');if(!(file instanceof File))return NextResponse.json({error:'Keine Datei übergeben.'},{status:400});if(file.size<=0)return NextResponse.json({error:'Datei ist leer.'},{status:400});if(file.size>MAX_FILE_SIZE)return NextResponse.json({error:'Datei ist größer als 30 MB.'},{status:413});
  const type=String(form.get('type')??'SONSTIGE').trim().toUpperCase()||'SONSTIGE';const expiresAt=parseDate(form.get('expiresAt'));
  const root=String(process.env.MEGA_S4_DRIVER_PREFIX??'fahrer').replace(/^\/+|\/+$/g,'');const identity=safe(driver.personnelNumber||`${driver.lastName}_${driver.firstName}`);const filename=safe(file.name||'document');const key=`${root}/${identity}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${filename}`;const bytes=Buffer.from(await file.arrayBuffer());
  try{await getS4Client().send(new PutObjectCommand({Bucket:getS4Bucket(),Key:key,Body:bytes,ContentType:file.type||'application/octet-stream',Metadata:{driverId:driver.id,personnelNumber:driver.personnelNumber||''}}))}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'MEGA S4 Upload fehlgeschlagen.'},{status:503})}
  const document=await prisma.driverDocument.create({data:{driverId:driver.id,type,filename,storageKey:key,mimeType:file.type||'application/octet-stream',sizeBytes:BigInt(file.size),expiresAt,source:'MEGA_S4'}});
  await audit(request,'UPLOAD','DriverDocument',document.id,{driverId:driver.id,type,filename});
  return NextResponse.json({...document,sizeBytes:document.sizeBytes?.toString()??null},{status:201});
}
