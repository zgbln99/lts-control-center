import { S3Client } from '@aws-sdk/client-s3';

let client:S3Client|undefined;

export function getS4Client(){
  if(client) return client;
  const endpoint=process.env.MEGA_S4_ENDPOINT;
  const region=process.env.MEGA_S4_REGION;
  const accessKeyId=process.env.MEGA_S4_ACCESS_KEY;
  const secretAccessKey=process.env.MEGA_S4_SECRET_KEY;
  if(!endpoint||!region||!accessKeyId||!secretAccessKey){
    throw new Error('MEGA S4 is not configured');
  }
  client=new S3Client({
    endpoint,
    region,
    forcePathStyle:String(process.env.MEGA_S4_FORCE_PATH_STYLE??'false').toLowerCase()==='true',
    credentials:{accessKeyId,secretAccessKey},
  });
  return client;
}

export function getS4Bucket(){
  const bucket=process.env.MEGA_S4_BUCKET;
  if(!bucket) throw new Error('MEGA_S4_BUCKET is not configured');
  return bucket;
}
