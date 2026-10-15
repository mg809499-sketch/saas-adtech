"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../../../lib/api-client";

interface Sub {
  id: string; status: string; currentPeriodEnd: string | null;
  plan: { slug: string; name: string }; planSlug: string;
  tenant: { storeSlug: string | null; storeName: string | null } | null;
}
interface Plan { slug: string; name: string }
interface SubEvent { id: string; type: string; createdAt: string }

const STATUSES = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED"];

export default function PlataformaSuscripciones() {
  const [rows, setRows] = useState<Sub[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [f, setF] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ tenantSlug: "", planSlug: "", months: 1 });
  const [editing, setEditing] = useState<Sub | null>(null);
  const [editForm, setEditForm] = useState({ planSlug: "", status: "", months: 1 });
  const [history, setHistory] = useState<SubEvent[] | null>(null);

  const load = async () => {
    try {
      setRows(await apiFetch<Sub[]>("/admin/subscriptions"));
      setPlans(await apiFetch<{ plans: { slug: string; name: string }[] }>("/admin/metrics").then((m) => m.plans));
    } catch (e) { setErr(e instanceof Error ? e.message : "Error"); }
  };
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => {
    if (!f || f === "ALL") return rows;
    return rows.filter((r) => r.status === f);
  }, [rows, f]);

  const act = async (fn: () => Promise<unknown>, okMsg: string) => {
    setErr(""); setMsg(""); setBusy(true);
    try { await fn(); setMsg(okMsg); setCreating(false); setEditing(null); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Error"); }
    finally { setBusy(false); }
  };
  const create = () => act(
    () => apiFetch("/admin/subscriptions", { method: "POST", body: JSON.stringify(form) }),
    `Suscripción creada para ${form.tenantSlug}.`);
  const saveEdit = () => {
    if (!editing) return;
    const body: Record<string, unknown> = {};
    if (editForm.planSlug) body.planSlug = editForm.planSlug;
    if (editForm.status) body.status = editForm.status;
    act(() => apiFetch(`/admin/subscriptions/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) }), "Suscripción actualizada.");
  };
  const renew = (s: Sub) => act(
    () => apiFetch(`/admin/subscriptions/${s.id}/renew`, { method: "POST", body: JSON.stringify({ months: 1 }) }),
    "Renovada +30 días y activada.");
  const remove = (s: Sub) => {
    if (!confirm(`Eliminar la suscripción de ${s.tenant?.storeSlug} (la tienda quedará bloqueada por plan)?`)) return;
    act(() => apiFetch(`/admin/subscriptions/${s.id}`, { method: "DELETE" }), "Suscripción eliminada.");
  };
  const showHistory = async (s: Sub) => {
    try { setHistory(await apiFetch<SubEvent[]>(`/admin/subscriptions/${s.id}/events`)); }
    catch (e) { setErr(e instanceof Error ? e.message : "Error"); }
  };

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div><h1 className="text-3xl font-extrabold">Compras y suscripciones</h1><p className="text-sm text-on-surface-variant">Control total: crea manual, cambia plan, renueva o elimina.</p></div>
        <button onClick={() => setCreating(!creating)} className="ml-auto px-4 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-sm">+ Crear suscripción</button>
      </div>
      {msg && <div role="status" className="p-3 rounded-xl bg-secondary/15 text-secondary text-sm font-bold">{msg}</div>}
      {err && <div role="alert" className="p-3 rounded-xl bg-error/10 text-error text-sm font-bold">{err}</div>}
      {creating && (
        <div className="p-5 rounded-3xl gs-glass flex flex-col sm:flex-row gap-2">
          <input value={form.tenantSlug} onChange={(e) => setForm({ ...form, tenantSlug: e.target.value })} placeholder="slug de la tienda" className="flex-1 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30 font-mono" />
          <select value={form.planSlug} onChange={(e) => setForm({ ...form, planSlug: e.target.value })} className="bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30">
            <option value="">Plan…</option>{plans.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
          </select>
          <input type="number" min={1} max={36} value={form.months} onChange={(e) => setForm({ ...form, months: Number(e.target.value) })} className="w-20 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" />
          <button disabled={busy || !form.tenantSlug || !form.planSlug} onClick={create} className="px-4 py-2 rounded-xl bg-primary-container text-on-primary-container font-bold text-sm disabled:opacity-50">Crear</button>
        </div>
      )}
      <div className="flex gap-2">
        {(["ALL", ...STATUSES] as const).map((s) => (
          <button key={s} onClick={() => setF(s)} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${f === s || (!f && s === "ALL") ? "bg-surface-container shadow" : "text-on-surface-variant"}`}>{s}</button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-3xl gs-glass"><table className="w-full text-sm min-w-[720px]">
        <thead><tr className="text-xs uppercase text-outline"><th className="text-left p-3">Tienda</th><th className="text-left">Plan</th><th className="text-left">Estado</th><th className="text-left">Vigente hasta</th><th></th></tr></thead>
        <tbody>{filtered.map((s) => (
          <tr key={s.id} className="border-t border-outline-variant/20">
            <td className="p-3 font-bold font-mono text-xs">{s.tenant?.storeSlug}<span className="block font-sans font-normal text-sm">{s.tenant?.storeName}</span></td>
            <td>{s.plan.name}</td>
            <td className="text-xs font-bold">{s.status}</td>
            <td className="text-xs tabular">{s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString("es-CO") : "—"}</td>
            <td className="p-3 text-right whitespace-nowrap">
              <button onClick={() => { setEditing(s); setEditForm({ planSlug: s.planSlug, status: s.status, months: 1 }); setHistory(null); }} className="text-xs font-bold text-primary mr-2">Editar</button>
              <button disabled={busy} onClick={() => renew(s)} className="text-xs font-bold text-secondary mr-2">Renovar</button>
              <button onClick={() => showHistory(s)} className="text-xs font-bold text-on-surface-variant mr-2">Historial</button>
              <button disabled={busy} onClick={() => remove(s)} className="text-xs font-bold text-error">Eliminar</button>
            </td>
          </tr>))}
        </tbody></table></div>
      {editing && (
        <div className="p-5 rounded-3xl gs-glass flex flex-col sm:flex-row gap-2 items-center">
          <span className="text-sm font-bold">Editar {editing.tenant?.storeSlug}</span>
          <select value={editForm.planSlug} onChange={(e) => setEditForm({ ...editForm, planSlug: e.target.value })} className="bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30">
            {plans.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
          </select>
          <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30">
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button disabled={busy} onClick={saveEdit} className="px-4 py-2 rounded-xl bg-primary-container text-on-primary-container font-bold text-sm">Guardar</button>
          <button onClick={() => setEditing(null)} className="text-xs font-bold text-outline">Cancelar</button>
        </div>
      )}
      {history && (
        <div className="p-5 rounded-3xl gs-glass">
          <div className="flex items-center justify-between"><h3 className="font-bold text-sm">Historial de compras/eventos</h3><button onClick={() => setHistory(null)} className="text-xs font-bold text-outline">Cerrar</button></div>
          {history.map((h) => <div key={h.id} className="text-xs py-1.5 border-t border-outline-variant/10 font-mono">{new Date(h.createdAt).toLocaleString("es-CO")} · <b>{h.type}</b></div>)}
          {history.length === 0 && <p className="text-xs text-outline">Sin eventos.</p>}
        </div>
      )}
    </div>
  );
}
