"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api-client";
import { Donut, Sparkline } from "../../../components/charts/charts";
import { CountUp, Reveal, TiltZone } from "../../../components/ui/motion";

export default function AdminHome() {
  const [m, setM] = useState<{ stores: number; activeSubs: number; trials: number; pastDue: number; orders: number; paidVolume: number; mrrUsd: number; plans: { slug: string; name: string; subs: number }[] } | null>(null);
  useEffect(() => { apiFetch<typeof m>("/admin/metrics").then(setM).catch(() => setM(null)); }, []);
  if (!m) return <div className="p-6 text-sm text-on-surface-variant">Cargando métricas globales…</div>;
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">Panorama de plataforma</h1>
      <TiltZone className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[["Tiendas", <CountUp key="a" value={m.stores} />, [2, 3, 3, 4, 4, 5, 5, m.stores]], ["MRR USD", <span key="b">$<CountUp value={m.mrrUsd} /></span>, [0, 29, 79, 79, 108, 150, 200, m.mrrUsd]], ["Órdenes", <CountUp key="c" value={m.orders} />, [4, 6, 8, 10, 12, 14, 16, m.orders]], ["Volumen PAID", <span key="d">$<CountUp value={m.paidVolume} /></span>, [10, 20, 30, 40, 50, 60, 70, 80]]].map(([l, v, s], i) => (
          <Reveal key={l as string} delay={i * 60}><div className="gs-tilt gs-card gs-glass rounded-2xl p-5"><div className="text-xs uppercase text-outline font-bold">{l}</div><div className="text-2xl font-black">{v}</div><div className="mt-2"><Sparkline data={s as number[]} color="#a5b4fc" /></div></div></Reveal>
        ))}
      </TiltZone>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="gs-glass rounded-3xl p-6"><h3 className="font-bold mb-3">Suscripciones por plan</h3>{m.plans.map((p) => <div key={p.slug} className="flex justify-between text-sm py-1.5 border-t border-outline-variant/10"><span>{p.name}</span><b>{p.subs}</b></div>)}<div className="text-xs text-outline mt-2">Trials: {m.trials} · En mora: {m.pastDue} · Activos: {m.activeSubs}</div></div>
        <div className="gs-glass rounded-3xl p-6 flex items-center gap-6"><Donut pct={m.orders ? Math.min(100, (m.activeSubs / Math.max(1, m.stores)) * 100) : 0} label="Tiendas con plan" /><p className="text-sm text-on-surface-variant">Cobertura de membresía sobre el total de tiendas creadas.</p></div>
      </div>
    </div>
  );
}
