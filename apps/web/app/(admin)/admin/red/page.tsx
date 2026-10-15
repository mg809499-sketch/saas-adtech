"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../../lib/api-client";

interface Row {
  id: string; commissionPct: number; status: string; createdAt: string;
  sourceSlug?: string; targetSlug?: string; sourceName?: string | null; targetName?: string | null;
}

export default function AdminRed() {
  const [items, setItems] = useState<{ id: string; name: string | null; sku: string }[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [msg, setMsg] = useState("");

  const load = async (st: string) => {
    const [feat, reqs] = await Promise.all([
      apiFetch<typeof items>("/directory/featured-products").catch(() => [] as typeof items),
      apiFetch<Row[]>(`/admin/affiliates${st === "ALL" ? "" : `?status=${st}`}`).catch(() => [] as Row[]),
    ]);
    setItems(feat); setRows(reqs);
  };
  useEffect(() => { load(filter); }, [filter]);

  const resolve = async (id: string, decision: "APPROVE" | "REJECT") => {
    await apiFetch(`/admin/affiliates/${id}/resolve`, { method: "POST", body: JSON.stringify({ decision }) });
    setMsg(decision === "APPROVE" ? "Alianza aprobada y visible en ambas tiendas." : "Solicitud rechazada.");
    setTimeout(() => setMsg(""), 3000);
    load(filter);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold font-display">Red global de afiliados</h1>
        <p className="text-sm text-on-surface-variant">Modera las solicitudes de pauta de la Red Aliada. Tu resolución aparece en el contenedor del cliente.</p>
        {msg && <p className="text-sm text-secondary font-bold mt-1">{msg}</p>}
      </div>
      <section className="gs-glass rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-bold">Solicitudes de alianza</h2>
          <div className="flex gap-1.5" role="group" aria-label="Filtrar por estado">
            {["PENDING", "ACTIVE", "REVOKED", "ALL"].map((s) => (
              <button key={s} onClick={() => setFilter(s)} aria-pressed={filter === s} className={`gs-press px-3 py-1.5 rounded-xl text-xs font-bold ${filter === s ? "bg-surface-container-high" : "text-on-surface-variant"}`}>{s === "ALL" ? "Todas" : s === "PENDING" ? "Pendientes" : s === "ACTIVE" ? "Activas" : "Rechazadas"}</button>
            ))}
          </div>
        </div>
        <div className="mt-3 overflow-x-auto"><table className="w-full text-sm min-w-[640px]">
          <thead><tr className="text-xs uppercase text-outline"><th className="text-left p-2">Origen → Destino</th><th className="text-right">Comisión</th><th className="text-center">Estado</th><th className="text-right pr-2">Resolución</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className="border-t border-outline-variant/10 gs-row-hover">
              <td className="p-2 font-semibold">{r.sourceName ?? r.sourceSlug} <span className="text-outline">→</span> {r.targetName ?? r.targetSlug}</td>
              <td className="text-right tabular">{r.commissionPct}%</td>
              <td className="text-center text-xs font-bold">{r.status}</td>
              <td className="text-right pr-2">
                {r.status === "PENDING" ? (
                  <span className="inline-flex gap-2">
                    <button onClick={() => resolve(r.id, "APPROVE")} className="gs-press text-xs font-bold text-secondary hover:underline">Aprobar</button>
                    <button onClick={() => resolve(r.id, "REJECT")} className="gs-press text-xs font-bold text-error hover:underline">Rechazar</button>
                  </span>
                ) : <span className="text-xs text-outline">resuelta</span>}
              </td>
            </tr>
          ))}</tbody>
        </table>
        {rows.length === 0 && <p className="text-xs text-outline p-2">Sin solicitudes en este estado.</p>}</div>
      </section>
      <section>
        <p className="text-sm text-on-surface-variant mb-2">Productos destacados por alianzas activas ({items.length}).</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((p) => <div key={p.id} className="gs-glass rounded-2xl p-4"><div className="font-bold text-sm">{p.name}</div><div className="text-xs font-mono text-outline">{p.sku}</div></div>)}
        </div>
      </section>
    </div>
  );
}
