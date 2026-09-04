import { AuditAction, prisma } from '@lts/db';
import type { NextRequest } from 'next/server';

export async function audit(request:NextRequest,action:AuditAction,entity:string,entityId?:string|null,details?:unknown){
  const userId=request.headers.get('x-lts-user-id');
  const machine=request.headers.get('x-lts-machine');
  const baseDetails=details&&typeof details==='object'&&!Array.isArray(details)?details as Record<string,unknown>:details===undefined?undefined:{value:details};
  const auditDetails=machine?{...(baseDetails??{}),actor:{type:'machine',name:machine}}:baseDetails;
  try{
    await prisma.auditLog.create({
      data:{
        userId:userId||null,
        action,
        entity,
        entityId:entityId||null,
        details:auditDetails,
      },
    });
  }catch(error){
    console.error('Audit log failed',error);
  }
}
