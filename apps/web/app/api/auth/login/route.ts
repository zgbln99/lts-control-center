import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@lts/db';
import { createSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS, sessionCookieSecure } from '@/lib/auth-token';

export async function POST(request:NextRequest){
  let body:any;try{body=await request.json()}catch{return NextResponse.json({error:'Invalid request'},{status:400})}
  const email=String(body?.email??'').trim().toLowerCase();const password=String(body?.password??'');if(!email||!password)return NextResponse.json({error:'E-Mail und Passwort erforderlich.'},{status:400});
  const user=await prisma.user.findUnique({where:{email}});if(!user||!user.active)return NextResponse.json({error:'Ungültige Zugangsdaten.'},{status:401});const valid=await bcrypt.compare(password,user.passwordHash);if(!valid)return NextResponse.json({error:'Ungültige Zugangsdaten.'},{status:401});
  const token=await createSessionToken({sub:user.id,email:user.email,name:user.name,role:user.role});
  await prisma.$transaction([prisma.user.update({where:{id:user.id},data:{lastLoginAt:new Date()}}),prisma.auditLog.create({data:{userId:user.id,action:'LOGIN',entity:'Session',details:{email:user.email}}})]);
  const response=NextResponse.json({ok:true,user:{id:user.id,email:user.email,name:user.name,role:user.role}});response.cookies.set(SESSION_COOKIE,token,{httpOnly:true,secure:sessionCookieSecure(),sameSite:'lax',path:'/',maxAge:SESSION_TTL_SECONDS});return response;
}
