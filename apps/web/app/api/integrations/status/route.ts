import { NextResponse } from 'next/server';
import { prisma } from '@lts/db';

export const dynamic='force-dynamic';

export async function GET(){
  const [vehicleCount,samsaraVehicles,telemetryCount,latestTelemetry,documentCount,latestDocument,folderMappings,states]=await Promise.all([
    prisma.vehicle.count({where:{lifecycle:'ACTIVE'}}),
    prisma.vehicle.count({where:{lifecycle:'ACTIVE',samsaraId:{not:null}}}),
    prisma.vehicleTelemetry.count(),
    prisma.vehicleTelemetry.findFirst({orderBy:{updatedAt:'desc'},select:{updatedAt:true}}),
    prisma.vehicleDocument.count({where:{source:'MEGA_S4'}}),
    prisma.vehicleDocument.findFirst({where:{source:'MEGA_S4'},orderBy:{updatedAt:'desc'},select:{updatedAt:true}}),
    prisma.storageFolderMapping.count(),
    prisma.integrationState.findMany(),
  ]);
  const state=Object.fromEntries(states.map(row=>[row.key,row]));
  return NextResponse.json({generatedAt:new Date().toISOString(),integrations:{
    samsara:{configured:Boolean(process.env.SAMSARA_API_TOKEN),connectedVehicles:samsaraVehicles,activeVehicles:vehicleCount,telemetryRecords:telemetryCount,lastSyncAt:state.SAMSARA?.lastSyncAt?.toISOString()??latestTelemetry?.updatedAt?.toISOString()??null,lastStatus:state.SAMSARA?.lastStatus??null},
    megaS4:{configured:Boolean(process.env.MEGA_S4_ENDPOINT&&process.env.MEGA_S4_BUCKET&&process.env.MEGA_S4_ACCESS_KEY&&process.env.MEGA_S4_SECRET_KEY),documents:documentCount,mappedFolders:folderMappings,lastSyncAt:state.MEGA_S4?.lastSyncAt?.toISOString()??latestDocument?.updatedAt?.toISOString()??null,lastStatus:state.MEGA_S4?.lastStatus??null},
    chatwoot:{configured:Boolean(process.env.CHATWOOT_URL&&process.env.CHATWOOT_ACCOUNT_ID&&process.env.CHATWOOT_API_TOKEN),lastStatus:state.CHATWOOT?.lastStatus??null},
    n8n:{configured:Boolean((process.env.N8N_API_URL&&process.env.N8N_API_KEY)||process.env.N8N_WEBHOOK_BASE_URL),lastStatus:state.N8N?.lastStatus??null},
    meta:{configured:Boolean(process.env.META_WABA_ID&&process.env.META_PHONE_NUMBER_ID&&process.env.META_ACCESS_TOKEN),lastStatus:state.META?.lastStatus??null},
    vacation:{configured:Boolean(process.env.VACATION_PORTAL_URL),lastStatus:state.VACATION_PORTAL?.lastStatus??null},
  }});
}
