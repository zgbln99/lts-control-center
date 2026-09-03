import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';

export async function GET(request:NextRequest){
  const q=request.nextUrl.searchParams.get('q')?.trim();
  const documents=await prisma.driverDocument.findMany({
    where:q?{OR:[{filename:{contains:q,mode:'insensitive'}},{type:{contains:q,mode:'insensitive'}},{driver:{OR:[{firstName:{contains:q,mode:'insensitive'}},{lastName:{contains:q,mode:'insensitive'}},{personnelNumber:{contains:q,mode:'insensitive'}},{driverCardNumber:{contains:q,mode:'insensitive'}}]}}]}:undefined,
    include:{driver:{select:{id:true,firstName:true,lastName:true,personnelNumber:true,status:true}}},
    orderBy:{createdAt:'desc'},take:500,
  });
  return NextResponse.json({documents:documents.map(row=>({...row,sizeBytes:row.sizeBytes?.toString()??null}))});
}
