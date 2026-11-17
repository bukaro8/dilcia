import {PrismaClient} from "@prisma/client";
import bcrypt from "bcryptjs";
const db=new PrismaClient();
async function main(){const email=process.env.ADMIN_EMAIL?.toLowerCase(),password=process.env.ADMIN_PASSWORD;if(!email||!password||password.length<14)throw new Error("Define ADMIN_EMAIL y ADMIN_PASSWORD de al menos 14 caracteres para crear la cuenta inicial.");if(await db.user.count())throw new Error("Ya existen usuarios. No se modificó ningún dato.");await db.user.create({data:{email,passwordHash:await bcrypt.hash(password,12),role:"patient"}});console.log("Cuenta inicial creada.")}
main().finally(()=>db.$disconnect());
