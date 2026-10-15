"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../../../lib/api-client";

interface Agreement {
  id: string; commissionPct: number; status: string;
  sourceSlug?: string; targetSlug?: string; sourceName?: string | null; targetName?: string | null;
}

// Red plataforma: TÚ respondes y actualizas el estado (aprueba, rechaza,
// revoca, edita comisión, elimina). La vista del cliente es solo lectura.
export default function PlataformaRed() {
  const [rows, setRows] = useState<Agreement[]>([]);
  const [f, setF] = useState("PENDING");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState<Record<string, number>>({});

  const load = async () => {
    try { setRows(await apiFetch<Agreement[]>(`/admin/affiliates?status=${f}`)); }
    catch (e) { setErr(e instanceof Error ? e.message : "Error"); }
  };
  useEffect(() => { load(); }, [f]);

  const act = async (fn: () => Promise<unknown>, okMsg: string) => {
    setErr(""); setMsg(""); setBusy(true);
    try { await fn(); setMsg(okMsg); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Error"); }
    finally { setBusy(false); }
  };
  const resolve = (id: string, decision: "APPROVE" | "REJECT") =>
    act(() => apiFetch(`/admin/affiliates/${id}/resolve`, { method: "POST", body: JSON.stringify({ decision }) }),
      decision === "APPROVE" ? "Alianza ACTIVA. Aparece en el escaparate." : "Solicitud rechazada.");
  const savePct = (a: Agreement) =>
    act(() => apiFetch(`/admin/affiliates/${a.id}`, { method: "PATCH", body: JSON.stringify({ commissionPct: pct[a.id] ?? a.commissionPct }) }), "Comisión actualizada.");
  const remove = (a: Agreement) => {
    if (!confirm(`Eliminar el vínculo ${a.sourceSlug} → ${a.targetSlug}?`)) return;
    act(() => apiFetch(`/admin/affiliates/${a.id}`, { method: "DELETE" }), "Vínculo eliminado.");
  };

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto flex flex-col gap-5">
      <div><h1 className="text-3xl font-extrabold">Red y afiliados (plataforma)</h1><p className="text-sm text-on-surface-variant">Tú das respuesta y actualizas estados. El cliente solo ve el resultado.</p></div>
      {msg && <div role="status" className="p-3 rounded-xl bg-secondary/15 text-secondary text-sm font-bold">{msg}</div>}
      {err && <div role="alert" className="p-3 rounded-xl bg-error/10 text-error text-sm font-bold">{err}</div>}
      <div className="flex gap-2">
        {(["PENDING", "ACTIVE", "REVOKED", "ALL"] as const).map((s) => (
          <button key={s} onClick={() => setF(s)} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${f === s ? "bg-surface-container shadow" : "text-on-surface-variant"}`}>{s}</button>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {rows.map((a) => (
          <div key={a.id} className="p-5 rounded-3xl gs-glass flex flex-col gap-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <b>{a.sourceName ?? a.sourceSlug} → {a.targetName ?? a.targetSlug}</b>
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container-high font-bold">{a.status}</span>
              <span className="text-xs tabular">{a.commissionPct}%</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {a.status === "PENDING" && (<>
                <button disabled={busy} onClick={() => resolve(a.id, "APPROVE")} className="px-4 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-xs">Aprobar</button>
                <button disabled={busy} onClick={() => resolve(a.id, "REJECT")} className="px-4 py-2 rounded-xl bg-surface-container-high font-bold text-xs">Rechazar</button>
              </>)}
              {a.status === "ACTIVE" && <button disabled={busy} onClick={() => resolve(a.id, "REJECT")} className="px-4 py-2 rounded-xl bg-surface-container-high font-bold text-xs">Revocar</button>}
              <label className="flex items-center gap-1 text-xs">%<input type="number" min={1} max={35} value={pct[a.id] ?? a.commissionPct} onChange={(e) => setPct({ ...pct, [a.id]: Number(e.target.value) })} className="w-16 bg-surface px-2 py-1.5 rounded-lg text-xs border border-outline-variant/30" /></label>
              <button disabled={busy} onClick={() => savePct(a)} className="text-xs font-bold text-primary">Guardar %</button>
              <button disabled={busy} onClick={() => remove(a)} className="text-xs font-bold text-error ml-auto">Eliminar vínculo</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-outline">Sin solicitudes en este estado.</p>}
      </div>
    </div>
  );
}
