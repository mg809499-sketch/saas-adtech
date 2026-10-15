// Ruteo por dominio (puro, testeable sin runtime).
// - dominio principal (growupstore.app, www, app) → consola/landing
// - <slug>.growupstore.app → vitrina de la tienda
// - cualquier otro host → posible custom domain verificado de una tienda

const RESERVED = new Set(["www", "app", "api", "admin", "static", "cdn", "mail", "ftp"]);
const SLUG_RE = /^[a-z0-9-]{3,30}$/;

export type HostKind =
  | { kind: "principal" }
  | { kind: "tienda"; slug: string }
  | { kind: "custom"; domain: string };

export function parseStoreHost(host: string, siteDomain: string): HostKind {
  const h = (host || "").toLowerCase().split(":")[0].trim().replace(/\.$/, "");
  const base = siteDomain.toLowerCase().replace(/^\.+/, "");
  if (!h) return { kind: "principal" };
  if (h === base || h === `www.${base}`) return { kind: "principal" };
  if (h.endsWith(`.${base}`)) {
    const slug = h.slice(0, -(base.length + 1));
    if (!slug || slug.includes(".") || RESERVED.has(slug) || !SLUG_RE.test(slug)) {
      return { kind: "principal" };
    }
    return { kind: "tienda", slug };
  }
  // localhost / IPs / previews de Vercel → principal (la consola decide).
  if (h === "localhost" || h.startsWith("127.") || h === "::1" || h.endsWith(".vercel.app")) {
    return { kind: "principal" };
  }
  return { kind: "custom", domain: h };
}

// Dominio canónico del sitio para cookies/enlaces (sin www).
export function siteDomain() {
  const raw = process.env.NEXT_PUBLIC_SITE_DOMAIN || "growupstore.app";
  return raw.toLowerCase().replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
}
