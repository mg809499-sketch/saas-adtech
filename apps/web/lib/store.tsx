"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch, env } from "./api-client";

export interface StoreInfo { id: string; name: string | null; storeName?: string | null; slug: string | null; logoUrl: string | null; customDomain?: string | null; theme?: Record<string, string> | null; seo?: { title?: string; description?: string } | null }
interface StoreCtx { store: StoreInfo | null; ready: boolean; error: string }
const Ctx = createContext<StoreCtx>({ store: null, ready: false, error: "" });
export const useStore = () => useContext(Ctx);

// Fija el contexto de tienda pública: resuelve el slug y deja gs_store/gs_tenant.
export function StoreProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    apiFetch<StoreInfo>(`/stores/by-slug/${slug}`)
      .then((s) => {
        if (!live) return;
        // Contexto de vitrina aislado: la consola vive en gs_console_tenant
        // y se restaura al volver (resolveConsoleTenant la prefiere).
        localStorage.setItem("gs_store", s.id);
        localStorage.setItem("gs_shop_tenant", s.id);
        localStorage.setItem("gs_tenant", s.id);
        if (s.slug) localStorage.setItem("gs_store_slug", s.slug);
        setStore(s);
      })
      .catch(() => live && setError("Tienda no encontrada o no disponible."));
    return () => { live = false; };
  }, [slug]);

  return <Ctx.Provider value={{ store, ready: !!store, error }}>{children}</Ctx.Provider>;
}

export function storeApi(slug: string) {
  return `${env.NEXT_PUBLIC_API_URL}`;
}
