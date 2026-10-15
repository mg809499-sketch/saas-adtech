"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, getToken } from "../../lib/api-client";
import { AuthProvider } from "../../lib/auth";
import { getPlanStatus, myStores, resolveConsoleTenant } from "../../lib/billing";
import { Shell } from "../../components/shell/Shell";

const NEXT = "/consola/dashboard-central";

// Consola protegida: exige login, rol de comercio (o tienda propia) y
// membresía vigente; si no, /login, /tiendas o /planes con `reason` explícito.
// El tenant efectivo es la tienda propia más reciente, nunca el legacy.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);
  const [detail, setDetail] = useState("Verificando acceso a la consola…");

  useEffect(() => {
    (async () => {
      // Sin token legacy: la sesión puede vivir solo en cookies → refresh directo.
      if (!getToken()) {
        try {
          const data = await apiFetch<{ accessToken?: string; refreshToken?: string }>("/auth/refresh", {
            method: "POST",
            body: JSON.stringify(typeof window !== "undefined" && localStorage.getItem("gs_refresh_token")
              ? { refreshToken: localStorage.getItem("gs_refresh_token") } : {}),
          });
          if (data.accessToken) localStorage.setItem("gs_token", data.accessToken);
          if (data.refreshToken) localStorage.setItem("gs_refresh_token", data.refreshToken);
        } catch {
          router.replace(`/login?next=${NEXT}&reason=sin-sesion`);
          return;
        }
      }
      let me: { tenantId: string; role: string };
      try {
        me = await apiFetch("/auth/me");
      } catch {
        localStorage.removeItem("gs_token");
        router.replace(`/login?next=${NEXT}&reason=sin-sesion`);
        return;
      }
      // La plataforma GrowUp vive en su propia consola (sidebar distinto):
      // el ADMIN no opera tiendas desde aquí. Si ya está en plataforma,
      // se deja pasar (el layout anidado verifica el rol) para no loopear.
      if (me.role === "ADMIN") {
        if (pathname.startsWith("/consola/plataforma")) { setOk(true); return; }
        router.replace("/consola/plataforma");
        return;
      }
      // Comprador sin tienda propia: la consola de comercio no es su lugar.
      if (me.role === "CUSTOMER") {
        const owned = await myStores().catch(() => []);
        if (owned.length === 0) { router.replace("/tiendas"); return; }
      }
      setDetail("Ubicando tu tienda…");
      await resolveConsoleTenant().catch(() => {});
      setDetail("Verificando tu plan…");
      try {
        const s = await getPlanStatus();
        if (s.active) { setOk(true); return; }
      } catch { /* reintenta abajo con el base */ }
      // Fallback: el tenant almacenado puede ser de otra tienda sin plan.
      try {
        const owned = await myStores().catch(() => []);
        if (owned.length > 0) {
          localStorage.setItem("gs_console_tenant", owned[owned.length - 1].id);
          localStorage.setItem("gs_tenant", owned[owned.length - 1].id);
          localStorage.removeItem("gs_store");
          localStorage.removeItem("gs_store_slug");
        } else {
          localStorage.setItem("gs_tenant", me.tenantId);
          localStorage.removeItem("gs_store");
          localStorage.removeItem("gs_store_slug");
        }
        const s2 = await getPlanStatus();
        if (!s2.active) router.replace("/planes?reason=sin-plan");
        else setOk(true);
      } catch {
        router.replace("/planes?reason=api-caido");
      }
    })();
  }, [router]);

  if (!ok) return <div className="min-h-screen flex items-center justify-center text-sm text-on-surface-variant">{detail}</div>;
  return <AuthProvider><Shell>{children}</Shell></AuthProvider>;
}
