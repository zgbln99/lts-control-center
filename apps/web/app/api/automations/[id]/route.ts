import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';
import { audit } from '@/lib/audit';
import { cleanString, parseBoolean } from '@/lib/input';

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){const {id}=await params;const body=await request.json();const data:any={};for(const key of ['name','description','externalId','triggerType','schedule'])if(key in body)data[key]=cleanString(body[key]);if('provider' in body)data.provider=cleanString(body.provider)||'N8N';if('active' in body)data.active=parseBoolean(body.active)??false;try{const item=await prisma.automationDefinition.update({where:{id},data});await audit(request,'UPDATE','AutomationDefinition',id,{fields:Object.keys(data)});return NextResponse.json(item)}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Automation konnte nicht gespeichert werden.'},{status:400})}}
export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}){const {id}=await params;const item=await prisma.automationDefinition.update({where:{id},data:{active:false}});await audit(request,'ARCHIVE','AutomationDefinition',id);return NextResponse.json(item)}
