import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';

export const dynamic='force-dynamic';
async function saveState(status:string,message:string|null){await prisma.integrationState.upsert({where:{key:'CHATWOOT'},create:{key:'CHATWOOT',enabled:true,lastSyncAt:new Date(),lastStatus:status,lastMessage:message},update:{enabled:true,lastSyncAt:new Date(),lastStatus:status,lastMessage:message}}).catch(()=>{})}

export async function GET(request:NextRequest){
  const base=process.env.CHATWOOT_URL?.replace(/\/$/,'');const token=process.env.CHATWOOT_API_TOKEN;const accountId=process.env.CHATWOOT_ACCOUNT_ID;
  if(!base||!token||!accountId)return NextResponse.json({configured:false,conversations:[],error:'Chatwoot ist noch nicht vollständig konfiguriert.'},{status:503});
  const status=request.nextUrl.searchParams.get('status')||'open';const page=request.nextUrl.searchParams.get('page')||'1';const url=new URL(`${base}/api/v1/accounts/${accountId}/conversations`);url.searchParams.set('status',status);url.searchParams.set('page',page);
  try{
    const response=await fetch(url,{headers:{api_access_token:token,Accept:'application/json'},cache:'no-store'});const payload=await response.json().catch(()=>({}));
    if(!response.ok){const message=`Chatwoot ${response.status}`;await saveState('ERROR',message);return NextResponse.json({configured:true,conversations:[],error:message,details:payload},{status:502})}
    const list=payload?.data?.payload??payload?.payload??[];
    const conversations=(Array.isArray(list)?list:[]).map((item:any)=>({id:item.id,status:item.status,unreadCount:item.unread_count??0,lastActivityAt:item.last_activity_at??null,contact:{id:item.meta?.sender?.id??item.contact?.id??null,name:item.meta?.sender?.name??item.contact?.name??'—',phone:item.meta?.sender?.phone_number??item.contact?.phone_number??null},inbox:item.inbox?.name??item.meta?.channel??null,assignee:item.meta?.assignee?.name??null,url:`${base}/app/accounts/${accountId}/conversations/${item.id}`}));
    await saveState('OK',null);return NextResponse.json({configured:true,workspaceUrl:`${base}/app/accounts/${accountId}/inbox`,conversations,meta:payload?.data?.meta??payload?.meta??null});
  }catch(error){const message=error instanceof Error?error.message:'Chatwoot request failed';await saveState('ERROR',message);return NextResponse.json({configured:true,conversations:[],error:message},{status:502})}
}
