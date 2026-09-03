import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';
import { audit } from '@/lib/audit';
import { cleanRequired, cleanString, parseDate, parseStringArray } from '@/lib/input';

export async function GET(request:NextRequest){
  const query=request.nextUrl.searchParams.get('q')?.trim();
  const status=request.nextUrl.searchParams.get('status')?.trim();
  const drivers=await prisma.driver.findMany({
    where:{
      ...(status&&status!=='ALL'?{status:status as never}:{}),
      ...(query?{OR:[
        {firstName:{contains:query,mode:'insensitive'}},
        {lastName:{contains:query,mode:'insensitive'}},
        {personnelNumber:{contains:query,mode:'insensitive'}},
        {phone:{contains:query,mode:'insensitive'}},
        {licenseNumber:{contains:query,mode:'insensitive'}},
        {driverCardNumber:{contains:query,mode:'insensitive'}},
      ]}:{}),
    },
    orderBy:[{status:'asc'},{lastName:'asc'},{firstName:'asc'}],
    include:{_count:{select:{documents:true}}},
  });
  return NextResponse.json({drivers:drivers.map(row=>({...row,documentCount:row._count.documents,_count:undefined}))});
}

export async function POST(request:NextRequest){
  try{
    const body=await request.json();
    const driver=await prisma.driver.create({data:{
      personnelNumber:cleanString(body.personnelNumber),
      firstName:cleanRequired(body.firstName,'firstName'),
      lastName:cleanRequired(body.lastName,'lastName'),
      phone:cleanString(body.phone),email:cleanString(body.email),language:cleanString(body.language)||'de',
      status:(cleanString(body.status)||'ACTIVE') as never,
      employmentStart:parseDate(body.employmentStart),employmentEnd:parseDate(body.employmentEnd),
      licenseNumber:cleanString(body.licenseNumber),licenseClasses:parseStringArray(body.licenseClasses),licenseExpiresAt:parseDate(body.licenseExpiresAt),
      driverCardNumber:cleanString(body.driverCardNumber),driverCardExpiresAt:parseDate(body.driverCardExpiresAt),
      code95ExpiresAt:parseDate(body.code95ExpiresAt),medicalExpiresAt:parseDate(body.medicalExpiresAt),notes:cleanString(body.notes),
    }});
    await audit(request,'CREATE','Driver',driver.id,{personnelNumber:driver.personnelNumber});
    return NextResponse.json(driver,{status:201});
  }catch(error){
    const message=error instanceof Error?error.message:'Driver could not be created';
    return NextResponse.json({error:message},{status:400});
  }
}
