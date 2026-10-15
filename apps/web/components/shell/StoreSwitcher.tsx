"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, getTenant } from "../../lib/api-client";

interface Mine { id: string; storeName: string | null; storeSlug: string | null; subscription: { status: string; plan: { name: string } } | null }

// Selector de tienda propia en la consola + badge del plan.
export function StoreSwitcher() {
  const [stores, setStores] = useState<Mine[]>([]);
  const [current, setCurrent] = useState(getTenant());
  const [plan, setPlan] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    apiFetch<Mine[]>("/stores/mine").then(setStores).catch(() => setStores([]));
    apiFetch<{ active: boolean; plan: { name: string } | null }>("/billing/status")
      .then((s) => setPlan(s.plan ? s.plan.name : "Sin plan")).catch(() => {});
  }, []);

  const currentStore = stores.find((s) => s.id === current);

  const switchTo = async (id: string) => {
    localStorage.setItem("gs_console_tenant", id);
    localStorage.setItem("gs_tenant", id);
    localStorage.removeItem("gs_store");
    localStorage.removeItem("gs_store_slug");
    try {
      const legacy = localStorage.getItem("gs_refresh_token");
      const r = await apiFetch<{ accessToken?: string; refreshToken?: string }>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify(legacy ? { refreshToken: legacy } : {}),
      });
      if (r.accessToken) localStorage.setItem("gs_token", r.accessToken);
      if (r.refreshToken) localStorage.setItem("gs_refresh_token", r.refreshToken);
    } catch { /* conserva el token actual */ }
    setOpen(false);
    window.location.reload();
  };

  return (
    <div className="relative flex items-center gap-2">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-bright text-xs font-semibold border border-outline-variant/40">
        <span className="material-symbols-outlined text-secondary text-[16px]">store</span>
        <span className="max-w-32 truncate">{currentStore?.storeName || "Mis tiendas"}</span>
        <span className="material-symbols-outlined text-outline text-[16px]">expand_more</span>
      </button>
      <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-secondary/15 text-secondary text-[10px] font-bold">{plan}</span>
      {open && (
        <div className="absolute top-10 left-0 w-64 gs-glass-strong rounded-2xl p-2 z-50 flex flex-col gap-1">
          {stores.map((s) => (
            <button key={s.id} onClick={() => switchTo(s.id)} className={`text-left px-3 py-2 rounded-xl text-sm hover:bg-white/5 ${s.id === current ? "font-bold text-primary" : ""}`}>
              <span className="block">{s.storeName || s.id.slice(0, 8)}</span>
              <span className="block text-[11px] text-outline font-mono">{s.storeSlug} · {s.subscription?.plan.name} {s.subscription?.status}</span>
            </button>
          ))}
          <Link href="/crear-tienda" className="px-3 py-2 rounded-xl text-sm font-bold text-secondary hover:bg-white/5">+ Nueva tienda</Link>
        </div>
      )}
    </div>
  );
}
