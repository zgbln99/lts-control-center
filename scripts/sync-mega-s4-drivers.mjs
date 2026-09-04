import process from 'node:process';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { S3Client } from '@aws-sdk/client-s3';

const required=['MEGA_S4_ENDPOINT','MEGA_S4_REGION','MEGA_S4_BUCKET','MEGA_S4_ACCESS_KEY','MEGA_S4_SECRET_KEY'];
for(const key of required)if(!process.env[key])throw new Error('Missing environment variable: '+key);

const prefix=String(process.env.MEGA_S4_DRIVER_PREFIX??'fahrer').replace(/^\/+|\/+$/g,'');
const prefixWithSlash=prefix?prefix+'/':'';
const prisma=new PrismaClient();
const s3=new S3Client({
  endpoint:process.env.MEGA_S4_ENDPOINT,
  region:process.env.MEGA_S4_REGION,
  forcePathStyle:String(process.env.MEGA_S4_FORCE_PATH_STYLE??'false').toLowerCase()==='true',
  credentials:{accessKeyId:process.env.MEGA_S4_ACCESS_KEY,secretAccessKey:process.env.MEGA_S4_SECRET_KEY},
});

function clean(value){return String(value??'').trim().replace(/\s+/g,' ')}
function normalizeIdentity(value){return clean(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'')}
function filenameFromKey(key){return key.split('/').pop()||key}
function mimeFromFilename(filename){
  const lower=filename.toLowerCase();
  if(lower.endsWith('.pdf'))return'application/pdf';
  if(lower.endsWith('.jpg')||lower.endsWith('.jpeg'))return'image/jpeg';
  if(lower.endsWith('.png'))return'image/png';
  if(lower.endsWith('.webp'))return'image/webp';
  if(lower.endsWith('.doc'))return'application/msword';
  if(lower.endsWith('.docx'))return'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return'application/octet-stream';
}
function guessType(filename){
  const value=filename.toLowerCase();
  if(/f[uü]hrerschein|driving.?licen[cs]e|license/.test(value))return'FUEHRERSCHEIN';
  if(/fahrer.?karte|driver.?card|tachograph.?card/.test(value))return'FAHRERKARTE';
  if(/code.?95|schl[uü]ssel.?95|berufskraftfahrer/.test(value))return'CODE95';
  if(/medizin|medical|arzt|untersuchung|g25/.test(value))return'MEDIZIN';
  if(/ausweis|passport|personalausweis|identity/.test(value))return'AUSWEIS';
  if(/vertrag|contract|arbeitsvertrag/.test(value))return'VERTRAG';
  return'SONSTIGE';
}
async function listObjects(){
  const objects=[];let token;
  do{
    const response=await s3.send(new ListObjectsV2Command({Bucket:process.env.MEGA_S4_BUCKET,Prefix:prefixWithSlash,ContinuationToken:token,MaxKeys:1000}));
    for(const row of response.Contents??[])if(row.Key&&row.Size!==0)objects.push({key:row.Key,size:row.Size??null});
    token=response.IsTruncated?response.NextContinuationToken:undefined;
  }while(token);
  return objects;
}
async function setState(status,message,counters,details){
  await prisma.integrationState.upsert({
    where:{key:'MEGA_S4_DRIVERS'},
    create:{key:'MEGA_S4_DRIVERS',enabled:true,lastSyncAt:new Date(),lastStatus:status,lastMessage:message,counters,details},
    update:{enabled:true,lastSyncAt:new Date(),lastStatus:status,lastMessage:message,counters,details},
  });
}

async function main(){
  const objects=await listObjects();
  const drivers=await prisma.driver.findMany({select:{id:true,personnelNumber:true,firstName:true,lastName:true,status:true}});
  const byPersonnel=new Map();
  const byName=new Map();
  for(const driver of drivers){
    if(driver.personnelNumber)byPersonnel.set(normalizeIdentity(driver.personnelNumber),driver);
    const variants=[
      driver.lastName+'_'+driver.firstName,
      driver.lastName+' '+driver.firstName,
      driver.firstName+'_'+driver.lastName,
      driver.firstName+' '+driver.lastName,
    ];
    for(const value of variants)byName.set(normalizeIdentity(value),driver);
  }

  const folders=new Map();
  let rootObjects=0;
  for(const object of objects){
    const relative=prefixWithSlash&&object.key.startsWith(prefixWithSlash)?object.key.slice(prefixWithSlash.length):object.key;
    const slash=relative.indexOf('/');
    if(slash<1){rootObjects+=1;continue}
    const folder=relative.slice(0,slash);
    const list=folders.get(folder)??[];
    list.push(object);folders.set(folder,list);
  }

  let matchedFolders=0,unmatchedFolders=0,documentsCreated=0,documentsUpdated=0;
  const unmatched=[];
  for(const [folder,files] of folders){
    const identity=normalizeIdentity(folder);
    const driver=byPersonnel.get(identity)||byName.get(identity)||null;
    if(!driver){unmatchedFolders+=1;unmatched.push({folder,files:files.length});continue}
    matchedFolders+=1;

    for(const file of files){
      const filename=filenameFromKey(file.key);
      const existing=await prisma.driverDocument.findUnique({where:{storageKey:file.key},select:{id:true,sizeBytes:true,driverId:true}});
      const data={
        driverId:driver.id,
        type:guessType(filename),
        filename,
        mimeType:mimeFromFilename(filename),
        sizeBytes:file.size===null?null:BigInt(file.size),
        source:'MEGA_S4',
      };
      if(existing){
        await prisma.driverDocument.update({where:{id:existing.id},data});
        documentsUpdated+=1;
      }else{
        await prisma.driverDocument.create({data:{...data,storageKey:file.key}});
        documentsCreated+=1;
      }
    }
  }

  const counters={objects:objects.length,folders:folders.size,matchedFolders,unmatchedFolders,rootObjects,documentsCreated,documentsUpdated};
  await setState('OK',`Matched ${matchedFolders} of ${folders.size} driver folders.`,counters,{unmatched:unmatched.slice(0,250)});
  console.log(JSON.stringify({bucket:process.env.MEGA_S4_BUCKET,prefix:prefixWithSlash,...counters,unmatched:unmatched.slice(0,100)},null,2));
}

main().catch(async error=>{
  console.error(error);
  try{await setState('ERROR',String(error?.message??error).slice(0,1000),{},undefined)}catch(stateError){console.error('Could not persist driver S4 state',stateError)}
  process.exitCode=1;
}).finally(async()=>{await prisma.$disconnect()});
