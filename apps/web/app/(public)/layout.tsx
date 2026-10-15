import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GrowUp Store — Tu tienda vende hoy",
  description: "Crea tu tienda online, cobra por PSE, tarjeta o Nequi con Bold y anuncia en Meta. Empieza sin tarjeta.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "GrowUp Store",
    title: "GrowUp Store — Tu tienda vende hoy",
    description: "Tienda online + Bold + Meta Ads para Colombia.",
    locale: "es_CO",
  },
  twitter: { card: "summary", title: "GrowUp Store — Tu tienda vende hoy" },
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
