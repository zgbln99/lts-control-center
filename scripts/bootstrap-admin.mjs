import process from 'node:process';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma=new PrismaClient();
const email=String(process.env.BOOTSTRAP_ADMIN_EMAIL ?? '').trim().toLowerCase();
const password=String(process.env.BOOTSTRAP_ADMIN_PASSWORD ?? '');
const name=String(process.env.BOOTSTRAP_ADMIN_NAME ?? 'Administrator').trim() || 'Administrator';

async function main(){
  if(!email) throw new Error('BOOTSTRAP_ADMIN_EMAIL is required');
  if(password.length<12) throw new Error('BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters');
  const passwordHash=await bcrypt.hash(password,12);
  const user=await prisma.user.upsert({
    where:{email},
    update:{name,passwordHash,role:'ADMIN',active:true},
    create:{email,name,passwordHash,role:'ADMIN',active:true},
  });
  console.log(`Administrator ready: ${user.email}`);
}

main().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>prisma.$disconnect());
