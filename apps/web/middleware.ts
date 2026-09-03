import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from './lib/auth-token';

const PUBLIC_PATHS=['/login','/api/auth/login','/api/health'];

export async function middleware(request:NextRequest){
  const {pathname}=request.nextUrl;
  if(PUBLIC_PATHS.includes(pathname)||pathname.startsWith('/_next/')||pathname==='/favicon.ico') return NextResponse.next();

  const token=request.cookies.get(SESSION_COOKIE)?.value;
  if(token){
    try{await verifySessionToken(token);return NextResponse.next()}catch{}
  }

  if(pathname.startsWith('/api/')) return NextResponse.json({error:'Unauthorized'},{status:401});
  const login=new URL('/login',request.url);
  login.searchParams.set('next',`${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
