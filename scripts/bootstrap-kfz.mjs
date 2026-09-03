import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const input=process.argv[2];
if(!input){
  console.error('Usage: npm run bootstrap:kfz -- "/path/Kfz Liste aktuell 2026.xlsx"');
  process.exit(1);
}
if(!fs.existsSync(input)){
  console.error(`Workbook not found: ${input}`);
  process.exit(1);
}

const preview=path.resolve('./tmp/kfz-import-preview.json');
fs.mkdirSync(path.dirname(preview),{recursive:true});

function run(command,args){
  const result=spawnSync(command,args,{stdio:'inherit',env:process.env});
  if(result.error) throw result.error;
  return result.status ?? 1;
}

console.log('\n[1/3] Ensuring database schema...');
if(run('npm',['run','db:push'])!==0) process.exit(1);

console.log('\n[2/3] Validating workbook and preparing import preview...');
const previewStatus=run(process.execPath,['scripts/import-kfz-xlsx.mjs',input,preview]);
if(previewStatus!==0){
  console.error('\nImport stopped before touching vehicle data. Review the preview/conflicts above.');
  process.exit(previewStatus);
}

console.log('\n[3/3] Importing vehicles into PostgreSQL...');
const importStatus=run(process.execPath,['scripts/import-kfz-to-db.mjs',preview]);
if(importStatus!==0) process.exit(importStatus);

console.log('\nFleet bootstrap completed successfully.');
console.log(`Preview retained at: ${preview}`);
