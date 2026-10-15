"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth";
import { checkoutPlan, getPlans, PlanInfo } from "../../../lib/billing";
import { Reveal } from "../../../components/ui/motion";

export default function PlanesPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { getPlans().then(setPlans).catch(() => setMsg("No se pudo cargar planes del servidor.")); }, []);
  useEffect(() => {
    const reason = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("reason") : null;
    if (reason === "sin-plan") setMsg("Tu cuenta aún no tiene membresía activa. Elige un plan para abrir tu consola.");
    if (reason === "api-caido") setMsg("No pudimos verificar tu plan (API fuera de línea). Inténtalo de nuevo.");
  }, []);

  const buy = async (slug: string) => {
    if (!user) { window.location.href = "/login?next=/planes"; return; }
    setBusy(slug); setMsg("");
    try {
      await checkoutPlan(slug, "PSE");
      setMsg("¡Plan activado! Ahora crea tu tienda.");
      setTimeout(() => { window.location.href = "/crear-tienda"; }, 1200);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Falló la compra"); }
    finally { setBusy(null); }
  };

  return (
    <div className="max-w-6xl mx-auto p-5 lg:p-8 flex flex-col gap-6">
      <div className="text-center"><h1 className="text-3xl font-extrabold">GrowUp Store — Elige tu plan</h1><p className="text-sm text-on-surface-variant">Pago simulado Bold · Activa al instante · Crea hasta 1, 3 o 5 tiendas según el plan.</p></div>
      {msg && <div className="p-3 rounded-xl bg-secondary/15 text-secondary text-sm font-bold text-center">{msg}</div>}
      <div className="grid md:grid-cols-3 gap-5">
        {plans.map((p, i) => (
          <Reveal key={p.slug} delay={i * 80}>
            <div className="gs-tilt gs-card gs-glass rounded-3xl p-6 flex flex-col h-full">
              {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-full h-36 rounded-2xl object-cover mb-3" />}
              <h3 className="font-bold text-lg">GrowUp Store {p.name}</h3>
              <div className="text-4xl font-black mt-2">${p.priceMonthlyCop.toLocaleString("es-CO")}<span className="text-sm font-normal text-outline"> COP/mes</span></div>
              <ul className="text-sm mt-3 space-y-1.5 text-on-surface-variant">
                <li>· Hasta {p.maxStores} tienda{p.maxStores > 1 ? "s" : ""}</li>
                <li>· {p.maxProducts < 0 ? "Productos ilimitados" : `Hasta ${p.maxProducts} productos`}</li>
                {p.features?.ads && <li>· Meta Ads Studio</li>}
                {p.features?.affiliates && <li>· Red Aliada</li>}
              </ul>
              <button disabled={busy === p.slug} onClick={() => buy(p.slug)} className="mt-5 py-3 rounded-2xl bg-primary-container text-on-primary-container font-bold disabled:opacity-50">
                {busy === p.slug ? "Procesando…" : "Comprar con Bold"}
              </button>
            </div>
          </Reveal>
        ))}
      </div>
      <p className="text-center text-xs text-outline">¿Ya tienes plan? <Link href="/crear-tienda" className="text-primary font-bold">Crea tu tienda →</Link></p>
    </div>
  );
}
