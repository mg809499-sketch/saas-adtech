"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { GrowupLogo } from "../../../components/brand/GrowupLogo";
import { useAuth } from "../../../lib/auth";
import { apiFetch } from "../../../lib/api-client";

function LoginForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("demo@growupstore.co");
  const [password, setPassword] = useState("demo1234");
  const [name, setName] = useState(""); const [error, setError] = useState("");
  const [storeName, setStoreName] = useState("");
  const { login, register } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const reason = params.get("reason");
  const storeSlug = params.get("store") || (typeof window !== "undefined" ? localStorage.getItem("gs_store_slug") || "" : "");
  const [restoring, setRestoring] = useState(false);
  const [busy, setBusy] = useState(false);
  const submittedRef = useRef(false);
  // `next` saneado: solo rutas internas (evita quedarse en login por
  // un next abierto o malformado tras el rebote de "Abrir consola").
  const rawNext = params.get("next") || "/tiendas";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/tiendas";

  const REASONS: Record<string, string> = {
    "sin-sesion": "Tu sesión expiró. Entra de nuevo o espera: intentamos restaurarla.",
    "sin-plan": "Esa cuenta no tiene membresía activa. Elige un plan para continuar.",
    "api-caido": "No pudimos contactar el servidor. Revisa que el API esté en línea e inténtalo de nuevo.",
  };

  // Recuperación silenciosa: si vienes rebotado de una ruta privada y el
  // refresh de 7 días sigue vigente (cookie o token guardado), entras sin contraseña.
  useEffect(() => {
    if (!reason || submittedRef.current) return;
    setRestoring(true);
    const legacy = typeof window !== "undefined" ? localStorage.getItem("gs_refresh_token") : null;
    apiFetch<{ accessToken?: string; refreshToken?: string; user: { tenantId: string } }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify(legacy ? { refreshToken: legacy } : {}),
    })
      .then((data) => {
        if (data.accessToken) localStorage.setItem("gs_token", data.accessToken);
        if (data.refreshToken) localStorage.setItem("gs_refresh_token", data.refreshToken);
        // No pisar contexto con el tenant legacy: solo fija si no hay ninguno.
        if (data.user?.tenantId && !localStorage.getItem("gs_tenant") && !localStorage.getItem("gs_store")) {
          localStorage.setItem("gs_tenant", data.user.tenantId);
        }
        // Si vuelve a consola, el layout resolverá al console tenant propio.
        router.push(next);
      })
      .catch(() => {})
      .finally(() => setRestoring(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Contexto de vitrina: fija la tienda antes de registrar/entrar.
  useEffect(() => {
    if (!storeSlug) return;
    apiFetch<{ id: string; name: string | null }>(`/stores/by-slug/${storeSlug}`)
      .then((s) => {
        localStorage.setItem("gs_store", s.id);
        localStorage.setItem("gs_tenant", s.id);
        setStoreName(s.name || "");
      })
      .catch(() => {});
  }, [storeSlug]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    submittedRef.current = true;
    setBusy(true);
    setError("");
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password, name, storeSlug || undefined);
      // Entrando a zona privada: fija el contexto en la tienda propia más
      // reciente (no en el tenant legacy de la fila de usuario).
      if (next.startsWith("/consola") || next.startsWith("/admin")) {
        const { resolveConsoleTenant } = await import("../../../lib/billing");
        await resolveConsoleTenant().catch(() => {});
      }
      router.replace(next);
      // Red de seguridad: si el App Router no consuma la navegación
      // (quedas en /login), fuerza navegación dura al destino.
      setTimeout(() => {
        if (typeof window !== "undefined" && window.location.pathname.startsWith("/login")) {
          window.location.href = next;
        }
      }, 1500);
    } catch (err) { setError(err instanceof Error ? err.message : "Error de autenticación"); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-md mx-auto p-5 lg:p-8">
      <div className="flex items-center gap-2 font-bold text-lg"><GrowupLogo size={36} /> GrowUp Store</div>
      <h1 className="text-2xl font-extrabold mt-4">{mode === "login" ? "Entra a tu cuenta" : "Crea tu cuenta"}</h1>
      <p className="text-sm text-on-surface-variant">Necesitas login para comprar{storeName ? ` en ${storeName}` : ""}. Demo: <code>demo@growupstore.co / demo1234</code></p>
      {reason && REASONS[reason] && <p role="status" className="text-sm font-bold text-primary mt-2">{REASONS[reason]}</p>}
      {restoring && <p className="text-sm text-on-surface-variant mt-2">Restaurando tu sesión…</p>}
      <div className="flex bg-surface-container-high rounded-2xl p-1 mt-4">
        {(["login", "register"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`flex-1 py-2 rounded-xl text-sm font-bold ${mode === m ? "bg-surface-container shadow" : "text-on-surface-variant"}`}>{m === "login" ? "Entrar" : "Registrarme"}</button>
        ))}
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3 mt-4">
        {mode === "register" && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className="bg-surface-container px-4 py-2.5 rounded-2xl text-sm border border-outline-variant/30" />}
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" type="email" className="bg-surface-container px-4 py-2.5 rounded-2xl text-sm border border-outline-variant/30" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña (mín. 8)" type="password" className="bg-surface-container px-4 py-2.5 rounded-2xl text-sm border border-outline-variant/30" />
        {error && <div className="text-sm text-error font-bold">{error}</div>}
        <button type="submit" disabled={busy || restoring} className="py-3 rounded-2xl bg-primary-container text-on-primary-container font-bold disabled:opacity-50">
          {busy ? "Entrando…" : mode === "login" ? "Entrar y seguir comprando" : "Crear cuenta y seguir comprando"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
