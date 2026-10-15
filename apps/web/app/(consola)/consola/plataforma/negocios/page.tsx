"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../../../lib/api-client";

interface StoreRow {
  id: string; storeSlug: string | null; storeName: string | null;
  subscription: { status: string; plan: { name: string } } | null;
  _count: { products: number; orders: number; users: number };
}
interface StoreUser { id: string; email: string; name: string | null; role: string }

export default function PlataformaNegocios() {
  const [rows, setRows] = useState<StoreRow[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [sel, setSel] = useState<StoreRow | null>(null);
  const [users, setUsers] = useState<StoreUser[]>([]);
  const [busy, setBusy] = useState(false);

  const load = () => apiFetch<StoreRow[]>("/admin/stores").then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return rows;
    return rows.filter((r) => (r.storeName || "").toLowerCase().includes(s) || (r.storeSlug || "").toLowerCase().includes(s));
  }, [rows, q]);

  const open = async (r: StoreRow) => {
    setSel(r); setUsers([]);
    try { setUsers(await apiFetch<StoreUser[]>(`/admin/stores/${r.id}/users`)); }
    catch (e) { setErr(e instanceof Error ? e.message : "Error"); }
  };
  const act = async (fn: () => Promise<unknown>, okMsg: string) => {
    setErr(""); setMsg(""); setBusy(true);
    try { await fn(); setMsg(okMsg); await load(); setSel(null); }
    catch (e) { setErr(e instanceof Error ? e.message : "Error"); }
    finally { setBusy(false); }
  };
  const suspend = (id: string, action: "SUSPEND" | "REACTIVATE") =>
    act(() => apiFetch(`/admin/stores/${id}/suspend`, { method: "POST", body: JSON.stringify({ action }) }),
      action === "SUSPEND" ? "Tienda suspendida (PlanGuard la bloquea)." : "Tienda reactivada.");
  const remove = (id: string, slug: string | null) => {
    if (!confirm(`Eliminar ${slug} con TODO su contenido (productos, pedidos, páginas)?`)) return;
    act(() => apiFetch(`/admin/stores/${id}`, { method: "DELETE" }), "Tienda eliminada.");
  };
  const setRole = (u: StoreUser, role: string) =>
    act(() => apiFetch(`/admin/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ role }) }), `Rol de ${u.email} → ${role}.`);

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto flex flex-col gap-5">
      <div><h1 className="text-3xl font-extrabold">Tiendas clientes</h1><p className="text-sm text-on-surface-variant">{rows.length} tiendas · suspende, reactiva o elimina; gestiona sus usuarios.</p></div>
      {msg && <div role="status" className="p-3 rounded-xl bg-secondary/15 text-secondary text-sm font-bold">{msg}</div>}
      {err && <div role="alert" className="p-3 rounded-xl bg-error/10 text-error text-sm font-bold">{err}</div>}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o slug…" className="max-w-md bg-surface-container px-4 py-2.5 rounded-2xl text-sm border border-outline-variant/30" />
      <div className="overflow-x-auto rounded-3xl gs-glass"><table className="w-full text-sm min-w-[760px]">
        <thead><tr className="text-xs uppercase text-outline"><th className="text-left p-3">Tienda</th><th className="text-left">Plan</th><th className="text-left">Estado</th><th className="text-right">Prod.</th><th className="text-right">Ped.</th><th className="text-right">Usu.</th><th></th></tr></thead>
        <tbody>{filtered.map((r) => (
          <tr key={r.id} className="border-t border-outline-variant/20">
            <td className="p-3 font-bold">{r.storeName}<span className="block text-xs text-outline font-mono font-normal">{r.storeSlug}</span></td>
            <td>{r.subscription?.plan.name || "—"}</td>
            <td className="text-xs font-bold">{r.subscription?.status || "SIN SUB"}</td>
            <td className="text-right tabular">{r._count.products}</td>
            <td className="text-right tabular">{r._count.orders}</td>
            <td className="text-right tabular">{r._count.users}</td>
            <td className="p-3 text-right whitespace-nowrap">
              <button onClick={() => open(r)} className="text-xs font-bold text-primary mr-2">Gestionar</button>
              {r.subscription?.status === "CANCELED"
                ? <button disabled={busy} onClick={() => suspend(r.id, "REACTIVATE")} className="text-xs font-bold text-secondary mr-2">Reactivar</button>
                : <button disabled={busy} onClick={() => suspend(r.id, "SUSPEND")} className="text-xs font-bold text-tertiary mr-2">Suspender</button>}
              <button disabled={busy} onClick={() => remove(r.id, r.storeSlug)} className="text-xs font-bold text-error">Eliminar</button>
            </td>
          </tr>))}
        </tbody></table></div>
      {sel && (
        <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setSel(null)}>
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-surface-container-lowest border-l border-outline-variant/30 p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="font-bold text-lg">{sel.storeName}</h2><button onClick={() => setSel(null)} className="font-bold text-outline">✕</button></div>
            <p className="text-xs text-outline font-mono">{sel.storeSlug} · Plan {sel.subscription?.plan.name} · {sel.subscription?.status}</p>
            <h3 className="font-bold text-sm mt-4 mb-2">Usuarios y permisos</h3>
            <div className="flex flex-col gap-2">
              {users.map((u) => (
                <div key={u.id} className="p-3 rounded-2xl bg-surface-container-low flex items-center justify-between gap-2 text-sm">
                  <div><div className="font-bold">{u.email}</div><div className="text-xs text-outline">{u.name || "—"}</div></div>
                  <select value={u.role} onChange={(e) => setRole(u, e.target.value)} className="bg-surface px-2 py-1.5 rounded-lg text-xs border border-outline-variant/30">
                    {(["CUSTOMER", "MERCHANT", "ADMIN"] as const).map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>))}
              {users.length === 0 && <p className="text-xs text-outline">Sin usuarios en este tenant.</p>}
            </div>
            <p className="text-[11px] text-outline mt-3">Roles: ADMIN = plataforma · MERCHANT = comercio (gestiona) · CUSTOMER = miembro/comprador.</p>
          </div>
        </div>
      )}
    </div>
  );
}
