"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ShopOrder } from "../../../lib/api-client";
import { useAuth } from "../../../lib/auth";
import { cop } from "../../../lib/cart";

const badge = (s: string) =>
  s === "PAID" ? "bg-secondary/15 text-secondary" : s === "PENDING_PAYMENT" ? "bg-tertiary/15 text-tertiary" : s === "FAILED" ? "bg-error/15 text-error" : "bg-surface-container-high text-outline";

export default function MisPedidosPage() {
  const { user, ready } = useAuth();
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => apiFetch<ShopOrder[]>("/orders/mine").then(setOrders).catch(() => {});
  useEffect(() => { if (ready && user) load(); }, [ready, user]);

  const confirm = async (id: string, approve: boolean) => {
    setBusy(id);
    await apiFetch(`/orders/mock-confirm`, { method: "POST", body: JSON.stringify({ orderId: id, approve }) }).catch(() => {});
    setBusy(null); load();
  };

  if (!ready) return <div className="p-8 text-sm">Cargando…</div>;
  if (!user) return <div className="p-8 text-sm">Debes <Link href="/login?next=/mis-pedidos" className="text-primary font-bold">entrar</Link> para ver tus pedidos.</div>;
  return (
    <div className="max-w-3xl mx-auto p-5 lg:p-8 flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold">GrowUp Store — Mis pedidos</h1>
      {orders.length === 0 && <p className="text-sm text-on-surface-variant">Aún no tienes pedidos. <Link href="/tienda" className="text-primary font-bold">Ir a la tienda →</Link></p>}
      {orders.map((o) => (
        <div key={o.id} className="p-5 rounded-3xl gs-glass">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-primary">#{o.id.slice(-6)}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge(o.status)}`}>{o.status}</span>
          </div>
          {o.items.map((i, idx) => <div key={`${i.productId}#${idx}`} className="flex justify-between text-sm py-0.5"><span>{i.name}{i.variantLabel ? ` (${i.variantLabel})` : ""} × {i.qty}</span><b>{cop(i.unitPrice * i.qty)}</b></div>)}
          <div className="flex items-center justify-between mt-2">
            <b>{cop(o.total)}</b>
            <div className="flex gap-2">
              <Link href={`/pedido/${o.id}`} className="text-xs font-bold text-primary">Ver detalle →</Link>
              {o.status === "PENDING_PAYMENT" && (
                <button disabled={busy === o.id} onClick={() => confirm(o.id, true)} className="text-xs font-bold px-3 py-1 rounded-lg bg-secondary text-on-secondary">Completar pago</button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
