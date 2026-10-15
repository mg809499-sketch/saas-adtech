import { apiFetch } from "./api-client";

export interface PlanInfo { slug: string; name: string; priceMonthlyUsd: number; priceMonthlyCop: number; imageUrl?: string | null; maxStores: number; maxProducts: number; features?: Record<string, boolean> }
export const cop = (n: number) => `$${Number(n || 0).toLocaleString("es-CO")} COP`;
export interface PlanStatus {
  active: boolean; status: string;
  plan: { slug: string; name: string; maxStores: number; maxProducts: number } | null;
  tenant: { id: string; name: string; storeName: string | null; storeSlug: string | null } | null;
  usage: { products: number };
}

export const getPlans = () => apiFetch<PlanInfo[]>("/billing/plans");
export const getPlanStatus = () => apiFetch<PlanStatus>("/billing/status");
export const checkoutPlan = (planSlug: string, paymentMethod = "PSE") =>
  apiFetch("/billing/checkout", { method: "POST", body: JSON.stringify({ planSlug, paymentMethod }) });

export interface StoreInfo { id: string; name: string; storeName: string | null; storeSlug: string | null; logoUrl?: string | null; theme?: Record<string, string> | null; seo?: { title?: string; description?: string } | null; subscription: { status: string; plan: PlanInfo } | null; _count: { products: number; orders: number } }
export const myStores = () => apiFetch<StoreInfo[]>("/stores/mine");

// La fila de usuario nunca cambia de tenant al crear tienda, así que tras el
// login el contexto caería al tenant legacy (ej. demo con datos seed) en vez
// de a la tienda que el usuario creó. Resuelve el tenant de consola aislado
// de la vitrina: prefiere el console guardado si sigue siendo propio, luego
// el actual si es propio, si no la propia más reciente.
export async function resolveConsoleTenant(): Promise<string> {
  const stores = await myStores().catch(() => [] as StoreInfo[]);
  if (typeof window === "undefined") return "";
  const owned = new Set(stores.map((s) => s.id));
  const savedConsole = localStorage.getItem("gs_console_tenant") || "";
  if (savedConsole && owned.has(savedConsole)) {
    localStorage.setItem("gs_tenant", savedConsole);
    localStorage.removeItem("gs_store");
    localStorage.removeItem("gs_store_slug");
    return savedConsole;
  }
  const current = localStorage.getItem("gs_tenant") || "";
  if (current && owned.has(current)) {
    localStorage.setItem("gs_console_tenant", current);
    localStorage.removeItem("gs_store");
    localStorage.removeItem("gs_store_slug");
    return current;
  }
  if (stores.length > 0) {
    const latest = stores[stores.length - 1];
    localStorage.setItem("gs_console_tenant", latest.id);
    localStorage.setItem("gs_tenant", latest.id);
    localStorage.removeItem("gs_store");
    localStorage.removeItem("gs_store_slug");
    return latest.id;
  }
  return current;
}export const checkSlug = (slug: string) => apiFetch<{ available: boolean; reason?: string }>(`/stores/check-slug?slug=${encodeURIComponent(slug)}`);
export type StoreTemplate = "minimal" | "catalog" | "landing";
export const createStore = (data: { name: string; slug: string; logoUrl?: string; templateSlug?: StoreTemplate }, idempotencyKey?: string) =>
  apiFetch<{ tenant: StoreInfo; subscription: unknown; storeUrl?: string; deduped?: boolean }>("/stores", {
    method: "POST",
    body: JSON.stringify(data),
    ...(idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : {}),
  });
export const getOnboarding = (tenantId: string) =>
  apiFetch<{ storeUrl: string | null; template: string; items: { key: string; done: boolean; href: string; label: string }[]; done: number }>(`/stores/${tenantId}/onboarding`);
