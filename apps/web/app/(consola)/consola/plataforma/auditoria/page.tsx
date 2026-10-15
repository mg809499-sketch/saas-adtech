"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../../../lib/api-client";

interface Audit { id: string; actorId: string; action: string; target: string | null; createdAt: string }

// Quién hizo qué en la plataforma (aprobaciones, planes, suspensiones…).
// Los eventos técnicos de webhooks siguen en /admin/auditoria.
export default function PlataformaAuditoria() {
  const [rows, setRows] = useState<Audit[]>([]);
  const [action, setAction] = useState("");
  const [err, setErr] = useState("");
  const load = () => {
    apiFetch<Audit[]>(`/admin/audit?take=100${action ? `&action=${encodeURIComponent(action)}` : ""}`)
      .then(setRows).catch((e) => setErr(e.message));
  };
  useEffect(() => { load(); }, []);
  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto flex flex-col gap-5">
      <div><h1 className="text-3xl font-extrabold">Auditoría</h1><p className="text-sm text-on-surface-variant">Acciones de plataforma con actor y fecha.</p></div>
      {err && <div role="alert" className="p-3 rounded-xl bg-error/10 text-error text-sm font-bold">{err}</div>}
      <div className="flex gap-2">
        <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Filtrar por acción (ej. subscription, meta-ads)…" className="max-w-sm flex-1 bg-surface-container px-4 py-2.5 rounded-2xl text-sm border border-outline-variant/30" />
        <button onClick={load} className="px-4 py-2 rounded-xl bg-surface-container-high font-bold text-sm">Buscar</button>
      </div>
      <div className="overflow-x-auto rounded-3xl gs-glass"><table className="w-full text-sm min-w-[640px]">
        <thead><tr className="text-xs uppercase text-outline"><th className="text-left p-3">Fecha</th><th className="text-left">Acción</th><th className="text-left">Objetivo</th><th className="text-left">Actor</th></tr></thead>
        <tbody>{rows.map((a) => (
          <tr key={a.id} className="border-t border-outline-variant/20">
            <td className="p-3 text-xs tabular whitespace-nowrap">{new Date(a.createdAt).toLocaleString("es-CO")}</td>
            <td className="font-mono text-xs font-bold">{a.action}</td>
            <td className="font-mono text-xs">{a.target || "—"}</td>
            <td className="font-mono text-xs">{a.actorId.slice(0, 8)}…</td>
          </tr>))}
        </tbody></table></div>
      {rows.length === 0 && <p className="text-sm text-outline">Sin registros todavía: aparecen al aprobar, suspender, editar planes, etc.</p>}
    </div>
  );
}
