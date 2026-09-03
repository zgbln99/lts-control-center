import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lts/db';
import { audit } from '@/lib/audit';

function optionalString(value:unknown){if(value===null||value===undefined)return null;const text=String(value).trim();return text||null}
function optionalDate(value:unknown){if(value===null||value===undefined||value==='')return null;const date=new Date(String(value));return Number.isNaN(date.getTime())?undefined:date}
function optionalDecimal(value:unknown){if(value===null||value===undefined||value==='')return null;const parsed=Number(String(value).replace(',','.'));return Number.isFinite(parsed)?parsed:undefined}
function optionalInteger(value:unknown){const parsed=optionalDecimal(value);return parsed===undefined?undefined:parsed===null?null:Math.round(parsed)}
function optionalBoolean(value:unknown){if(value===null||value===undefined||value==='')return null;if(typeof value==='boolean')return value;if(value==='true'||value===1||value==='1')return true;if(value==='false'||value===0||value==='0')return false;return undefined}

export async function GET(_:NextRequest,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;const vehicle=await prisma.vehicle.findUnique({where:{id},include:{telemetry:true,deadlines:{orderBy:{dueDate:'desc'}},documents:{orderBy:{filename:'asc'}},syncMappings:true,hookLoadPeriods:{orderBy:{startsAt:'desc'}},workshopOrders:{orderBy:{createdAt:'desc'},take:20}}});if(!vehicle)return NextResponse.json({error:'Vehicle not found'},{status:404});
  return NextResponse.json({...vehicle,taxMonthAmount:vehicle.taxMonthAmount?.toString()??null,taxQuarterAmount:vehicle.taxQuarterAmount?.toString()??null,taxSumAmount:vehicle.taxSumAmount?.toString()??null,monthlyRate:vehicle.monthlyRate?.toString()??null,soldPrice:vehicle.soldPrice?.toString()??null,documents:vehicle.documents.map(document=>({...document,sizeBytes:document.sizeBytes?.toString()??null})),workshopOrders:vehicle.workshopOrders.map(order=>({...order,cost:order.cost?.toString()??null}))});
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;const body=await request.json();const data:Record<string,unknown>={};
  const stringFields=['manufacturer','model','displayName','insuranceNumber','taxNumber','inventoryNumber','wrapType','notes','documentsNotes','financingEndRaw','rateRaw'];for(const field of stringFields)if(field in body)data[field]=optionalString(body[field]);
  if('category' in body)data.category=optionalString(body.category)||'OTHER';
  const dateFields=['firstRegistration','registeredAt','financingEnd'];for(const field of dateFields){if(!(field in body))continue;const parsed=optionalDate(body[field]);if(parsed===undefined)return NextResponse.json({error:`Invalid ${field}`},{status:400});data[field]=parsed}
  const decimalFields=['taxMonthAmount','taxQuarterAmount','taxSumAmount','monthlyRate'];for(const field of decimalFields){if(!(field in body))continue;const parsed=optionalDecimal(body[field]);if(parsed===undefined)return NextResponse.json({error:`Invalid ${field}`},{status:400});data[field]=parsed}
  if('grossVehicleWeightKg' in body){const parsed=optionalInteger(body.grossVehicleWeightKg);if(parsed===undefined)return NextResponse.json({error:'Invalid grossVehicleWeightKg'},{status:400});data.grossVehicleWeightKg=parsed}
  for(const field of ['cameraInstalled','wrapped']){if(!(field in body))continue;const parsed=optionalBoolean(body[field]);if(parsed===undefined)return NextResponse.json({error:`Invalid ${field}`},{status:400});data[field]=parsed}
  if(!Object.keys(data).length)return NextResponse.json({error:'No editable fields supplied'},{status:400});const existing=await prisma.vehicle.findUnique({where:{id},select:{id:true,plate:true}});if(!existing)return NextResponse.json({error:'Vehicle not found'},{status:404});const vehicle=await prisma.vehicle.update({where:{id},data});await audit(request,'UPDATE','Vehicle',id,{plate:existing.plate,fields:Object.keys(data)});return NextResponse.json(vehicle);
}
