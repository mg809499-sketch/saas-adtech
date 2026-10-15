import { Redis } from "@upstash/redis";
import { env } from "./api-client";
import { parseStoreHost, siteDomain } from "./store-host";

// Resolución tienda→tenant con caché edge (Upstash) + fallback al API.
// Seguro en edge runtime: sin APIs de Node.
export interface StoreRef { tenantId: string; storeSlug: string; live: boolean }

let client: Redis | null | undefined;
function redis(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}

const TTL_SECONDS = 3600;

function apiBase() {
  return env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
}

async function fetchBySlug(slug: string): Promise<StoreRef | null> {
  try {
    const r = await fetch(`${apiBase()}/stores/by-slug/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!r.ok) return null;
    const s = (await r.json()) as { id?: string; slug?: string | null };
    if (!s?.id) return null;
    return { tenantId: s.id, storeSlug: slug, live: true };
  } catch {
    return null;
  }
}

async function fetchByDomain(domain: string): Promise<StoreRef | null> {
  // El API resuelve custom domains verificados; by-slug no aplica.
  try {
    const r = await fetch(`${apiBase()}/stores/by-domain/${encodeURIComponent(domain)}`, { cache: "no-store" });
    if (!r.ok) return null;
    const s = (await r.json()) as { id?: string; storeSlug?: string | null };
    if (!s?.id) return null;
    return { tenantId: s.id, storeSlug: s.storeSlug || domain, live: true };
  } catch {
    return null;
  }
}

// Lookup por slug de subdominio (mitienda.growupstore.app).
export async function resolveStoreBySlug(slug: string): Promise<StoreRef | null> {
  const key = `gs:slug:${slug}`;
  const r = redis();
  if (r) {
    try {
      const hit = await r.get<StoreRef>(key);
      if (hit?.tenantId) return hit;
    } catch { /* cae al API */ }
  }
  const ref = await fetchBySlug(slug);
  if (ref && r) {
    try { await r.set(key, ref, { ex: TTL_SECONDS }); } catch { /* best-effort */ }
  }
  return ref;
}

// Lookup por custom domain verificado.
export async function resolveStoreByDomain(domain: string): Promise<StoreRef | null> {
  const key = `gs:domain:${domain}`;
  const r = redis();
  if (r) {
    try {
      const hit = await r.get<StoreRef>(key);
      if (hit?.tenantId) return hit;
    } catch { /* cae al API */ }
  }
  const ref = await fetchByDomain(domain);
  if (ref && r) {
    try { await r.set(key, ref, { ex: TTL_SECONDS }); } catch { /* best-effort */ }
  }
  return ref;
}

// Invalidación activa: llamar tras publicar tema/SEO/bloques o vincular dominio.
export async function invalidateStore(slugOrDomain: string): Promise<void> {
  const r = redis();
  if (!r) return;
  try {
    await r.del(`gs:slug:${slugOrDomain}`, `gs:domain:${slugOrDomain}`);
  } catch { /* best-effort */ }
}

// Resolución completa para el middleware (contrato que consume).
export type HostResolution =
  | { kind: "main" }
  | { kind: "store"; ref: { slug: string } }
  | { kind: "unknown" };

export async function resolveHost(host: string | null): Promise<HostResolution> {
  const parsed = parseStoreHost(host || "", siteDomain());
  if (parsed.kind === "principal") return { kind: "main" };
  const ref = parsed.kind === "tienda"
    ? await resolveStoreBySlug(parsed.slug).catch(() => null)
    : await resolveStoreByDomain(parsed.domain).catch(() => null);
  if (ref) return { kind: "store", ref: { slug: ref.storeSlug } };
  return { kind: "unknown" };
}

// URL absoluta al dominio principal (redirects fuera del host de tienda).
export function principalUrl(path = "/"): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || `https://${siteDomain()}`).replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
