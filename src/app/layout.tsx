import type { Metadata } from "next";
import "./styles.css";
import SwRegister from "./sw-register";
export const metadata: Metadata = { title:"Glucosa Dilcia", description:"Seguimiento sencillo de glucosa", manifest:"/manifest.webmanifest", appleWebApp:{capable:true,title:"Glucosa Dilcia",statusBarStyle:"default"} };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="es"><body>{children}<SwRegister/></body></html>; }
