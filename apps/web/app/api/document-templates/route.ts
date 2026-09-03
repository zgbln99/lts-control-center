import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';
import { audit } from '@/lib/audit';
import { cleanRequired, cleanString, parseBoolean } from '@/lib/input';

export async function GET(){const templates=await prisma.documentTemplate.findMany({orderBy:[{active:'desc'},{category:'asc'},{name:'asc'}]});return NextResponse.json({templates})}
export async function POST(request:NextRequest){try{const body=await request.json();const item=await prisma.documentTemplate.create({data:{name:cleanRequired(body.name,'name'),category:cleanString(body.category),language:cleanString(body.language)||'de',content:cleanRequired(body.content,'content'),filenamePattern:cleanString(body.filenamePattern),active:parseBoolean(body.active)??true}});await audit(request,'CREATE','DocumentTemplate',item.id,{name:item.name});return NextResponse.json(item,{status:201})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Dokumentvorlage konnte nicht angelegt werden.'},{status:400})}}
