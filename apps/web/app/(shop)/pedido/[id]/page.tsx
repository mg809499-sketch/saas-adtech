"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ShopOrder } from "../../../../lib/api-client";
import { useAuth } from "../../../../lib/auth";
import { cop } from "../../../../lib/cart";

export default function PedidoPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { user, ready } = useAuth();
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready || !user) return;
    apiFetch<ShopOrder>(`/orders/${id}`).then(setOrder).catch((e) => setError(e.message));
  }, [ready, user, id]);

  if (!ready) return <div className="p-8 text-sm">Cargando…</div>;
  if (!user) return <div className="p-8 text-sm">Debes <Link href={`/login?next=/pedido/${id}`} className="text-primary font-bold">entrar</Link> para ver tu pedido.</div>;
  if (error) return <div className="p-8 text-sm text-error font-bold">{error}</div>;
  if (!order) return <div className="p-8 text-sm">Cargando pedido…</div>;

  const wa = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Hola, confirmo mi pedido #${order.id.slice(-6)} de ${cop(order.total)} en GrowUp Store. ¡Gracias!`)}`;
  return (
    <div className="max-w-lg mx-auto p-5 lg:p-8 flex flex-col gap-4">
      <div className="p-6 rounded-3xl bg-secondary/10 border border-secondary/30 text-center">
        <div className="text-5xl">✓</div>
        <h1 className="text-2xl font-extrabold mt-2">¡Pago aprobado!</h1>
        <p className="text-sm text-on-surface-variant">Orden <b className="font-mono">#{order.id.slice(-6)}</b> · {cop(order.total)} · {order.paymentMethod}</p>
      </div>
      <div className="p-5 rounded-3xl gs-glass">
        {order.items.map((i, idx) => <div key={`${i.productId}#${idx}`} className="flex justify-between text-sm py-1"><span>{i.name}{i.variantLabel ? ` (${i.variantLabel})` : ""} × {i.qty}</span><b>{cop(i.unitPrice * i.qty)}</b></div>)}
        <div className="flex justify-between text-sm pt-2 border-t border-outline-variant/20 mt-2"><span>Envío a {order.shipping.city}</span><b>{order.shippingCost === 0 ? "GRATIS" : cop(order.shippingCost)}</b></div>
        <div className="text-xs text-outline mt-2">{order.shipping.name} · {order.shipping.address} · {order.shipping.phone}</div>
      </div>
      <div className="flex gap-2">
        <a href={wa} target="_blank" rel="noreferrer" className="flex-1 text-center py-3 rounded-2xl bg-secondary text-on-secondary font-bold text-sm">Confirmar por WhatsApp</a>
        <Link href="/tienda" className="flex-1 text-center py-3 rounded-2xl bg-surface-container-high font-bold text-sm">Seguir comprando</Link>
      </div>
    </div>
  );
}
