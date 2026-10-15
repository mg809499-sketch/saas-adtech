"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, ShopOrder } from "../../../lib/api-client";
import { useAuth } from "../../../lib/auth";
import { useCart, cop } from "../../../lib/cart";

type Method = "PSE" | "CARD" | "NEQUI";
const BANKS = ["Bancolombia", "Davivienda", "Banco de Bogotá", "BBVA", "Banco de Occidente"];

export default function CheckoutPage() {
  const { user, ready } = useAuth();
  const { lines, total, clear } = useCart();
  const router = useRouter();
  const [ship, setShip] = useState({ name: "", phone: "", address: "", city: "" });
  const [method, setMethod] = useState<Method>("PSE");
  const [bank, setBank] = useState(BANKS[0]);
  const [card, setCard] = useState("4111111111111111");
  const [nequi, setNequi] = useState("");
  const [error, setError] = useState("");
  const [order, setOrder] = useState<(ShopOrder & { mock?: { boldTxId: string; status: string; reason: string } }) | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      const slug = typeof window !== "undefined" ? localStorage.getItem("gs_store_slug") || "" : "";
      router.push(slug ? `/login?next=/checkout&store=${slug}` : "/login?next=/checkout");
      return;
    }
    else if (lines.length === 0 && !order) router.push("/tienda");
  }, [ready, user, lines.length, order, router]);

  if (!ready || !user) return <div className="p-8 text-sm text-on-surface-variant">Verificando sesión…</div>;

  const pay = async () => {
    setError(""); setBusy(true);
    try {
      const res = await apiFetch<ShopOrder & { mock: { boldTxId: string; status: string; reason: string } }>("/orders/checkout", {
        method: "POST",
        body: JSON.stringify({
          items: lines.map((l) => ({ productId: l.product.id, qty: l.qty, ...(l.variantId ? { variantId: l.variantId } : {}) })),
          shipping: ship,
          paymentMethod: method,
          payment: method === "PSE" ? { bank } : method === "CARD" ? { cardNumber: card } : { nequiPhone: nequi },
        }),
      });
      setOrder(res);
    } catch (e) { setError(e instanceof Error ? e.message : "Falló el checkout"); }
    finally { setBusy(false); }
  };

  const confirm = async (approve: boolean) => {
    if (!order) return;
    setBusy(true);
    try {
      const res = await apiFetch<ShopOrder>("/orders/mock-confirm", { method: "POST", body: JSON.stringify({ orderId: order.id, approve }) });
      if (res.status === "PAID") { clear(); router.push(`/pedido/${res.id}`); }
      else { setError("Pago rechazado por Bold (mock). Tu carrito se conservó."); setOrder(null); }
    } catch (e) { setError(e instanceof Error ? e.message : "Error confirmando pago"); }
    finally { setBusy(false); }
  };

  if (order) {
    return (
      <div className="max-w-lg mx-auto p-5 lg:p-8 flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold">GrowUp Store — Pasarela Bold (mock)</h1>
        <div className="p-6 rounded-3xl gs-glass">
          <div className="text-sm text-on-surface-variant">Orden <b className="text-primary font-mono">#{order.id.slice(-6)}</b> · Total <b>{cop(order.total)}</b></div>
          <div className="text-xs font-mono text-outline mt-1">bold_tx: {order.mock?.boldTxId}</div>
          <p className="text-sm mt-2">{order.mock?.reason}</p>
          {method === "CARD" && <p className="text-xs text-outline mt-2">Prueba rechazo con tarjeta 4000000000000002.</p>}
          {error && <div className="text-sm text-error font-bold mt-2">{error}</div>}
          <div className="flex gap-2 mt-4">
            <button disabled={busy} onClick={() => confirm(true)} className="gs-press flex-1 py-3 rounded-2xl bg-secondary text-on-secondary font-bold disabled:opacity-40">Aprobar pago</button>
            <button disabled={busy} onClick={() => confirm(false)} className="gs-press flex-1 py-3 rounded-2xl bg-error/15 text-error font-bold disabled:opacity-40">Rechazar</button>
          </div>
        </div>
      </div>
    );
  }

  const valid = ship.name && ship.phone && ship.address && ship.city && (method !== "NEQUI" || nequi) && (method !== "CARD" || card.replace(/\D/g, "").length >= 12);
  return (
    <div className="max-w-3xl mx-auto p-5 lg:p-8 flex flex-col gap-5">
      <h1 className="text-3xl font-extrabold">GrowUp Store — Checkout</h1>
      <div className="p-5 rounded-3xl gs-glass">
        <h2 className="font-bold mb-3">Resumen ({lines.length} líneas) — {cop(total)}</h2>
        {lines.map((l) => <div key={`${l.product.id}#${l.variantId || ""}`} className="flex justify-between text-sm py-1"><span>{l.product.name}{l.variantLabel ? ` (${l.variantLabel})` : ""} × {l.qty}</span><b>{cop((l.unitPrice ?? l.product.price) * l.qty)}</b></div>)}
      </div>
      <div className="p-5 rounded-3xl gs-glass grid sm:grid-cols-2 gap-3">
        <h2 className="font-bold sm:col-span-2">Datos de envío</h2>
        {[["name", "Nombre completo"], ["phone", "WhatsApp / celular"], ["address", "Dirección"], ["city", "Ciudad"]].map(([k, ph]) => (
          <input key={k} value={ship[k as keyof typeof ship]} onChange={(e) => setShip({ ...ship, [k]: e.target.value })} placeholder={ph} className="bg-surface px-4 py-2.5 rounded-2xl text-sm border border-outline-variant/30" />
        ))}
      </div>
      <div className="p-5 rounded-3xl gs-glass flex flex-col gap-3">
        <h2 className="font-bold">Método de pago (Bold mock)</h2>
        <div className="flex gap-2">{ (["PSE", "CARD", "NEQUI"] as Method[]).map((m) => <button key={m} onClick={() => setMethod(m)} aria-pressed={method === m} className={`gs-press flex-1 py-2.5 rounded-xl text-sm font-bold ${method === m ? "bg-secondary text-on-secondary" : "bg-surface-container-high border border-outline-variant/20"}`}>{m === "PSE" ? "PSE" : m === "CARD" ? "Tarjeta" : "Nequi"}</button>)}</div>
        {method === "PSE" && <select value={bank} onChange={(e) => setBank(e.target.value)} className="bg-surface px-4 py-2.5 rounded-2xl text-sm border border-outline-variant/30">{BANKS.map((b) => <option key={b}>{b}</option>)}</select>}
        {method === "CARD" && <input value={card} onChange={(e) => setCard(e.target.value)} placeholder="Número de tarjeta (prueba)" inputMode="numeric" className="bg-surface px-4 py-2.5 rounded-2xl text-sm border border-outline-variant/30 font-mono" />}
        {method === "NEQUI" && <input value={nequi} onChange={(e) => setNequi(e.target.value)} placeholder="Número Nequi" inputMode="tel" className="bg-surface px-4 py-2.5 rounded-2xl text-sm border border-outline-variant/30" />}
        {error && <div className="text-sm text-error font-bold">{error}</div>}
        <button disabled={!valid || busy} onClick={pay} className="gs-press py-3.5 rounded-2xl bg-secondary text-on-secondary font-bold disabled:opacity-40">{busy ? "Procesando…" : `Pagar ${cop(total)} con Bold`}</button>
        <p className="text-xs text-outline">La reserva de stock dura 15 min. Ningún número real se almacena (solo últimos 4 dígitos del intento).</p>
      </div>
    </div>
  );
}
