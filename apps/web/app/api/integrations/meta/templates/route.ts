import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';
import { audit } from '@/lib/audit';

export const dynamic='force-dynamic';
function config(){const token=process.env.META_ACCESS_TOKEN;const waba=process.env.META_WABA_ID;const version=process.env.META_GRAPH_API_VERSION||'v23.0';return {token,waba,version}}
async function saveState(status:string,message:string|null){await prisma.integrationState.upsert({where:{key:'META'},create:{key:'META',enabled:true,lastSyncAt:new Date(),lastStatus:status,lastMessage:message},update:{enabled:true,lastSyncAt:new Date(),lastStatus:status,lastMessage:message}}).catch(()=>{})}

export async function GET(){
  const {token,waba,version}=config();if(!token||!waba)return NextResponse.json({configured:false,templates:[],error:'Meta WhatsApp ist noch nicht konfiguriert.'},{status:503});
  const url=new URL(`https://graph.facebook.com/${version}/${waba}/message_templates`);url.searchParams.set('limit','250');
  try{const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});const payload=await response.json().catch(()=>({}));if(!response.ok){await saveState('ERROR',payload?.error?.message||`Meta ${response.status}`);return NextResponse.json({configured:true,templates:[],error:payload?.error?.message||`Meta ${response.status}`},{status:502})}await saveState('OK',null);return NextResponse.json({configured:true,templates:(payload.data??[]).map((row:any)=>({id:row.id,name:row.name,language:row.language,status:row.status,category:row.category,qualityScore:row.quality_score?.score??null,components:row.components??[]}))})}catch(error){const message=error instanceof Error?error.message:'Meta request failed';await saveState('ERROR',message);return NextResponse.json({configured:true,templates:[],error:message},{status:502})}
}

export async function POST(request:NextRequest){
  const {token,waba,version}=config();if(!token||!waba)return NextResponse.json({error:'Meta WhatsApp ist noch nicht konfiguriert.'},{status:503});
  const body=await request.json().catch(()=>({}));
  const name=String(body?.name??'').trim().toLowerCase();const language=String(body?.language??'de').trim();const category=String(body?.category??'UTILITY').trim().toUpperCase();const text=String(body?.body??'').trim();
  if(!/^[a-z0-9_]{1,512}$/.test(name))return NextResponse.json({error:'Template-Name darf nur Kleinbuchstaben, Zahlen und Unterstriche enthalten.'},{status:400});
  if(!language)return NextResponse.json({error:'Sprache ist erforderlich.'},{status:400});
  if(!['UTILITY','MARKETING','AUTHENTICATION'].includes(category))return NextResponse.json({error:'Ungültige Meta-Kategorie.'},{status:400});
  if(!text)return NextResponse.json({error:'Body ist erforderlich.'},{status:400});
  const components=Array.isArray(body?.components)&&body.components.length?body.components:[{type:'BODY',text}];
  try{
    const response=await fetch(`https://graph.facebook.com/${version}/${waba}/message_templates`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({name,language,category,components}),cache:'no-store'});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok){const message=payload?.error?.message||`Meta ${response.status}`;await saveState('ERROR',message);return NextResponse.json({error:message,details:payload?.error??null},{status:502})}
    await saveState('OK',null);await audit(request,'CREATE','MetaTemplate',String(payload.id??name),{name,language,category});
    return NextResponse.json({ok:true,id:payload.id??null,status:payload.status??'PENDING',category:payload.category??category,name,language},{status:201});
  }catch(error){const message=error instanceof Error?error.message:'Meta request failed';await saveState('ERROR',message);return NextResponse.json({error:message},{status:502})}
}
