import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';

export async function GET(request:NextRequest){const take=Math.min(250,Math.max(25,Number(request.nextUrl.searchParams.get('take')||100)));const logs=await prisma.auditLog.findMany({take,orderBy:{createdAt:'desc'},include:{user:{select:{name:true,email:true}}}});return NextResponse.json({logs})}
