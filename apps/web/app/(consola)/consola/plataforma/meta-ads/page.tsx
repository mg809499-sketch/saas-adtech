"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../../../lib/api-client";

interface Campaign {
  id: string; name: string; dailyBudget: number; status: string;
  reviewNote: string | null; createdAt: string;
  tenant: { storeSlug: string | null; storeName: string | null } | null;
}

// Bandeja de plataforma: revisa PENDING_REVIEW y responde. El cliente ve el
// estado + tu nota en su Meta Ads Studio (consola del comercio).
export default function PlataformaMetaAds() {
  const [rows, setRows] = useState<Campaign[]>([]);
  const [f, setF] = useState("PENDING_REVIEW");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Record<string, string>>({});

  const load = () => apiFetch<Campaign[]>("/admin/meta-ads/campaigns").then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => (f === "ALL" ? rows : rows.filter((r) => r.status === f)), [rows, f]);
  const counts = useMemo(() => ({ PENDING_REVIEW: rows.filter((r) => r.status === "PENDING_REVIEW").length }), [rows]);

  const resolve = async (c: Campaign, decision: "APPROVE" | "REJECT") => {
    setErr(""); setMsg(""); setBusy(true);
    try {
      await apiFetch(`/admin/meta-ads/${c.id}/resolve`, { method: "POST", body: JSON.stringify({ decision, note: note[c.id] || undefined }) });
      setMsg(decision === "APPROVE" ? "Campaña activada. El cliente la ve ACTIVA." : "Campaña devuelta a PAUSADA con tu nota.");
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Error"); }
    finally { setBusy(false); }
  };

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto flex flex-col gap-5">
      <div><h1 className="text-3xl font-extrabold">Meta Ads plataforma</h1><p className="text-sm text-on-surface-variant">Revisa solicitudes de clientes y responde: el estado y tu nota llegan a su consola.</p></div>
      {msg && <div role="status" className="p-3 rounded-xl bg-secondary/15 text-secondary text-sm font-bold">{msg}</div>}
      {err && <div role="alert" className="p-3 rounded-xl bg-error/10 text-error text-sm font-bold">{err}</div>}
      <div className="flex gap-2">
        {(["PENDING_REVIEW", "ACTIVE", "PAUSED", "DRAFT", "ALL"] as const).map((s) => (
          <button key={s} onClick={() => setF(s)} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${f === s ? "bg-surface-container shadow" : "text-on-surface-variant"}`}>
            {s}{s === "PENDING_REVIEW" ? ` (${counts.PENDING_REVIEW})` : ""}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {filtered.map((c) => (
          <div key={c.id} className="p-5 rounded-3xl gs-glass flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <b>{c.name}</b>
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container-high font-bold">{c.status}</span>
              <span className="text-xs text-outline font-mono">{c.tenant?.storeSlug}</span>
              <span className="text-xs tabular ml-auto">${c.dailyBudget}/día</span>
            </div>
            {c.reviewNote && <p className="text-xs text-on-surface-variant">Nota anterior: {c.reviewNote}</p>}
            {c.status === "PENDING_REVIEW" && (
              <div className="flex flex-col sm:flex-row gap-2">
                <input value={note[c.id] || ""} onChange={(e) => setNote({ ...note, [c.id]: e.target.value })} placeholder="Nota para el cliente (opcional)…" className="flex-1 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" />
                <button disabled={busy} onClick={() => resolve(c, "APPROVE")} className="px-4 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-sm">Aprobar y activar</button>
                <button disabled={busy} onClick={() => resolve(c, "REJECT")} className="px-4 py-2 rounded-xl bg-surface-container-high font-bold text-sm">Rechazar</button>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-outline">Sin campañas en este estado.</p>}
      </div>
    </div>
  );
}
