import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const email = z.string().trim().max(200).email().transform(value => value.toLowerCase());
const password = z.string().min(8).refine(value => Buffer.byteLength(value) <= 72);
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("registro"), name: z.string().trim().min(1).max(80), email, password }),
  z.object({ action: z.literal("recuperar"), email }),
  z.object({ action: z.literal("restablecer"), token: z.string().regex(/^[a-f0-9]{64}$/), password }),
]);
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const attempts = new Map<string, { count: number; expires: number }>();
const reply = (message: string, status = 200) =>
  NextResponse.json({ message }, { status, headers: { "Cache-Control": "no-store" } });

async function requestReset(address: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RECOVERY_FROM;
  const localPreview = process.env.NODE_ENV === "development" && process.env.RECOVERY_LOCAL_PREVIEW === "true";
  if ((!apiKey || !from) && !localPreview) return reply("La recuperación por correo aún no está configurada.", 503);

  const origin = process.env.APP_URL;
  if (!origin || (process.env.NODE_ENV === "production" && !origin.startsWith("https://"))) {
    return reply("La recuperación no está disponible en este momento.", 503);
  }

  const token = randomBytes(32).toString("hex");
  const digest = hashToken(token);
  const now = Date.now();
  const url = new URL("/cuenta/restablecer", origin);
  url.hash = token;
  const updated = await db.user.updateMany({
    where: { email: address, OR: [
      { resetExpiresAt: null },
      { resetExpiresAt: { lte: new Date(now + 29 * 60_000) } },
    ] },
    data: { resetTokenHash: digest, resetExpiresAt: new Date(now + 30 * 60_000) },
  });

  if (updated.count) {
    try {
      if (apiKey && from) {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from,
            to: [address],
            subject: "Restablece tu contraseña de GlucoMi",
            text: `Abre este enlace en los próximos 30 minutos para elegir una contraseña nueva:\n${url}\n\nSi no lo solicitaste, puedes ignorar este mensaje.`,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error("Recovery email rejected");
      } else {
        console.info("Enlace de recuperación para pruebas locales:", url.toString());
      }
    } catch {
      await db.user.updateMany({
        where: { resetTokenHash: digest },
        data: { resetTokenHash: null, resetExpiresAt: null },
      });
      console.error("No se pudo enviar un correo de recuperación de GlucoMi.");
    }
  }
  return reply(localPreview && (!apiKey || !from)
    ? "Si existe la cuenta, el enlace aparecerá en la terminal de desarrollo."
    : "Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.");
}

export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return reply("Comprueba los datos. Las contraseñas nuevas deben tener al menos 8 caracteres y ocupar como máximo 72 bytes.", 400);

  const data = parsed.data;
  const now = Date.now();
  for (const [key, window] of attempts) if (window.expires <= now) attempts.delete(key);
  const ip = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "local";
  const key = `${data.action}:${ip}`;
  if ((attempts.get(key)?.count ?? 0) >= 8 || (!attempts.has(key) && attempts.size >= 5000)) {
    return reply("Has hecho demasiados intentos. Prueba en unos minutos.", 429);
  }
  const window = attempts.get(key) ?? { count: 0, expires: now + 10 * 60_000 };
  window.count++;
  attempts.set(key, window);

  try {
    if (data.action === "recuperar") return await requestReset(data.email);
    if (data.action === "registro") {
      const passwordHash = await bcrypt.hash(data.password, 12);
      await db.user.create({ data: { email: data.email, name: data.name, passwordHash } });
      return reply("Cuenta creada. Ya puedes iniciar sesión.", 201);
    }

    const resetTokenHash = hashToken(data.token);
    const valid = { resetTokenHash, resetExpiresAt: { gt: new Date() } };
    if (!await db.user.findFirst({ where: valid, select: { id: true } })) {
      return reply("Este enlace ha caducado o ya se utilizó. Solicita otro.", 400);
    }
    const passwordHash = await bcrypt.hash(data.password, 12);
    const updated = await db.user.updateMany({
      where: { ...valid, resetExpiresAt: { gt: new Date() } },
      data: { passwordHash, resetTokenHash: null, resetExpiresAt: null, sessionVersion: { increment: 1 } },
    });
    return updated.count
      ? reply("Contraseña actualizada. Ya puedes iniciar sesión.")
      : reply("Este enlace ha caducado o ya se utilizó. Solicita otro.", 400);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return reply("No se pudo crear la cuenta con esos datos. Puedes intentar iniciar sesión o recuperar tu contraseña.", 409);
    }
    return reply("No se pudo completar la solicitud. Inténtalo de nuevo.", 500);
  }
}
