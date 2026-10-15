"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, ShopOrder } from "../../../../lib/api-client";
import { cop } from "../../../../lib/cart";

type Row = ShopOrder & { user?: { email: string; name: string | null } };
type Detail = Row & { attempts?: { id: string; method: string; status: string; boldTxId?: string | null; last4?: string | null; createdAt: string }[]; createdAt?: string; updatedAt?: string };

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  PAID: "Pagada",
  FAILED: "Fallida",
  CANCELLED: "Cancelada",
};

function StatusChip({ s }: { s: string }) {
  const cls = s === "PAID" ? "bg-secondary/15 text-secondary" : s === "PENDING_PAYMENT" ? "bg-primary/15 text-primary" : s === "FAILED" ? "bg-error/15 text-error" : "bg-white/10 text-outline";
  return <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${cls}`}>{STATUS_LABEL[s] ?? s}</span>;
}

export default function OrdersPage() {
  const [view, setView] = useState<"table" | "kanban">("table");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    apiFetch<Row[]>("/orders")
      .catch(() => apiFetch<Row[]>("/orders/mine"))
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    setLoadingDetail(true);
    apiFetch<Detail>(`/orders/${selectedId}`)
      .then(setDetail)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingDetail(false));
  }, [selectedId]);

  const filtered = useMemo(
    () => rows.filter((o) => `${o.id} ${o.shipping?.name || ""} ${o.boldTxId || ""}`.toLowerCase().includes(q.toLowerCase())),
    [rows, q],
  );
  const paid = rows.filter((o) => o.status === "PAID");
  const total = paid.reduce((a, o) => a + o.total, 0);

  const open = (id: string) => setSelectedId(id);

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row justify-between gap-4"><div><h1 className="font-display text-3xl font-extrabold tracking-tight">Órdenes y Ventas</h1><p className="text-sm text-on-surface-variant">Bold Webhook V2 · clic en una orden para ver el recibo completo</p></div>
      <div className="flex gap-2"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente o ID Bold..." aria-label="Buscar órdenes" className="bg-surface-container px-3 py-2 rounded-2xl text-sm border border-outline-variant/30" />
      <button onClick={() => setView(view === "table" ? "kanban" : "table")} className="gs-press px-4 py-2 rounded-2xl bg-surface-container-high text-sm font-bold">{view === "table" ? "Tablero Kanban" : "Vista Tabla"}</button></div></div>
      {error && <div role="alert" className="p-3 rounded-xl bg-error/10 text-error text-sm font-bold">{error}</div>}
      <div className="grid sm:grid-cols-4 gap-4">{[["Ventas (pagadas)", cop(total)], ["Aprobadas", `${paid.length}/${rows.length}`], ["Pendientes", String(rows.filter((o) => o.status === "PENDING_PAYMENT").length)], ["Fallidas", String(rows.filter((o) => o.status === "FAILED").length)]].map(([l, v]) => <div key={l} className="p-5 rounded-2xl gs-glass"><div className="text-xs uppercase text-outline font-bold">{l}</div><div className="text-2xl font-black tabular">{v}</div></div>)}</div>
      {view === "table" ? (
        <div className="rounded-2xl gs-glass overflow-x-auto"><table className="w-full text-sm min-w-[800px]"><thead><tr className="text-xs uppercase text-outline"><th className="text-left p-3">Orden</th><th className="text-left">Cliente</th><th className="text-right">Monto</th><th className="text-center">Estado Bold</th></tr></thead>
        <tbody>{filtered.map((o) => <tr key={o.id} onClick={() => open(o.id)} className="border-t border-outline-variant/10 gs-row-hover cursor-pointer"><td className="p-3 font-bold text-primary">#{o.id.slice(-6)}<span className="block text-xs font-mono text-outline">{o.boldTxId}</span></td><td>{o.shipping?.name}<span className="block text-xs text-outline">{o.shipping?.city} · {o.paymentMethod}</span></td><td className="text-right font-bold tabular">{cop(o.total)}</td><td className="text-center"><StatusChip s={o.status} /></td></tr>)}</tbody></table>
        {filtered.length === 0 && <p className="text-sm text-outline p-4">Sin órdenes con ese filtro.</p>}</div>
      ) : (
        <div className="grid md:grid-cols-4 gap-4">{[["PENDING_PAYMENT", "Pendiente"], ["PAID", "Pagado Bold"], ["FAILED", "Fallido"], ["CANCELLED", "Cancelado"]].map(([st, col]) => (
          <div key={col} className="rounded-2xl gs-glass p-4"><div className="font-bold text-sm mb-3">{col}</div>
          {filtered.filter((o) => o.status === st).map((o) => (
            <button key={o.id} onClick={() => open(o.id)} className="gs-press w-full text-left p-3 rounded-2xl bg-surface-container-low mb-2"><div className="font-bold text-primary text-sm">#{o.id.slice(-6)}</div><div className="text-sm">{o.shipping?.name}</div><div className="text-xs text-outline tabular">{cop(o.total)}</div></button>))}</div>))}</div>
      )}
      {selectedId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedId(null)}>
          <div role="dialog" aria-modal="true" aria-label="Recibo de la orden" className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-surface-container-lowest border-l border-outline-variant/30 p-5 lg:p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-lg font-display">Recibo #{selectedId.slice(-6)}</h2>
              <button onClick={() => setSelectedId(null)} aria-label="Cerrar recibo" className="gs-press w-9 h-9 rounded-xl bg-surface-container-high text-outline font-bold">✕</button>
            </div>
            {loadingDetail || !detail ? (
              <p className="text-sm text-on-surface-variant mt-6">Cargando recibo…</p>
            ) : (
              <div className="flex flex-col gap-4 mt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusChip s={detail.status} />
                  <span className="text-xs font-mono text-outline">{detail.boldTxId ?? "sin tx Bold"}</span>
                </div>
                <section className="p-4 rounded-2xl gs-glass">
                  <h3 className="text-xs font-bold uppercase text-outline mb-2">Checkout · cliente y entrega</h3>
                  <dl className="text-sm space-y-1.5">
                    <div className="flex justify-between gap-3"><dt className="text-outline">Cliente</dt><dd className="font-semibold text-right">{detail.shipping?.name ?? "—"}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-outline">Teléfono</dt><dd className="font-semibold tabular">{detail.shipping?.phone ?? "—"}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-outline">Dirección</dt><dd className="font-semibold text-right">{detail.shipping?.address ?? "—"}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-outline">Ciudad</dt><dd className="font-semibold">{detail.shipping?.city ?? "—"}</dd></div>
                    {detail.user?.email && <div className="flex justify-between gap-3"><dt className="text-outline">Cuenta</dt><dd className="font-semibold">{detail.user.email}</dd></div>}
                    <div className="flex justify-between gap-3"><dt className="text-outline">Método de pago</dt><dd className="font-semibold">{detail.paymentMethod}</dd></div>
                  </dl>
                </section>
                <section className="p-4 rounded-2xl gs-glass">
                  <h3 className="text-xs font-bold uppercase text-outline mb-2">Productos ({detail.items.length})</h3>
                  <div className="flex flex-col gap-2">
                    {detail.items.map((it) => (
                      <div key={it.productId} className="flex justify-between items-center gap-2 text-sm p-2.5 rounded-xl bg-surface-container-high/50">
                        <div className="min-w-0"><div className="font-semibold truncate">{it.name}{it.variantLabel ? <span className="font-normal text-secondary"> · {it.variantLabel}</span> : null}</div><div className="text-xs text-outline tabular">×{it.qty} · {cop(it.unitPrice)} c/u</div></div>
                        <div className="font-bold tabular shrink-0">{cop(it.unitPrice * it.qty)}</div>
                      </div>
                    ))}
                  </div>
                  <dl className="text-sm mt-3 pt-3 border-t border-outline-variant/20 space-y-1.5">
                    <div className="flex justify-between"><dt className="text-outline">Subtotal</dt><dd className="font-semibold tabular">{cop(detail.subtotal)}</dd></div>
                    <div className="flex justify-between"><dt className="text-outline">Flete</dt><dd className="font-semibold tabular">{detail.shippingCost === 0 ? "Gratis" : cop(detail.shippingCost)}</dd></div>
                    <div className="flex justify-between text-base"><dt className="font-bold">Total</dt><dd className="font-black tabular">{cop(detail.total)}</dd></div>
                  </dl>
                </section>
                <section className="p-4 rounded-2xl gs-glass">
                  <h3 className="text-xs font-bold uppercase text-outline mb-2">Historial de estados</h3>
                  <ol className="text-sm space-y-2">
                    {(detail.attempts ?? []).map((a) => (
                      <li key={a.id} className="flex justify-between gap-2">
                        <span>Intento {a.method} · <b>{a.status}</b>{a.last4 ? <span className="text-outline"> ····{a.last4}</span> : null}</span>
                        <span className="text-xs text-outline tabular">{new Date(a.createdAt).toLocaleString("es-CO")}</span>
                      </li>
                    ))}
                    {(detail.attempts ?? []).length === 0 && <li className="text-outline">Estado actual: <b>{STATUS_LABEL[detail.status] ?? detail.status}</b></li>}
                  </ol>
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
