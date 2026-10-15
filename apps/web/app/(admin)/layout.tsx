"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, getToken } from "../../lib/api-client";
import { GrowupLogo } from "../../components/brand/GrowupLogo";

const NAV = [
  ["Panorama", "/admin"],
  ["Tiendas", "/admin/negocios"],
  ["Suscripciones", "/admin/suscripciones"],
  ["Red global", "/admin/red"],
  ["Auditoría", "/admin/auditoria"],
];

// Consola plataforma: solo ADMIN (verificado contra /auth/me).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      if (!getToken()) { router.replace("/login?next=/admin"); return; }
      try {
        const me = await apiFetch<{ role: string }>("/auth/me");
        if (me.role !== "ADMIN") router.replace("/login?next=/admin");
        else setOk(true);
      } catch {
        router.replace("/login?next=/admin");
      }
    })();
  }, [router]);

  if (!ok) return <div className="min-h-screen flex items-center justify-center text-sm text-on-surface-variant">Verificando rol de plataforma…</div>;
  return (
    <div className="min-h-screen text-on-surface">
      <header className="safe-top fixed top-0 inset-x-0 z-50 bg-surface-container/50 backdrop-blur-2xl border-b border-outline-variant/30">
        <div className="h-16 max-w-7xl mx-auto px-4 flex items-center gap-4">
          <Link href="/admin" className="flex items-center gap-2 font-bold"><GrowupLogo size={32} /> GrowUp <span className="text-xs px-2 py-0.5 rounded-full bg-tertiary/20 text-tertiary font-bold">PLATAFORMA</span></Link>
          <nav className="flex gap-1 ml-4">{NAV.map(([l, h]) => <Link key={h} href={h} className="px-3 py-1.5 rounded-xl text-sm text-on-surface-variant hover:text-on-surface hover:bg-white/5">{l}</Link>)}</nav>
        </div>
      </header>
      <main className="pt-[calc(4rem+env(safe-area-inset-top,0px))] max-w-7xl mx-auto p-5">{children}</main>
    </div>
  );
}
