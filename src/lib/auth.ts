import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
const secret = () => { const value=process.env.SESSION_SECRET; if(process.env.NODE_ENV==="production"&&(!value||value.length<32))throw new Error("SESSION_SECRET must contain at least 32 characters in production."); return new TextEncoder().encode(value||"development-secret-change-before-deploy-000000"); };
export async function setSession(userId: string) { const token = await new SignJWT({userId}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("7d").sign(secret()); (await cookies()).set("session",token,{httpOnly:true,secure:process.env.NODE_ENV === "production",sameSite:"lax",path:"/",maxAge:604800}); }
export async function user() { try { const token=(await cookies()).get("session")?.value; if(!token)return null; const {payload}=await jwtVerify(token,secret()); return await db.user.findUnique({where:{id:String(payload.userId)}}); } catch {return null;} }
