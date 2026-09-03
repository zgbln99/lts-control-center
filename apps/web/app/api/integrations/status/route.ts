import { NextResponse } from 'next/server';
import { prisma } from '@lts/db';

export const dynamic='force-dynamic';

export async function GET(){
  const [vehicleCount,samsaraVehicles,telemetryCount,latestTelemetry,documentCount,latestDocument,folderMappings]=await Promise.all([
    prisma.vehicle.count({where:{lifecycle:'ACTIVE'}}),
    prisma.vehicle.count({where:{lifecycle:'ACTIVE',samsaraId:{not:null}}}),
    prisma.vehicleTelemetry.count(),
    prisma.vehicleTelemetry.findFirst({orderBy:{updatedAt:'desc'},select:{updatedAt:true}}),
    prisma.vehicleDocument.count({where:{source:'MEGA_S4'}}),
    prisma.vehicleDocument.findFirst({where:{source:'MEGA_S4'},orderBy:{updatedAt:'desc'},select:{updatedAt:true}}),
    prisma.storageFolderMapping.count(),
  ]);

  return NextResponse.json({
    generatedAt:new Date().toISOString(),
    integrations:{
      samsara:{
        configured:Boolean(process.env.SAMSARA_API_TOKEN),
        connectedVehicles:samsaraVehicles,
        activeVehicles:vehicleCount,
        telemetryRecords:telemetryCount,
        lastSyncAt:latestTelemetry?.updatedAt?.toISOString() ?? null,
      },
      megaS4:{
        configured:Boolean(process.env.MEGA_S4_ENDPOINT&&process.env.MEGA_S4_BUCKET&&process.env.MEGA_S4_ACCESS_KEY&&process.env.MEGA_S4_SECRET_KEY),
        documents:documentCount,
        mappedFolders:folderMappings,
        lastSyncAt:latestDocument?.updatedAt?.toISOString() ?? null,
      },
      chatwoot:{configured:Boolean(process.env.CHATWOOT_URL&&process.env.CHATWOOT_API_TOKEN)},
      n8n:{configured:Boolean(process.env.N8N_WEBHOOK_BASE_URL)},
      meta:{configured:Boolean(process.env.META_WABA_ID&&process.env.META_PHONE_NUMBER_ID&&process.env.META_ACCESS_TOKEN)},
      vacation:{configured:Boolean(process.env.VACATION_PORTAL_URL)},
    },
  });
}
