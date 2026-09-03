import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@lts/db';
import { getS4Bucket, getS4Client } from '@/lib/s4';

export const runtime='nodejs';

const MAX_FILE_SIZE=30*1024*1024;

function safeFilename(value:string){
  return value.trim().replace(/[\\/:*?"<>|]/g,'_').replace(/\s+/g,' ');
}

function fallbackPrefix(plate:string){
  const root=String(process.env.MEGA_S4_PREFIX ?? '').replace(/^\/+|\/+$/g,'');
  return `${root?`${root}/`:''}${plate}/`;
}

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const vehicle=await prisma.vehicle.findUnique({where:{id},select:{id:true,plate:true,storagePrefix:true}});
  if(!vehicle) return NextResponse.json({error:'Vehicle not found'},{status:404});

  const form=await request.formData();
  const file=form.get('file');
  const type=String(form.get('type') ?? 'SONSTIGE').trim().toUpperCase() || 'SONSTIGE';
  if(!(file instanceof File)) return NextResponse.json({error:'No file supplied'},{status:400});
  if(file.size<=0) return NextResponse.json({error:'File is empty'},{status:400});
  if(file.size>MAX_FILE_SIZE) return NextResponse.json({error:'File is larger than 30 MB'},{status:413});

  const filename=safeFilename(file.name || 'document');
  const prefix=vehicle.storagePrefix || fallbackPrefix(vehicle.plate);
  const unique=`${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const storageKey=`${prefix}${unique}-${filename}`;
  const bytes=Buffer.from(await file.arrayBuffer());

  await getS4Client().send(new PutObjectCommand({
    Bucket:getS4Bucket(),
    Key:storageKey,
    Body:bytes,
    ContentType:file.type || 'application/octet-stream',
    Metadata:{vehicleId:vehicle.id,plate:vehicle.plate},
  }));

  const document=await prisma.vehicleDocument.create({
    data:{
      vehicleId:vehicle.id,
      type,
      filename,
      storageKey,
      mimeType:file.type || 'application/octet-stream',
      sizeBytes:BigInt(file.size),
      source:'MEGA_S4',
    },
  });

  if(!vehicle.storagePrefix){
    await prisma.vehicle.update({where:{id:vehicle.id},data:{storagePrefix:prefix}});
  }

  return NextResponse.json({
    ...document,
    sizeBytes:document.sizeBytes?.toString() ?? null,
  },{status:201});
}
