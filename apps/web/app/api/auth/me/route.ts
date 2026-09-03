import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth-token';

export async function GET(request:NextRequest){
  const token=request.cookies.get(SESSION_COOKIE)?.value;
  if(!token) return NextResponse.json({authenticated:false},{status:401});
  try{
    const session=await verifySessionToken(token);
    return NextResponse.json({authenticated:true,user:{id:session.sub,email:session.email,name:session.name,role:session.role}});
  }catch{
    return NextResponse.json({authenticated:false},{status:401});
  }
}
