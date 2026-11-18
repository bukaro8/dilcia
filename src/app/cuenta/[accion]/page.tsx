import { notFound } from "next/navigation";
import AccountForm from "./account-form";

export const metadata = { title: "Tu cuenta · GlucoMi", robots: { index: false, follow: false } };

export default async function AccountPage({ params }: { params: Promise<{ accion: string }> }) {
  const { accion } = await params;
  if (accion !== "registro" && accion !== "recuperar" && accion !== "restablecer") notFound();
  return <AccountForm action={accion} />;
}
