import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE='lts_control_session';
export const SESSION_TTL_SECONDS=60*60*12;

export type SessionPayload={
  sub:string;
  email:string;
  name:string;
  role:string;
};

function secret(){
  const value=process.env.AUTH_SECRET;
  if(!value||value.length<32) throw new Error('AUTH_SECRET must contain at least 32 characters');
  return new TextEncoder().encode(value);
}

export async function createSessionToken(payload:SessionPayload){
  return new SignJWT({email:payload.email,name:payload.name,role:payload.role})
    .setProtectedHeader({alg:'HS256'})
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifySessionToken(token:string){
  const verified=await jwtVerify(token,secret(),{algorithms:['HS256']});
  const sub=verified.payload.sub;
  const email=verified.payload.email;
  const name=verified.payload.name;
  const role=verified.payload.role;
  if(!sub||typeof email!=='string'||typeof name!=='string'||typeof role!=='string') throw new Error('Invalid session payload');
  return {sub,email,name,role} satisfies SessionPayload;
}
