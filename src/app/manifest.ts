import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GlucoMi",
    short_name: "GlucoMi",
    description: "Seguimiento de glucosa en mmol/L",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f8f5",
    theme_color: "#f5f8f5",
    lang: "es",
    icons: [
      { src: "/icons/glucometro-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/glucometro-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/glucometro-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
