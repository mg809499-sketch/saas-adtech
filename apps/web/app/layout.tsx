import type { Metadata } from "next";
import { PageShader } from "../components/ui/PageShader";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "GrowUp Store — Vende más, cobra con Bold y escala con Meta Ads",
  description: "Crea tu tienda en minutos: pagos Bold (PSE, tarjeta, Nequi), Meta Ads en 3 clics y ventas cruzadas en la Red Aliada.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f131d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className="dark" style={{ colorScheme: "dark" }}>
      <head>
        <link rel="icon" href="/growup-logo.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" />
      </head>
      <body className="bg-surface text-on-surface antialiased">
        <PageShader />{children}
      </body>
    </html>
  );
}
