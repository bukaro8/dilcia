"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

const copy = {
  registro: { title: "Crea tu cuenta", summary: "Abre tu espacio en GlucoMi para registrar tus mediciones.", button: "Crear cuenta" },
  recuperar: { title: "Recupera tu contraseña", summary: "Escribe el correo con el que creaste tu cuenta.", button: "Solicitar enlace" },
  restablecer: { title: "Elige una nueva contraseña", summary: "Usa una contraseña de al menos 8 caracteres.", button: "Guardar contraseña" },
};

export default function AccountForm({ action }: { action: keyof typeof copy }) {
  const [token, setToken] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; ok: boolean }>();
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const text = copy[action];
  const validLink = action !== "restablecer" || (token !== null && /^[a-f0-9]{64}$/.test(token));

  useEffect(() => {
    setToken(location.hash.slice(1));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !validLink) return;

    const data = new FormData(event.currentTarget);
    if (action !== "recuperar" && data.get("password") !== data.get("confirmation")) {
      setFeedback({ ok: false, message: "Las contraseñas no coinciden." });
      return;
    }
    pending.current = true;
    setBusy(true);
    setFeedback(undefined);
    try {
      const response = await fetch("/api/auth/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(data), action, token }),
      });
      const result = await response.json();
      setFeedback({ ok: response.ok, message: result.message });
      if (response.ok && action === "restablecer") history.replaceState(null, "", location.pathname);
    } catch {
      setFeedback({ ok: false, message: "Comprueba tu conexión e inténtalo de nuevo." });
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return <main className="login">
    <div className="login-card">
      <div className="brandmark"><Image src="/icons/glucometro-192.png" alt="GlucoMi" width={54} height={54} unoptimized /></div>
      <h1>{text.title}</h1>
      <p>{text.summary}</p>
      {validLink && !feedback?.ok && <form onSubmit={submit}>
        {action === "registro" && <label>Tu nombre<input name="name" autoComplete="name" maxLength={80} required /></label>}
        {action !== "restablecer" && <label>Correo electrónico<input name="email" type="email" autoComplete="email" maxLength={200} required /></label>}
        {action !== "recuperar" && <>
          <label>{action === "registro" ? "Contraseña (mínimo 8 caracteres)" : "Nueva contraseña"}<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /></label>
          <label>Repite la contraseña<input name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /></label>
        </>}
        <button className="primary" disabled={busy}>{busy ? "Un momento…" : text.button}</button>
      </form>}
      {!validLink && token !== null && <p role="alert">Este enlace está incompleto.</p>}
      {feedback && <p role={feedback.ok ? "status" : "alert"}>{feedback.message}</p>}
      <div className="account-links">
        <Link href="/">Volver a iniciar sesión</Link>
        {action === "restablecer" && !feedback?.ok && <Link href="/cuenta/recuperar">Solicitar otro enlace</Link>}
      </div>
    </div>
  </main>;
}
