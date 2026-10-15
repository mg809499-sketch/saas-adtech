"use client";
import { useEffect, useState } from "react";
import { apiFetch, env, getTenant } from "../../../../lib/api-client";

const tabs = ["General & Negocio", "Equipo & Roles", "Facturación & Plan", "Seguridad", "Webhooks"] as const;

interface Me { id: string; email: string; name?: string | null; role: string; tenantId: string }
interface PlanStatus { active: boolean; plan: { slug: string; name: string } | null; currentPeriodEnd?: string | null }
interface Plan { slug: string; name: string; priceMonthlyUsd: number; priceMonthlyCop: number }
interface GatewayMask { boldPublicKeyMasked?: string | null; boldConfigured?: boolean; metaConfigured?: boolean; metaPending?: boolean }

export default function SettingsPage() {
  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState("");
  const [me, setMe] = useState<Me | null>(null);
  const [plan, setPlan] = useState<PlanStatus | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [gateway, setGateway] = useState<GatewayMask | null>(null);
  const [storeName, setStoreName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const tid = typeof window !== "undefined" ? getTenant() : "";

  useEffect(() => {
    apiFetch<Me>("/auth/me").then(setMe).catch(() => {});
    apiFetch<PlanStatus>("/billing/status").then(setPlan).catch(() => {});
    apiFetch<Plan[]>("/billing/plans").then(setPlans).catch(() => {});
    apiFetch<GatewayMask>("/tenant/gateway").then(setGateway).catch(() => setGateway(null));
  }, []);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };
  const saveStore = async () => {
    try {
      await apiFetch(`/stores/${tid}`, { method: "PATCH", body: JSON.stringify({ ...(storeName ? { storeName } : {}), ...(logoUrl ? { logoUrl } : {}) }) });
      say("Datos de la tienda guardados.");
    } catch (e) { say(e instanceof Error ? e.message : "Error"); }
  };
  const checkoutPlan = async (planSlug: string) => {
    try {
      await apiFetch("/billing/checkout", { method: "POST", body: JSON.stringify({ planSlug, paymentMethod: "CARD" }) });
      const s = await apiFetch<PlanStatus>("/billing/status");
      setPlan(s); say("Plan actualizado.");
    } catch (e) { say(e instanceof Error ? e.message : "Error"); }
  };
  const logout = async () => {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("gs_token");
    window.location.href = "/login";
  };

  const input = "w-full gs-input rounded-xl px-3 py-2.5 text-sm mt-1";

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 gs-glass rounded-3xl p-6"><div><h1 className="font-display text-2xl font-bold tracking-tight">Ajustes generales</h1><p className="text-sm text-on-surface-variant">{me ? `${me.email} · ${me.role}` : "Cargando sesión…"}</p></div>
      <div className="flex gap-2"><button onClick={logout} className="gs-press px-4 py-2 rounded-xl bg-surface-container-high font-semibold text-sm">Cerrar sesión</button><button onClick={saveStore} className="gs-press px-5 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-sm">Guardar cambios</button></div></div>
      {toast && <div role="status" className="p-3 rounded-xl bg-secondary/15 text-secondary text-sm font-bold">{toast}</div>}
      <div className="flex gap-2 overflow-x-auto gs-glass p-1.5 rounded-2xl" role="tablist">{tabs.map((t, i) => <button key={t} role="tab" aria-selected={tab === i} onClick={() => setTab(i)} className={`gs-press px-4 py-2 rounded-xl text-sm whitespace-nowrap ${tab === i ? "bg-surface-container-high font-bold shadow" : "text-on-surface-variant"}`}>{t}</button>)}</div>
      {tab === 0 && <div className="p-6 rounded-3xl gs-glass grid md:grid-cols-2 gap-4">
        <div><label className="text-xs font-bold">Nombre de la tienda<input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Mi Tienda" className={input} /></label></div>
        <div><label className="text-xs font-bold">Logo URL<input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" className={input} /></label></div>
      </div>}
      {tab === 1 && <div className="p-6 rounded-3xl gs-glass"><div className="font-bold">{me?.name || me?.email} — {me?.role}</div><p className="text-xs text-on-surface-variant mt-1">Gestión de equipo multi-usuario aún no disponible en la API; los roles se asignan al registrarse en tu tienda.</p></div>}
      {tab === 2 && <div className="p-6 rounded-3xl gs-glass flex flex-col gap-3">
        <div><h3 className="font-bold">Plan actual: {plan?.plan?.name ?? "sin membresía"} {plan?.active ? "(activo)" : "(inactivo)"}</h3>{plan?.currentPeriodEnd && <p className="text-sm text-on-surface-variant">Vigente hasta {new Date(plan.currentPeriodEnd).toLocaleDateString("es-CO")}</p>}</div>
        {plans.map((p) => <div key={p.slug} className="flex justify-between items-center p-3 rounded-2xl gs-glass"><span className="font-bold text-sm">{p.name} — ${p.priceMonthlyCop.toLocaleString("es-CO")} COP/mes</span><button onClick={() => checkoutPlan(p.slug)} className="gs-press px-3 py-1.5 rounded-xl bg-secondary text-on-secondary text-xs font-bold">Elegir</button></div>)}
      </div>}
      {tab === 3 && <div className="p-6 rounded-3xl gs-glass text-sm flex flex-col gap-2">
        <div>Sesión en cookies httpOnly · access 15 min + refresh rotativo 7d.</div>
        <div>Bold: {gateway?.boldPublicKeyMasked ?? "sin configurar"} · secreto: {gateway?.boldConfigured ? "guardado ✓" : "—"} · Meta: {gateway?.metaConfigured ? "conectado ✓" : gateway?.metaPending ? "pendiente de configuración" : "—"}</div>
        <button onClick={logout} className="gs-press self-start px-4 py-2 rounded-xl bg-surface-container-high font-bold text-sm">Cerrar sesión en este dispositivo</button>
      </div>}
      {tab === 4 && <div className="p-6 rounded-3xl gs-glass space-y-2">
        <div className="p-3 rounded-xl gs-glass font-mono text-sm">{env.NEXT_PUBLIC_API_URL.replace("/api/v1", "")}/api/v1/webhooks/bold — HMAC-SHA256 + idempotencia event_id</div>
        <p className="text-xs text-on-surface-variant">Configura esta URL en el dashboard de Bold con tu BOLD_WEBHOOK_SECRET.</p>
      </div>}
    </div>
  );
}
