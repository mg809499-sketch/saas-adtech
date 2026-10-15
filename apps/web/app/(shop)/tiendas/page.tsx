"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api-client";
import { Reveal, TiltZone } from "../../../components/ui/motion";

interface PublicStore { id: string; name: string | null; slug: string | null; logoUrl: string | null; plan: string; products: number }

export default function TiendasPage() {
  const [stores, setStores] = useState<PublicStore[]>([]);
  useEffect(() => { apiFetch<PublicStore[]>("/stores/public").then(setStores).catch(() => setStores([])); }, []);
  return (
    <div className="max-w-6xl mx-auto p-5 lg:p-8 flex flex-col gap-6">
      <div className="text-center"><h1 className="text-3xl lg:text-4xl font-extrabold">Directorio de tiendas GrowUp</h1><p className="text-on-surface-variant mt-2">Negocios verificados con pago Bold. Elige tu tienda.</p></div>
      <TiltZone className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.map((s, i) => (
          <Reveal key={s.id} delay={Math.min(i, 6) * 60}>
            <Link href={`/s/${s.slug}`} className="gs-tilt gs-card gs-glass rounded-3xl p-6 flex flex-col gap-1 h-full">
              <span className="w-11 h-11 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center font-black text-lg">{(s.name || "?").slice(0, 1)}</span>
              <span className="font-bold text-lg mt-2">{s.name}</span>
              <span className="text-xs text-outline font-mono">{s.slug}.growupstore.app · {s.products} productos</span>
              <span className="text-xs font-bold text-secondary mt-1">Comprar →</span>
            </Link>
          </Reveal>
        ))}
      </TiltZone>
      {stores.length === 0 && <p className="text-center text-sm text-outline">Aún no hay tiendas publicadas.</p>}
    </div>
  );
}
