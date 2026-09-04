import { createHmac, timingSafeEqual } from 'node:crypto';

function secret(){
  const value=process.env.DOCUMENT_SHARE_SECRET?.trim()||process.env.AUTH_SECRET?.trim();
  if(!value) throw new Error('DOCUMENT_SHARE_SECRET or AUTH_SECRET is not configured');
  return value;
}

export function signDriverDocumentShare(documentId:string,expiresAt:number){
  return createHmac('sha256',secret()).update('driver-document.'+documentId+'.'+String(expiresAt)).digest('base64url');
}

export function verifyDriverDocumentShare(documentId:string,expiresAt:number,signature:string){
  if(!Number.isFinite(expiresAt)||expiresAt<=Date.now()) return false;
  const expected=signDriverDocumentShare(documentId,expiresAt);
  const left=Buffer.from(expected);
  const right=Buffer.from(signature||'');
  return left.length===right.length&&timingSafeEqual(left,right);
}
