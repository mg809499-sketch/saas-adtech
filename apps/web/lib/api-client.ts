import { z } from "zod";

export const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:3002/api/v1"),
  NEXT_PUBLIC_TENANT_ID: z.string().default("demo-tenant"),
});
export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_TENANT_ID: process.env.NEXT_PUBLIC_TENANT_ID,
});

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("gs_token");
}
export const CONSOLE_TENANT_KEY = "gs_console_tenant";
export const SHOP_TENANT_KEY = "gs_shop_tenant";

export function getTenant(): string {
  if (typeof window === "undefined") return env.NEXT_PUBLIC_TENANT_ID;
  return localStorage.getItem("gs_tenant") || env.NEXT_PUBLIC_TENANT_ID;
}
// Tenant de consola aislado del de vitrina: la consola nunca lee el
// tenant de una tienda visitada (/s/[slug]).
export function getConsoleTenant(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CONSOLE_TENANT_KEY) || localStorage.getItem("gs_tenant");
}
export function setConsoleTenant(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONSOLE_TENANT_KEY, id);
  localStorage.setItem("gs_tenant", id);
  localStorage.removeItem("gs_store");
  localStorage.removeItem("gs_store_slug");
}

function saveLegacyToken(accessToken?: string, refreshToken?: string) {
  if (typeof window === "undefined") return;
  if (accessToken) localStorage.setItem("gs_token", accessToken);
  if (refreshToken) localStorage.setItem("gs_refresh_token", refreshToken);
}

let refreshFlight: Promise<unknown> | null = null;
function refreshSession(): Promise<unknown> {
  // Una sola llamada en vuelo: pestañas/componentes concurrentes comparten el refresh.
  // Prioridad cookie httpOnly; fallback refresh token del body (navegadores sin cookies cross-site).
  if (!refreshFlight) {
    const legacy = typeof window !== "undefined" ? localStorage.getItem("gs_refresh_token") : null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    refreshFlight = fetch(`${env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-request-id": `${Date.now()}` },
      body: JSON.stringify(legacy ? { refreshToken: legacy } : {}),
      credentials: "include",
      signal: ctrl.signal,
    }).then(async (res) => {
      if (!res.ok) {
        // Refresh muerto (401: secreto rotado o token revocado): limpia
        // el access para no reintentar en loop; conserva el refresh
        // guardado solo si fue fallo de red/timeout, no 401.
        if (typeof window !== "undefined" && res.status === 401) {
          localStorage.removeItem("gs_token");
        }
        throw new Error("refresh_required");
      }
      const data = (await res.json().catch(() => ({}))) as { accessToken?: string; refreshToken?: string };
      saveLegacyToken(data.accessToken, data.refreshToken);
      return data;
    }).finally(() => { clearTimeout(timer); refreshFlight = null; });
  }
  return refreshFlight;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-tenant-id": getTenant(),
    "x-request-id": typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`,
    ...((init.headers as Record<string, string>) || {}),
  };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, { ...init, headers, credentials: "include" });
  // Sesión expirada (access 15min) pero refresh vigente (7d): reintenta una vez.
  if (res.status === 401 && retry && !path.startsWith("/auth/")) {
    try {
      await refreshSession();
      return apiFetch<T>(path, init, false);
    } catch {
      /* sin refresh válido: cae al error 401 normal */
    }
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `API ${res.status} ${path}`);
  }
  return res.json() as Promise<T>;
}

export interface ProductVariant {
  id: string; color?: string | null; size?: string | null; sku?: string | null;
  priceDelta: number; stock: number;
}
export interface ShopProduct {
  id: string; name: string; slug: string; sku: string; description?: string | null;
  price: number; compareAtPrice?: number | null; stock: number; category: string;
  categoryId?: string | null; imageUrl?: string | null; images?: string[] | null;
  variants?: ProductVariant[];
}
export interface ShopOrderItem { productId: string; name: string; unitPrice: number; qty: number; variantId?: string | null; variantLabel?: string | null }
export interface ShopOrder {
  id: string; status: string; subtotal: number; shippingCost: number; total: number;
  paymentMethod: string; boldTxId?: string | null; items: ShopOrderItem[];
  shipping: { name: string; phone: string; address: string; city: string };
}

// Para Route Handlers / Server Components: reenvía cookies httpOnly al API.
// Acepta x-tenant-id / Authorization vía init.headers (el servidor no tiene
// localStorage: quien llama debe pasar el tenant explícito).
export async function apiFetchServer<T>(path: string, cookieHeader: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-request-id": typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`,
      Cookie: cookieHeader,
      ...((init.headers as Record<string, string>) || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API ${res.status} ${path}`);
  return res.json() as Promise<T>;
}
