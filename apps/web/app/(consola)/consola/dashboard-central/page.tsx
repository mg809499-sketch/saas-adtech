"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, ShopOrder } from "../../../../lib/api-client";
import { getPlanStatus } from "../../../../lib/billing";
import { SalesWave, PeakBars, Sparkline, Donut } from "../../../../components/charts/charts";
import { Reveal, CountUp, ProgressBar } from "../../../../components/ui/motion";
import { cop } from "../../../../lib/cart";

// Dashboard real por tenant: sin mocks. Tienda nueva → estados vacíos + onboarding.
export default function DashboardPage() {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [plan, setPlan] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<ShopOrder[]>("/orders").catch(() => apiFetch<ShopOrder[]>("/orders/mine").catch(() => [] as ShopOrder[])),
      getPlanStatus().catch(() => null),
    ]).then(([o, s]) => { setOrders(o); setPlan(s?.plan?.name || ""); setLoaded(true); });
  }, []);

  const paid = useMemo(() => orders.filter((o) => o.status === "PAID"), [orders]);
  const sales = useMemo(() => paid.reduce((a, o) => a + o.total, 0), [paid]);
  const empty = loaded && orders.length === 0;

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto flex flex-col gap-6">
      <Reveal><div><h1 className="text-2xl lg:text-3xl font-extrabold">GrowUp Store — Dashboard Central</h1><p className="text-sm text-on-surface-variant">Tu tienda en tiempo real · Plan {plan}</p></div></Reveal>

      {empty && (
        <div className="p-6 rounded-3xl bg-secondary/10 border border-secondary/30 text-center flex flex-col gap-2">
          <div className="text-3xl">🚀</div>
          <h2 className="font-bold text-lg">Tu tienda está recién creada: 0 pedidos, 0 ventas</h2>
          <p className="text-sm text-on-surface-variant">Agrega tu primer producto y comparte tu vitrina para empezar a vender.</p>
          <div className="flex flex-wrap justify-center gap-2 mt-1">
            <Link href="/consola/catalogo-inventario" className="px-5 py-2.5 rounded-2xl bg-primary-container text-on-primary-container font-bold text-sm">Agregar producto</Link>
            <Link href="/consola/sitio" className="px-5 py-2.5 rounded-2xl bg-surface-container-high font-bold text-sm">Personalizar mi sitio</Link>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-4">
        {[
          { l: "Ventas Totales", v: <span>$<CountUp value={sales} /></span>, s: "COP", spark: paid.map((o) => o.total).slice(-8) },
          { l: "Órdenes", v: <CountUp value={orders.length} />, s: "total", spark: orders.map((_, i) => i + 1).slice(-8) },
          { l: "Aprobadas", v: <span><CountUp value={paid.length} />/<CountUp value={orders.length} /></span>, s: "pagadas", spark: [paid.length, orders.length] },
          { l: "Ticket medio", v: <span>$<CountUp value={paid.length ? Math.round(sales / paid.length) : 0} /></span>, s: "COP", spark: paid.map((o) => o.total).slice(-8) },
        ].map((k, i) => (
          <Reveal key={k.l} delay={i * 70}>
            <div className="gs-tilt gs-card p-5 rounded-3xl gs-glass">
              <div className="text-xs uppercase text-outline font-bold">{k.l}</div>
              <div className="text-2xl font-black">{k.v} <span className="text-xs font-medium text-outline">{k.s}</span></div>
              <div className="mt-2"><Sparkline data={k.spark.length > 1 ? k.spark : [0, 0]} /></div>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        <Reveal className="lg:col-span-8" delay={100}>
          <div className="gs-card p-6 rounded-3xl gs-glass h-full">
            <div className="flex items-center justify-between"><div><h3 className="font-bold">Rendimiento de tu tienda</h3><p className="text-xs text-outline">Ventas Bold de los últimos pedidos</p></div></div>
            <SalesWave id="dash" />
          </div>
        </Reveal>
        <Reveal className="lg:col-span-4" delay={160}>
          <div className="gs-card p-6 rounded-3xl gs-glass h-full flex flex-col">
            <h3 className="font-bold">Estado de pedidos</h3>
            <p className="text-xs text-outline mb-2">Distribución por estado</p>
            <PeakBars data={[
              { label: "Pagadas", value: paid.length, peak: true },
              { label: "Pend.", value: orders.filter((o) => o.status === "PENDING_PAYMENT").length },
              { label: "Fallidas", value: orders.filter((o) => o.status === "FAILED").length },
              { label: "Cancel.", value: orders.filter((o) => o.status === "CANCELLED").length },
            ]} />
            <div className="mt-3"><ProgressBar pct={orders.length ? (paid.length / orders.length) * 100 : 0} /></div>
          </div>
        </Reveal>
      </div>

      <Reveal delay={80}>
        <div className="p-6 rounded-3xl gs-glass">
          <div className="flex items-center justify-between"><h3 className="font-bold">Últimas órdenes</h3><Link href="/consola/ordenes-pedidos" className="text-xs font-bold text-primary">Ver todas →</Link></div>
          {orders.length === 0 && loaded ? (
            <p className="text-sm text-outline mt-2">Sin órdenes todavía.</p>
          ) : (
            <div className="overflow-x-auto mt-3"><table className="w-full text-sm min-w-[600px]"><thead><tr className="text-xs uppercase text-outline"><th className="text-left py-2">Orden</th><th className="text-left">Cliente</th><th className="text-right">Monto</th><th className="text-center">Estado</th></tr></thead>
            <tbody>{orders.slice(0, 5).map((o) => <tr key={o.id} className="border-t border-outline-variant/20 gs-row-hover"><td className="py-2 font-bold text-primary font-mono">#{o.id.slice(-6)}</td><td>{o.shipping?.name}<span className="block text-xs text-outline">{o.shipping?.city}</span></td><td className="text-right font-bold">{cop(o.total)}</td><td className="text-center text-xs font-bold">{o.status}</td></tr>)}</tbody></table></div>
          )}
        </div>
      </Reveal>

      <Reveal delay={140}>
        <div className="gs-card p-6 rounded-3xl gs-glass flex flex-col sm:flex-row items-center gap-5">
          <Donut pct={orders.length ? Math.round((paid.length / orders.length) * 1000) / 10 : 0} label="Conversión a pago" />
          <p className="text-sm text-on-surface-variant">Comparte tu vitrina para recibir pedidos. Tu sitio, tus datos, tu marca.</p>
        </div>
      </Reveal>
    </div>
  );
}
