"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api-client";
import { useAuth } from "../../lib/auth";
import { GrowupLogo } from "../brand/GrowupLogo";
import { StoreSwitcher } from "./StoreSwitcher";

const commerceLinks = [
  { group: "Portal Principal", items: [{ href: "/", label: "Landing & Acceso" }, { href: "/crear-tienda", label: "＋ Crear tienda" }] },
  { group: "Operaciones Core", items: [
    { href: "/consola/dashboard-central", label: "Dashboard Central" },
    { href: "/consola/catalogo-inventario", label: "Catálogo & Inventario" },
    { href: "/consola/ordenes-pedidos", label: "Órdenes & Pedidos" }] },
  { group: "Crecimiento & Canales", items: [
    { href: "/consola/meta-ads-studio", label: "Meta Ads Studio" },
    { href: "/consola/red-aliada-afiliados", label: "Red Aliada / Afiliados" }] },
  { group: "Mi Sitio Web", items: [
    { href: "/consola/sitio", label: "Personalizar sitio" }] },
  { group: "Infraestructura", items: [
    { href: "/consola/pasarelas-pagos", label: "Pasarelas & Pagos" },
    { href: "/consola/dominio-marca", label: "Dominio & Marca" },
    { href: "/consola/ajustes-sistema", label: "Ajustes" }] },
];

const platformLinks = [
  { group: "Plataforma GrowUp", items: [
    { href: "/consola/plataforma", label: "Panorama" },
    { href: "/consola/plataforma/negocios", label: "Tiendas clientes" },
    { href: "/consola/plataforma/suscripciones", label: "Compras y suscripciones" },
    { href: "/consola/plataforma/planes", label: "Planes y permisos" }] },
  { group: "Crecimiento", items: [
    { href: "/consola/plataforma/meta-ads", label: "Meta Ads plataforma" },
    { href: "/consola/plataforma/red", label: "Red y afiliados" }] },
  { group: "Infraestructura", items: [
    { href: "/consola/plataforma/pasarelas", label: "Pasarelas y pagos" },
    { href: "/consola/plataforma/dominios", label: "Dominios y API" },
    { href: "/consola/plataforma/ajustes", label: "Ajustes GrowUp" },
    { href: "/consola/plataforma/auditoria", label: "Auditoría" }] },
];

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  ADMIN: { label: "Plataforma", cls: "bg-tertiary/20 text-tertiary" },
  MERCHANT: { label: "Comercio", cls: "bg-secondary/15 text-secondary" },
  CUSTOMER: { label: "Miembro", cls: "bg-primary/15 text-primary" },
};

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const role = user?.role || "";
  const badge = ROLE_BADGE[role] || ROLE_BADGE.CUSTOMER;
  // ADMIN = solo plataforma (sin Mi sitio, Personalizar, Crear tienda ni Catálogo:
  // la plataforma no opera inventario ni tiendas propias).
  const links = role === "ADMIN" ? platformLinks : commerceLinks;
  const [gw, setGw] = useState<{ boldConfigured: boolean; metaConfigured: boolean; metaPending?: boolean } | null>(null);
  useEffect(() => {
    apiFetch<{ boldConfigured: boolean; metaConfigured: boolean; metaPending?: boolean }>("/tenant/gateway")
      .then(setGw).catch(() => setGw(null));
  }, [pathname]);
  const metaLabel = !gw ? "…" : gw.metaConfigured ? "Conectado" : gw.metaPending ? "Pendiente" : "Sin conectar";
  const metaCls = gw?.metaConfigured ? "text-secondary" : gw?.metaPending ? "text-primary" : "text-outline";
  const boldLabel = !gw ? "…" : gw.boldConfigured ? "Live" : "Sin configurar";
  const boldCls = gw?.boldConfigured ? "text-secondary" : "text-outline";
  return (
    <div className="min-h-screen text-on-surface">
      <header className="safe-top fixed top-0 left-0 right-0 z-50 bg-surface-container/70 backdrop-blur-2xl border-b border-outline-variant/30">
        <div className="h-16 px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="gs-press flex items-center gap-2" aria-label="GrowUp Store inicio">
              <GrowupLogo size={36} />
              <span className="font-bold tracking-tight font-display">GrowUp Store</span>
            </Link>
            <span className={`hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
            {role === "ADMIN"
              ? <span className="hidden md:inline text-xs text-on-surface-variant">Vista plataforma</span>
              : <StoreSwitcher />}
          </div>
          <div className="hidden xl:block flex-1 max-w-lg">
            <input placeholder="Buscar pedidos, SKUs, campañas..." aria-label="Buscar en la consola" className="w-full bg-surface-container-low rounded-xl px-4 py-2 text-sm border border-outline-variant/30 focus:border-primary/60 placeholder:text-outline" />
          </div>
          <div className="flex items-center gap-2">
            <Link href="/consola/meta-ads-studio" className="hidden lg:inline px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-xs"><span className="text-on-surface-variant">Meta API:</span> <b className={metaCls}>{metaLabel}</b></Link>
            <Link href="/consola/pasarelas-pagos" className="hidden lg:inline px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-xs"><span className="text-on-surface-variant">Bold Gateway:</span> <b className={boldCls}>{boldLabel}</b></Link>
            {user && <span className="hidden xl:inline text-xs text-on-surface-variant truncate max-w-40">{user.email}</span>}
            {user && <button onClick={logout} className="gs-press hidden xl:inline text-xs font-bold text-primary hover:underline">Salir</button>}
          </div>
        </div>
      </header>
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-surface-container-lowest/70 backdrop-blur-2xl z-40 pt-16 border-r border-outline-variant/30 hidden md:flex flex-col">
        <nav className="flex-1 overflow-y-auto p-4 space-y-4">
          {links.map((g) => (
            <div key={g.group}>
              <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-outline">{g.group}</div>
              {g.items.map((l) => (
                <Link key={l.href} href={l.href} aria-current={pathname === l.href ? "page" : undefined}
                  className={`gs-press flex items-center justify-between px-3.5 py-2 rounded-xl text-sm ${pathname === l.href ? "bg-surface-container-high font-semibold border-l-2 border-secondary" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"}`}>
                  <span>{l.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-outline-variant/30">
          <Link href="/consola/pasarelas-pagos" className="gs-press p-3 rounded-xl gs-glass flex items-center justify-between">
            <div><div className="text-sm font-bold">Tu plan al día</div><div className="text-xs text-on-surface-variant font-semibold">{gw && (gw.boldConfigured || gw.metaConfigured) ? "Pasarelas en marcha" : "Conecta Bold y Meta →"}</div></div>
            <span className="material-symbols-outlined text-primary">verified</span>
          </Link>
        </div>
      </aside>
      <div className="md:pl-64"><main className="pt-[calc(4rem+env(safe-area-inset-top,0px))] min-h-screen">{children}</main></div>
    </div>
  );
}
