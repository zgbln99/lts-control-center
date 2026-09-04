import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';

export async function GET(request:NextRequest){
  const query=request.nextUrl.searchParams.get('q')?.trim();
  const status=request.nextUrl.searchParams.get('status')?.trim();
  const drivers=await prisma.driver.findMany({
    where:{
      samsaraId:{not:null},
      ...(status&&status!=='ALL'?{status:status as never}:{}),
      ...(query?{OR:[
        {samsaraName:{contains:query,mode:'insensitive'}},
        {firstName:{contains:query,mode:'insensitive'}},
        {lastName:{contains:query,mode:'insensitive'}},
        {personnelNumber:{contains:query,mode:'insensitive'}},
        {phone:{contains:query,mode:'insensitive'}},
        {email:{contains:query,mode:'insensitive'}},
        {licenseNumber:{contains:query,mode:'insensitive'}},
        {driverCardNumber:{contains:query,mode:'insensitive'}},
      ]}:{}),
    },
    orderBy:[{status:'asc'},{samsaraName:'asc'}],
  });
  return NextResponse.json({drivers});
}

export async function POST(){
  return NextResponse.json({error:'Drivers are managed in Samsara and are read-only in Control Center.'},{status:405});
}
