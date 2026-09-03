import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';
import { audit } from '@/lib/audit';
import { cleanString, parseBoolean } from '@/lib/input';

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;const body=await request.json();const data:any={};
  for(const key of ['name','language','category','subject','body','metaTemplateName'])if(key in body)data[key]=cleanString(body[key]);
  if('channel' in body)data.channel=cleanString(body.channel)||'WHATSAPP';
  if('active' in body)data.active=parseBoolean(body.active)??true;
  try{const template=await prisma.messageTemplate.update({where:{id},data});await audit(request,'UPDATE','MessageTemplate',id,{fields:Object.keys(data)});return NextResponse.json(template)}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Vorlage konnte nicht gespeichert werden.'},{status:400})}
}
export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}){const {id}=await params;const template=await prisma.messageTemplate.update({where:{id},data:{active:false}});await audit(request,'ARCHIVE','MessageTemplate',id);return NextResponse.json(template)}
