import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';
import { audit } from '@/lib/audit';
import { cleanRequired, cleanString, parseBoolean } from '@/lib/input';

export async function GET(){const automations=await prisma.automationDefinition.findMany({orderBy:[{active:'desc'},{name:'asc'}]});return NextResponse.json({automations})}
export async function POST(request:NextRequest){
  try{const body=await request.json();const automation=await prisma.automationDefinition.create({data:{name:cleanRequired(body.name,'name'),description:cleanString(body.description),provider:(cleanString(body.provider)||'N8N') as never,externalId:cleanString(body.externalId),triggerType:cleanString(body.triggerType),schedule:cleanString(body.schedule),active:parseBoolean(body.active)??false}});await audit(request,'CREATE','AutomationDefinition',automation.id,{name:automation.name});return NextResponse.json(automation,{status:201})}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Automation konnte nicht angelegt werden.'},{status:400})}
}
