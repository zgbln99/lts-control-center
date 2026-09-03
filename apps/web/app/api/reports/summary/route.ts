import { NextResponse } from 'next/server';
import { prisma } from '@lts/db';

export const dynamic='force-dynamic';

export async function GET(){
 const now=new Date();const monthStart=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));const in30=new Date(now.getTime()+30*86_400_000);const in60=new Date(now.getTime()+60*86_400_000);
 const [activeVehicles,archivedVehicles,activeDrivers,samsaraConnected,openWorkshop,overdueDeadlines,nextDeadlines,monthCosts,costByCategory,driverExpiry]=await Promise.all([
  prisma.vehicle.count({where:{lifecycle:'ACTIVE'}}),prisma.vehicle.count({where:{lifecycle:{not:'ACTIVE'}}}),prisma.driver.count({where:{status:'ACTIVE'}}),prisma.vehicle.count({where:{lifecycle:'ACTIVE',samsaraId:{not:null}}}),
  prisma.workshopOrder.count({where:{status:{in:['OPEN','PLANNED','IN_PROGRESS','WAITING_PARTS']}}}),prisma.vehicleDeadline.count({where:{completedAt:null,dueDate:{lt:now}}}),prisma.vehicleDeadline.count({where:{completedAt:null,dueDate:{gte:now,lte:in30}}}),
  prisma.costEntry.aggregate({where:{date:{gte:monthStart}},_sum:{amount:true},_count:true}),prisma.costEntry.groupBy({by:['category'],where:{date:{gte:monthStart}},_sum:{amount:true},_count:true}),
  prisma.driver.findMany({where:{status:'ACTIVE',OR:[{licenseExpiresAt:{lte:in60}},{driverCardExpiresAt:{lte:in60}},{code95ExpiresAt:{lte:in60}},{medicalExpiresAt:{lte:in60}}]},select:{id:true,firstName:true,lastName:true,personnelNumber:true,licenseExpiresAt:true,driverCardExpiresAt:true,code95ExpiresAt:true,medicalExpiresAt:true},orderBy:{lastName:'asc'},take:25})
 ]);
 const topVehicles=await prisma.costEntry.groupBy({by:['vehicleId'],where:{date:{gte:monthStart},vehicleId:{not:null}},_sum:{amount:true},_count:true,orderBy:{_sum:{amount:'desc'}},take:10});
 const vehicleIds=topVehicles.map(row=>row.vehicleId).filter(Boolean) as string[];const vehicles=await prisma.vehicle.findMany({where:{id:{in:vehicleIds}},select:{id:true,plate:true,displayName:true}});const byId=new Map(vehicles.map(v=>[v.id,v]));
 return NextResponse.json({generatedAt:now.toISOString(),period:{monthStart:monthStart.toISOString()},kpis:{activeVehicles,archivedVehicles,activeDrivers,samsaraConnected,openWorkshop,overdueDeadlines,nextDeadlines,monthCostTotal:monthCosts._sum.amount?.toString()??'0',monthCostCount:monthCosts._count},costByCategory:costByCategory.map(row=>({category:row.category,amount:row._sum.amount?.toString()??'0',count:row._count})),topVehicles:topVehicles.map(row=>({vehicle:row.vehicleId?byId.get(row.vehicleId)??null:null,amount:row._sum.amount?.toString()??'0',count:row._count})),driverExpiry});
}
