import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@lts/db';
import { audit } from '@/lib/audit';
import { cleanRequired, cleanString, parseBoolean } from '@/lib/input';

export async function GET(){const users=await prisma.user.findMany({select:{id:true,email:true,name:true,role:true,active:true,lastLoginAt:true,createdAt:true,updatedAt:true},orderBy:[{active:'desc'},{name:'asc'}]});return NextResponse.json({users})}
export async function POST(request:NextRequest){try{const body=await request.json();const email=cleanRequired(body.email,'email').toLowerCase();const password=cleanRequired(body.password,'password');if(password.length<10)throw new Error('Passwort muss mindestens 10 Zeichen haben.');const user=await prisma.user.create({data:{email,name:cleanRequired(body.name,'name'),passwordHash:await bcrypt.hash(password,12),role:(cleanString(body.role)||'READ_ONLY') as never,active:parseBoolean(body.active)??true},select:{id:true,email:true,name:true,role:true,active:true,createdAt:true}});await audit(request,'CREATE','User',user.id,{email:user.email,role:user.role});return NextResponse.json(user,{status:201})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Benutzer konnte nicht angelegt werden.'},{status:400})}}
