"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../../lib/api-client";
import { CountUp, Reveal } from "../../../../components/ui/motion";

interface Metrics {
  stores: number; activeSubs: number; trials: number; pastDue: number;
  orders: number; paidVolume: number; mrrUsd: number;
  plans: { slug: string; name: string; subs: number }[];
}

export default function PlataformaPanorama() {
  const [m, setM] = useState<Metrics | null>(null);
  const [pending, setPending] = useState({ affiliates: 0, campaigns: 0 });
  useEffect(() => {
    apiFetch<Metrics>("/admin/metrics").then(setM).catch(() => setM(null));
    Promise.all([
      apiFetch<unknown[]>("/admin/affiliates?status=PENDING").catch(() => []),
      apiFetch<unknown[]>("/admin/meta-ads/campaigns?status=PENDING_REVIEW").catch(() => []),
    ]).then(([a, c]) => setPending({ affiliates: (a as unknown[]).length, campaigns: (c as unknown[]).length }));
  }, []);
  if (!m) return <div className="p-6 text-sm text-on-surface-variant">Cargando panorama de plataforma…</div>;
  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto flex flex-col gap-6">
      <div><h1 className="text-3xl font-extrabold">Plataforma GrowUp</h1><p className="text-sm text-on-surface-variant">El negocio principal: tiendas clientes, planes y aprobaciones.</p></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[["Tiendas clientes", <CountUp key="a" value={m.stores} />], ["MRR USD", <span key="b">$<CountUp value={m.mrrUsd} /></span>], ["Subs activas", <CountUp key="c" value={m.activeSubs} />], ["Trials", <CountUp key="d" value={m.trials} />]].map(([l, v], i) => (
          <Reveal key={l as string} delay={i * 60}><div className="gs-card gs-glass rounded-2xl p-5"><div className="text-xs uppercase text-outline font-bold">{l}</div><div className="text-2xl font-black">{v}</div></div></Reveal>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="gs-glass rounded-3xl p-6">
          <h3 className="font-bold mb-2">Pendientes de tu decisión</h3>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/consola/plataforma/red" className="flex justify-between px-3 py-2 rounded-xl bg-surface-container-high font-bold">Alianzas por aprobar <span>{pending.affiliates}</span></Link>
            <Link href="/consola/plataforma/meta-ads" className="flex justify-between px-3 py-2 rounded-xl bg-surface-container-high font-bold">Campañas por revisar <span>{pending.campaigns}</span></Link>
          </div>
        </div>
        <div className="gs-glass rounded-3xl p-6">
          <h3 className="font-bold mb-2">Suscripciones por plan</h3>
          {m.plans.map((p) => <div key={p.slug} className="flex justify-between text-sm py-1.5 border-t border-outline-variant/10"><span>{p.name}</span><b>{p.subs}</b></div>)}
          <div className="text-xs text-outline mt-2">En mora: {m.pastDue}</div>
          <Link href="/consola/plataforma/suscripciones" className="inline-block mt-3 text-sm font-bold text-primary">Gestionar compras y suscripciones →</Link>
        </div>
      </div>
    </div>
  );
}
