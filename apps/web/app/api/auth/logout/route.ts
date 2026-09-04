import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionCookieSecure } from '@/lib/auth-token';
import { audit } from '@/lib/audit';

export async function POST(request:NextRequest){
  await audit(request,'LOGOUT','Session');
  const response=NextResponse.json({ok:true});
  response.cookies.set(SESSION_COOKIE,'',{httpOnly:true,secure:sessionCookieSecure(),sameSite:'lax',path:'/',maxAge:0});
  return response;
}
