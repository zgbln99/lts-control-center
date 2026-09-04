import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from './lib/auth-token';

const PUBLIC_PATHS=['/login','/api/auth/login','/api/health'];
const WRITE_METHODS=new Set(['POST','PUT','PATCH','DELETE']);
type Role='ADMIN'|'FUHRPARK'|'PERSONAL'|'DISPOSITION'|'READ_ONLY';
function hasRole(role:string,allowed:Role[]){return allowed.includes(role as Role)}
function hasDddMachineToken(request:NextRequest){const expected=process.env.DDD_ANALYZER_API_TOKEN?.trim();if(!expected)return false;const auth=request.headers.get('authorization')?.trim()??'';const bearer=auth.toLowerCase().startsWith('bearer ')?auth.slice(7).trim():'';const apiKey=request.headers.get('x-api-key')?.trim()??'';const supplied=bearer||apiKey;return Boolean(supplied)&&supplied===expected}

function requiredPageRoles(pathname:string):Role[]|null{
  if(pathname.startsWith('/settings')) return ['ADMIN'];
  if(pathname.startsWith('/fahrer/verstoesse')) return ['ADMIN','FUHRPARK','PERSONAL','DISPOSITION'];
  if(pathname.startsWith('/fahrer')) return ['ADMIN','PERSONAL','DISPOSITION'];
  if(pathname.startsWith('/kommunikation')) return ['ADMIN','DISPOSITION'];
  if(pathname.startsWith('/fuhrpark/werkstatt')) return ['ADMIN','FUHRPARK'];
  if(pathname.startsWith('/berichte')) return ['ADMIN','FUHRPARK','READ_ONLY'];
  return null;
}

function requiredApiRoles(pathname:string,method:string):Role[]|null{
  const write=WRITE_METHODS.has(method);
  if(pathname.startsWith('/api/users')||pathname.startsWith('/api/settings')||pathname.startsWith('/api/audit')) return ['ADMIN'];
  if(pathname.startsWith('/api/ddd')) return ['ADMIN','FUHRPARK','PERSONAL','DISPOSITION'];
  if(pathname.startsWith('/api/driver-documents')) return ['ADMIN','PERSONAL','DISPOSITION'];
  if(pathname.startsWith('/api/drivers')) return write?['ADMIN','PERSONAL']:['ADMIN','PERSONAL','DISPOSITION'];
  if(pathname.startsWith('/api/workshop')) return ['ADMIN','FUHRPARK'];
  if(pathname.startsWith('/api/message-templates')||pathname.startsWith('/api/automations')||pathname.startsWith('/api/integrations/chatwoot')||pathname.startsWith('/api/integrations/meta')) return ['ADMIN','DISPOSITION'];
  if(pathname.startsWith('/api/document-templates')) return write?['ADMIN','PERSONAL','FUHRPARK']:['ADMIN','PERSONAL','FUHRPARK','DISPOSITION','READ_ONLY'];
  if(pathname.startsWith('/api/costs')) return write?['ADMIN','FUHRPARK']:['ADMIN','FUHRPARK','READ_ONLY'];
  if(pathname.startsWith('/api/reports')) return ['ADMIN','FUHRPARK','READ_ONLY'];
  if(write&&(pathname.startsWith('/api/vehicles')||pathname.startsWith('/api/deadlines')||pathname.startsWith('/api/documents')||pathname.startsWith('/api/integrations/samsara')||pathname.startsWith('/api/integrations/mega'))) return ['ADMIN','FUHRPARK'];
  return null;
}

export async function middleware(request:NextRequest){
  const {pathname}=request.nextUrl;
  if(pathname==='/api/ddd/batches'&&request.method==='POST'&&hasDddMachineToken(request)){const headers=new Headers(request.headers);headers.set('x-lts-machine','ddd-analyzer');return NextResponse.next({request:{headers}})}
  if(PUBLIC_PATHS.includes(pathname)||pathname.startsWith('/_next/')||pathname==='/favicon.ico') return NextResponse.next();
  const token=request.cookies.get(SESSION_COOKIE)?.value;
  if(!token){if(pathname.startsWith('/api/'))return NextResponse.json({error:'Unauthorized'},{status:401});const login=new URL('/login',request.url);login.searchParams.set('next',`${pathname}${request.nextUrl.search}`);return NextResponse.redirect(login)}
  try{
    const session=await verifySessionToken(token);const required=pathname.startsWith('/api/')?requiredApiRoles(pathname,request.method):requiredPageRoles(pathname);
    if(required&&!hasRole(session.role,required)){if(pathname.startsWith('/api/'))return NextResponse.json({error:'Forbidden'},{status:403});return NextResponse.redirect(new URL('/dashboard?forbidden=1',request.url))}
    const headers=new Headers(request.headers);headers.set('x-lts-user-id',session.sub);headers.set('x-lts-user-role',session.role);return NextResponse.next({request:{headers}});
  }catch{if(pathname.startsWith('/api/'))return NextResponse.json({error:'Unauthorized'},{status:401});const login=new URL('/login',request.url);login.searchParams.set('next',`${pathname}${request.nextUrl.search}`);return NextResponse.redirect(login)}
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
