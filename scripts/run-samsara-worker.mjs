import { spawn } from 'node:child_process';
import process from 'node:process';

const intervalSeconds=Math.max(60,Number(process.env.SAMSARA_SYNC_INTERVAL_SECONDS??300)||300);
const timeoutSeconds=Math.max(30,Number(process.env.SAMSARA_SYNC_TIMEOUT_SECONDS??240)||240);
let stopping=false;
let activeChild=null;
let sleepTimer=null;

function timestamp(){return new Date().toISOString()}
function sleep(ms){
  return new Promise(resolve=>{
    sleepTimer=setTimeout(()=>{sleepTimer=null;resolve()},ms);
  });
}

async function runSync(){
  if(stopping)return;
  console.log(`[${timestamp()}] Samsara sync started`);
  const exitCode=await new Promise(resolve=>{
    const child=spawn(process.execPath,['scripts/sync-samsara.mjs'],{
      cwd:process.cwd(),
      env:process.env,
      stdio:'inherit',
    });
    activeChild=child;
    let finished=false;
    const timeout=setTimeout(()=>{
      if(finished)return;
      console.error(`[${timestamp()}] Samsara sync exceeded ${timeoutSeconds}s; terminating child`);
      child.kill('SIGTERM');
      setTimeout(()=>{if(!finished)child.kill('SIGKILL')},5000).unref();
    },timeoutSeconds*1000);
    child.on('exit',code=>{
      finished=true;
      clearTimeout(timeout);
      activeChild=null;
      resolve(code??1);
    });
    child.on('error',error=>{
      finished=true;
      clearTimeout(timeout);
      activeChild=null;
      console.error(`[${timestamp()}] Could not start Samsara sync`,error);
      resolve(1);
    });
  });
  if(exitCode===0) console.log(`[${timestamp()}] Samsara sync completed`);
  else console.error(`[${timestamp()}] Samsara sync failed with exit code ${exitCode}; retrying in ${intervalSeconds}s`);
}

async function main(){
  console.log(`[${timestamp()}] Samsara worker online; interval=${intervalSeconds}s timeout=${timeoutSeconds}s`);
  while(!stopping){
    await runSync();
    if(stopping)break;
    await sleep(intervalSeconds*1000);
  }
  console.log(`[${timestamp()}] Samsara worker stopped`);
}

function stop(signal){
  if(stopping)return;
  stopping=true;
  console.log(`[${timestamp()}] Received ${signal}; stopping Samsara worker`);
  if(sleepTimer){clearTimeout(sleepTimer);sleepTimer=null;}
  if(activeChild)activeChild.kill('SIGTERM');
}

process.on('SIGTERM',()=>stop('SIGTERM'));
process.on('SIGINT',()=>stop('SIGINT'));

main().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
