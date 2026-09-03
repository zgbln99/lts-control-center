import { AuditAction, prisma } from '@lts/db';
import type { NextRequest } from 'next/server';

export async function audit(request:NextRequest,action:AuditAction,entity:string,entityId?:string|null,details?:unknown){
  const userId=request.headers.get('x-lts-user-id');
  try{
    await prisma.auditLog.create({
      data:{
        userId:userId||null,
        action,
        entity,
        entityId:entityId||null,
        details:details===undefined?undefined:(details as object),
      },
    });
  }catch(error){
    console.error('Audit log failed',error);
  }
}
