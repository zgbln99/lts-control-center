import { NextRequest, NextResponse } from 'next/server';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '@lts/db';
import { getS4Bucket, getS4Client } from '@/lib/s4';
import { audit } from '@/lib/audit';

export const runtime='nodejs';

const MAX_PHOTO_SIZE=15*1024*1024;
const ALLOWED_TYPES=new Set(['image/jpeg','image/png','image/webp']);

function safeFilename(value:string){
  return value.trim().replace(/[\\/:*?"<>|]/g,'_').replace(/\s+/g,' ');
}

export async function GET(_:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const photo=await prisma.vehicleDocument.findFirst({
    where:{vehicleId:id,type:'FAHRZEUGFOTO',source:'MEGA_S4'},
    orderBy:{createdAt:'desc'},
    select:{filename:true,storageKey:true,mimeType:true},
  });
  if(!photo) return NextResponse.json({error:'Vehicle photo not found'},{status:404});
  const command=new GetObjectCommand({
    Bucket:getS4Bucket(),
    Key:photo.storageKey,
    ResponseContentType:photo.mimeType||'image/jpeg',
    ResponseContentDisposition:`inline; filename*=UTF-8''${encodeURIComponent(photo.filename)}`,
  });
  const url=await getSignedUrl(getS4Client(),command,{expiresIn:300});
  const response=NextResponse.redirect(url,302);
  response.headers.set('Cache-Control','no-store');
  return response;
}

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const vehicle=await prisma.vehicle.findUnique({where:{id},select:{id:true,plate:true}});
  if(!vehicle) return NextResponse.json({error:'Vehicle not found'},{status:404});

  const form=await request.formData();
  const file=form.get('file');
  if(!(file instanceof File)) return NextResponse.json({error:'No photo supplied'},{status:400});
  if(file.size<=0) return NextResponse.json({error:'Photo is empty'},{status:400});
  if(file.size>MAX_PHOTO_SIZE) return NextResponse.json({error:'Photo is larger than 15 MB'},{status:413});
  if(!ALLOWED_TYPES.has(file.type)) return NextResponse.json({error:'Only JPG, PNG and WEBP are allowed'},{status:415});

  const filename=safeFilename(file.name||'vehicle-photo.jpg');
  const storageKey=`_control/vehicle-photos/${vehicle.id}/${Date.now()}-${filename}`;
  const bytes=Buffer.from(await file.arrayBuffer());

  await getS4Client().send(new PutObjectCommand({
    Bucket:getS4Bucket(),
    Key:storageKey,
    Body:bytes,
    ContentType:file.type,
    Metadata:{vehicleId:vehicle.id,plate:vehicle.plate,kind:'vehicle-photo'},
  }));

  const previous=await prisma.vehicleDocument.findMany({
    where:{vehicleId:vehicle.id,type:'FAHRZEUGFOTO'},
    select:{id:true,storageKey:true,source:true},
  });

  const created=await prisma.vehicleDocument.create({
    data:{
      vehicleId:vehicle.id,
      type:'FAHRZEUGFOTO',
      filename,
      storageKey,
      mimeType:file.type,
      sizeBytes:BigInt(file.size),
      source:'MEGA_S4',
    },
  });

  for(const old of previous){
    if(old.source==='MEGA_S4'){
      try{await getS4Client().send(new DeleteObjectCommand({Bucket:getS4Bucket(),Key:old.storageKey}))}catch(error){console.error('Could not delete previous vehicle photo',error)}
    }
  }
  if(previous.length) await prisma.vehicleDocument.deleteMany({where:{id:{in:previous.map(row=>row.id)}}});

  await audit(request,'UPLOAD','VehiclePhoto',vehicle.id,{plate:vehicle.plate,filename,storageKey});
  return NextResponse.json({id:created.id,filename:created.filename},{status:201});
}
