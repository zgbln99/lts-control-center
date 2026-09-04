import { createHmac, timingSafeEqual } from 'node:crypto';

function secret(){
  const value=process.env.DOCUMENT_SHARE_SECRET?.trim()||process.env.AUTH_SECRET?.trim();
  if(!value) throw new Error('DOCUMENT_SHARE_SECRET or AUTH_SECRET is not configured');
  return value;
}

export function signDocumentShare(documentId:string,expiresAt:number){
  return createHmac('sha256',secret()).update(documentId+'.'+String(expiresAt)).digest('base64url');
}

export function verifyDocumentShare(documentId:string,expiresAt:number,signature:string){
  if(!Number.isFinite(expiresAt)||expiresAt<=Date.now()) return false;
  const expected=signDocumentShare(documentId,expiresAt);
  const left=Buffer.from(expected);
  const right=Buffer.from(signature||'');
  return left.length===right.length&&timingSafeEqual(left,right);
}
