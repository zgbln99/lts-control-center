import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';
import { audit } from '@/lib/audit';

function prefixFor(folder:string){const root=String(process.env.MEGA_S4_PREFIX??'').replace(/^\/+|\/+$/g,'');return `${root?`${root}/`:''}${folder}/`}

export async function GET(){
  const [state,mappings,vehicles]=await Promise.all([
    prisma.integrationState.findUnique({where:{key:'MEGA_S4'}}),
    prisma.storageFolderMapping.findMany({where:{confirmed:true},orderBy:{createdAt:'desc'},take:200,include:{vehicle:{select:{id:true,plate:true,displayName:true}}}}),
    prisma.vehicle.findMany({where:{lifecycle:'ACTIVE'},orderBy:{plate:'asc'},select:{id:true,plate:true,displayName:true}}),
  ]);
  const publicConfig=(state?.configPublic&&typeof state.configPublic==='object'?state.configPublic:{}) as any;
  return NextResponse.json({unmatched:Array.isArray(publicConfig?.unmatched)?publicConfig.unmatched:[],mappings:mappings.map(row=>({id:row.id,folder:row.originalFolder,normalizedPlate:row.normalizedPlate,storagePrefix:row.storagePrefix,vehicle:row.vehicle})),vehicles});
}

export async function POST(request:NextRequest){
  const body=await request.json().catch(()=>({}));const folder=String(body?.folder??'').trim();const vehicleId=String(body?.vehicleId??'').trim();const normalizedPlate=String(body?.normalizedPlate??'').trim()||null;
  if(!folder||!vehicleId)return NextResponse.json({error:'Folder und Fahrzeug sind erforderlich.'},{status:400});
  if(folder.includes('/')||folder.includes('\\'))return NextResponse.json({error:'Ungültiger Ordnername.'},{status:400});
  const vehicle=await prisma.vehicle.findUnique({where:{id:vehicleId},select:{id:true,plate:true}});if(!vehicle)return NextResponse.json({error:'Fahrzeug nicht gefunden.'},{status:404});
  const storagePrefix=prefixFor(folder);
  const existing=await prisma.storageFolderMapping.findUnique({where:{originalFolder:folder},select:{vehicleId:true}});
  const operations:any[]=[
    prisma.storageFolderMapping.upsert({where:{originalFolder:folder},create:{vehicleId:vehicle.id,originalFolder:folder,storagePrefix,normalizedPlate,confidence:1,confirmed:true},update:{vehicleId:vehicle.id,storagePrefix,normalizedPlate,confidence:1,confirmed:true}}),
    prisma.vehicle.update({where:{id:vehicle.id},data:{storagePrefix}}),
    prisma.vehicleDocument.updateMany({where:{storageKey:{startsWith:storagePrefix}},data:{vehicleId:vehicle.id}}),
  ];
  if(existing?.vehicleId&&existing.vehicleId!==vehicle.id)operations.push(prisma.vehicle.updateMany({where:{id:existing.vehicleId,storagePrefix},data:{storagePrefix:null}}));
  const [mapping]=await prisma.$transaction(operations);
  const state=await prisma.integrationState.findUnique({where:{key:'MEGA_S4'}});const publicConfig=(state?.configPublic&&typeof state.configPublic==='object'?state.configPublic:{}) as any;const unmatched=Array.isArray(publicConfig?.unmatched)?publicConfig.unmatched.filter((row:any)=>row?.folder!==folder):[];
  await prisma.integrationState.upsert({where:{key:'MEGA_S4'},create:{key:'MEGA_S4',enabled:true,configPublic:{...publicConfig,unmatched}},update:{configPublic:{...publicConfig,unmatched}}});
  await audit(request,'UPDATE','StorageFolderMapping',mapping.id,{folder,vehicleId:vehicle.id,plate:vehicle.plate});
  return NextResponse.json({ok:true,mapping:{id:mapping.id,folder,vehicle:{id:vehicle.id,plate:vehicle.plate},storagePrefix}});
}
