import {PrismaClient} from "@prisma/client";
import bcrypt from "bcryptjs";
import {existsSync,readFileSync} from "node:fs";
if(!process.env.DATABASE_URL&&existsSync(".env")){for(const line of readFileSync(".env","utf8").split(/\r?\n/)){const match=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);if(match&&!process.env[match[1]])process.env[match[1]]=match[2].replace(/^(["'])(.*)\1$/,"$2")}}
const db=new PrismaClient();
async function main(){const email=process.env.ADMIN_EMAIL?.toLowerCase(),password=process.env.ADMIN_PASSWORD;if(!email||!password||password.length<14)throw new Error("Define ADMIN_EMAIL y ADMIN_PASSWORD de al menos 14 caracteres para crear la cuenta inicial.");if(await db.user.count())throw new Error("Ya existen usuarios. No se modificó ningún dato.");await db.user.create({data:{email,name:process.env.PATIENT_NAME?.trim() || null,passwordHash:await bcrypt.hash(password,12),role:"patient"}});console.log("Cuenta inicial creada.")}
main().finally(()=>db.$disconnect());
