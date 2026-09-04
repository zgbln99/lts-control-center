import { NextResponse } from 'next/server';
import { prisma } from '@lts/db';

export const dynamic='force-dynamic';

export async function GET(){
  const [vehicleCount,samsaraVehicles,telemetryCount,latestTelemetry,documentCount,latestDocument,driverDocumentCount,latestDriverDocument,folderMappings,states,dddBatches,dddViolations,latestDdd]=await Promise.all([
    prisma.vehicle.count({where:{lifecycle:'ACTIVE'}}),
    prisma.vehicle.count({where:{lifecycle:'ACTIVE',samsaraId:{not:null}}}),
    prisma.vehicleTelemetry.count(),
    prisma.vehicleTelemetry.findFirst({orderBy:{syncedAt:'desc'},select:{syncedAt:true}}),
    prisma.vehicleDocument.count({where:{source:'MEGA_S4'}}),
    prisma.vehicleDocument.findFirst({where:{source:'MEGA_S4'},orderBy:{updatedAt:'desc'},select:{updatedAt:true}}),
    prisma.driverDocument.count({where:{source:'MEGA_S4'}}),
    prisma.driverDocument.findFirst({where:{source:'MEGA_S4'},orderBy:{updatedAt:'desc'},select:{updatedAt:true}}),
    prisma.storageFolderMapping.count(),
    prisma.integrationState.findMany(),
    prisma.dddAnalysisBatch.count(),
    prisma.tachographViolation.count(),
    prisma.dddAnalysisBatch.findFirst({orderBy:{createdAt:'desc'},select:{createdAt:true,source:true,status:true}}),
  ]);
  const state=Object.fromEntries(states.map(row=>[row.key,row]));
  return NextResponse.json({generatedAt:new Date().toISOString(),integrations:{
    samsara:{configured:Boolean(process.env.SAMSARA_API_TOKEN),connectedVehicles:samsaraVehicles,activeVehicles:vehicleCount,telemetryRecords:telemetryCount,lastSyncAt:state.SAMSARA?.lastSyncAt?.toISOString()??latestTelemetry?.syncedAt?.toISOString()??null,lastStatus:state.SAMSARA?.lastStatus??null},
    megaS4:{configured:Boolean(process.env.MEGA_S4_ENDPOINT&&process.env.MEGA_S4_BUCKET&&process.env.MEGA_S4_ACCESS_KEY&&process.env.MEGA_S4_SECRET_KEY),documents:documentCount,driverDocuments:driverDocumentCount,mappedFolders:folderMappings,lastSyncAt:state.MEGA_S4?.lastSyncAt?.toISOString()??latestDocument?.updatedAt?.toISOString()??null,lastDriverSyncAt:state.MEGA_S4_DRIVERS?.lastSyncAt?.toISOString()??latestDriverDocument?.updatedAt?.toISOString()??null,lastStatus:state.MEGA_S4?.lastStatus??null,driverLastStatus:state.MEGA_S4_DRIVERS?.lastStatus??null},
    chatwoot:{configured:Boolean(process.env.CHATWOOT_URL&&process.env.CHATWOOT_ACCOUNT_ID&&process.env.CHATWOOT_API_TOKEN),lastStatus:state.CHATWOOT?.lastStatus??null},
    n8n:{configured:Boolean((process.env.N8N_API_URL&&process.env.N8N_API_KEY)||process.env.N8N_WEBHOOK_BASE_URL),lastStatus:state.N8N?.lastStatus??null},
    meta:{configured:Boolean(process.env.META_WABA_ID&&process.env.META_PHONE_NUMBER_ID&&process.env.META_ACCESS_TOKEN),lastStatus:state.META?.lastStatus??null},
    vacation:{configured:Boolean(process.env.VACATION_PORTAL_URL),url:process.env.VACATION_PORTAL_URL||null,lastStatus:state.VACATION_PORTAL?.lastStatus??null},
    ddd:{configured:Boolean(process.env.DDD_ANALYZER_URL),batches:dddBatches,violations:dddViolations,lastImportAt:latestDdd?.createdAt?.toISOString()??null,lastSource:latestDdd?.source??null,lastStatus:latestDdd?.status??null},
  }});
}
