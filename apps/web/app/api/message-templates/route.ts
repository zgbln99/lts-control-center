import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';
import { audit } from '@/lib/audit';
import { cleanRequired, cleanString, parseBoolean } from '@/lib/input';

export async function GET(){
  const templates=await prisma.messageTemplate.findMany({orderBy:[{active:'desc'},{channel:'asc'},{name:'asc'}]});
  return NextResponse.json({templates});
}

export async function POST(request:NextRequest){
  try{
    const body=await request.json();
    const template=await prisma.messageTemplate.create({data:{
      name:cleanRequired(body.name,'name'),channel:(cleanString(body.channel)||'WHATSAPP') as never,language:cleanString(body.language)||'de',
      category:cleanString(body.category),subject:cleanString(body.subject),body:cleanRequired(body.body,'body'),metaTemplateName:cleanString(body.metaTemplateName),
      active:parseBoolean(body.active)??true,
    }});
    await audit(request,'CREATE','MessageTemplate',template.id,{name:template.name,channel:template.channel});
    return NextResponse.json(template,{status:201});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Vorlage konnte nicht angelegt werden.'},{status:400})}
}
