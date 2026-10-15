import { NextRequest, NextResponse } from "next/server";
import { principalUrl, resolveHost } from "./lib/storefront";

// Middleware host-first para hosting $0 multi-tienda:
// - Dominio principal (apex/www/app/localhost): app GrowUp (lógica de sesión
//   y roles intacta abajo).
// - Subdominio <slug>.apex o dominio propio verificado: rewrite interno a
//   /s/[slug]/... (la vitrina existente, sin duplicar código).
// - Rutas /api/* nunca se reescriben (los Route Handlers autentican solos).
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) return NextResponse.next();

  const host = req.headers.get("host");
  const resolved = await resolveHost(host).catch(() => ({ kind: "main" }) as const);

  if (resolved.kind === "store") {
    const slug = resolved.ref.slug;
    // Consola/admin/login no existen en hosts de tienda → dominio principal.
    if (
      pathname.startsWith("/consola") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/crear-tienda") ||
      pathname.startsWith("/planes") ||
      pathname.startsWith("/checkout") ||
      pathname.startsWith("/mis-pedidos") ||
      pathname.startsWith("/pedido")
    ) {
      return NextResponse.redirect(principalUrl(pathname + req.nextUrl.search));
    }
    const url = req.nextUrl.clone();
    url.pathname = `/s/${slug}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  if (resolved.kind === "unknown") {
    // Subdominio/dominio que no es tienda viva → directorio en el principal.
    return NextResponse.redirect(principalUrl("/tiendas"));
  }

  return privateGuard(req);
}

// Guarda rutas privadas en servidor: la sesión vive en cookies httpOnly (gs_access).
// Verifica contra el API reenviando Cookie; sin fetch cliente ni flash.
async function privateGuard(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPrivate = pathname.startsWith("/consola") || pathname.startsWith("/admin");
  if (!isPrivate) return NextResponse.next();
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api/v1";
  const cookie = req.headers.get("cookie") || "";
  // Sin cookie no hay nada que verificar en servidor (la app también usa
  // Bearer + refresh en body): deja pasar y el layout cliente decide con
  // `reason` explícito. Rebotar aquí causaba el loop login→consola→login
  // en navegadores que no persisten cookies cross-site.
  if (!cookie) return NextResponse.next();
  try {
    let me = await fetch(`${api}/auth/me`, { headers: { Cookie: cookie }, cache: "no-store" });
    // Access de 15min vencido pero refresh de 7d vigente: restaura en
    // servidor y reenvía los Set-Cookie al navegador antes de decidir.
    if (!me.ok) {
      const r = await fetch(`${api}/auth/refresh`, {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: "{}",
        cache: "no-store",
      }).catch(() => null);
      if (r && r.ok) {
        me = await fetch(`${api}/auth/me`, {
          headers: { Cookie: [cookie, r.headers.get("set-cookie") || ""].filter(Boolean).join("; ") },
          cache: "no-store",
        });
        if (me.ok) {
          const next = NextResponse.next();
          const setCookie = r.headers.get("set-cookie");
          if (setCookie) next.headers.append("set-cookie", setCookie);
          // Sigue al gate de rol con la sesión restaurada.
          const user = (await me.json()) as { role?: string };
          if (pathname.startsWith("/admin") && user.role !== "ADMIN") {
            const url = req.nextUrl.clone();
            url.pathname = "/";
            return NextResponse.redirect(url);
          }
          return next;
        }
      }
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      url.searchParams.set("reason", "sin-sesion");
      return NextResponse.redirect(url);
    }
    const user = (await me.json()) as { role?: string };
    // Consola de plataforma: solo ADMIN (el layout cliente también lo exige).
    if (pathname.startsWith("/consola/plataforma") && user.role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/consola/dashboard-central";
      return NextResponse.redirect(url);
    }
    // Gate de rol: /admin solo ADMIN; /consola solo MERCHANT/ADMIN o
    // CUSTOMER con tienda propia (el layout cliente refina con plan).
    if (pathname.startsWith("/admin") && user.role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/consola")) {
      if (user.role === "ADMIN" || user.role === "MERCHANT") return NextResponse.next();
      // CUSTOMER: permite si tiene tienda propia, si no → /tiendas.
      try {
        const mine = await fetch(`${api}/stores/mine`, { headers: { Cookie: cookie }, cache: "no-store" });
        if (mine.ok) {
          const stores = (await mine.json().catch(() => [])) as unknown[];
          if (Array.isArray(stores) && stores.length > 0) return NextResponse.next();
        }
      } catch { /* cae al redirect de abajo */ }
      const url = req.nextUrl.clone();
      url.pathname = "/tiendas";
      url.searchParams.set("reason", "sin-tienda");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    url.searchParams.set("reason", "api-caido");
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|growup-logo.svg|.*\\..*).*)"],
};
