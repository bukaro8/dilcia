import type { Metadata } from "next";
import "./styles.css";
import SwRegister from "./sw-register";
export const metadata: Metadata = {
  title: "GlucoMi",
  description: "Seguimiento sencillo de glucosa",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "GlucoMi", statusBarStyle: "default" },
  icons: {
    icon: { url: "/icons/glucometro-192.png", sizes: "192x192", type: "image/png" },
    apple: { url: "/icons/glucometro-apple.png", sizes: "180x180", type: "image/png" },
  },
};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="es"><body>{children}<SwRegister/></body></html>; }
