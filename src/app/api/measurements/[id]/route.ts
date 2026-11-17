import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/db";
import {user} from "@/lib/auth";
import {z} from "zod";
type Ctx={params:Promise<{id:string}>};
export async function PATCH(req:NextRequest,{params}:Ctx){const account=await user();if(!account)return NextResponse.json({error:"No autorizado"},{status:401});const {id}=await params, body=z.object({value:z.number().min(.1).max(99),comment:z.string().max(500).optional()}).partial().safeParse(await req.json().catch(()=>null));if(!body.success)return NextResponse.json({error:"Datos inválidos"},{status:400});const result=await db.measurement.updateMany({where:{id,patientId:account.id},data:body.data});if(!result.count)return NextResponse.json({error:"No encontrado"},{status:404});await db.auditLog.create({data:{userId:account.id,action:"UPDATE_MEASUREMENT",entityId:id}});return NextResponse.json({ok:true})}
export async function DELETE(_req:NextRequest,{params}:Ctx){const account=await user();if(!account)return NextResponse.json({error:"No autorizado"},{status:401});const {id}=await params;const result=await db.measurement.deleteMany({where:{id,patientId:account.id}});if(!result.count)return NextResponse.json({error:"No encontrado"},{status:404});await db.auditLog.create({data:{userId:account.id,action:"DELETE_MEASUREMENT",entityId:id}});return NextResponse.json({ok:true})}
