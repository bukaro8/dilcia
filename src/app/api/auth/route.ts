import {NextRequest,NextResponse} from "next/server";
import bcrypt from "bcryptjs";
import {db} from "@/lib/db";
import {setSession} from "@/lib/auth";
import {z} from "zod";
const attempts=new Map<string,{n:number;at:number}>();
export async function POST(req:NextRequest){const ip=req.headers.get("x-forwarded-for")||"unknown", now=Date.now(), old=attempts.get(ip);if(old&&old.n>=8&&now-old.at<600000)return NextResponse.json({error:"Espera unos minutos antes de intentarlo de nuevo."},{status:429});const parsed=z.object({email:z.string().email().max(200),password:z.string().min(1).max(200)}).safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Datos inválidos"},{status:400});const account=await db.user.findUnique({where:{email:parsed.data.email.toLowerCase()}});if(!account||!await bcrypt.compare(parsed.data.password,account.passwordHash)){attempts.set(ip,{n:(old?.n||0)+1,at:now});return NextResponse.json({error:"Acceso no válido"},{status:401})}attempts.delete(ip);await setSession(account.id);await db.auditLog.create({data:{userId:account.id,action:"LOGIN"}});return NextResponse.json({ok:true})}
export async function DELETE(){const res=NextResponse.json({ok:true});res.cookies.set("session","",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:0});return res}
