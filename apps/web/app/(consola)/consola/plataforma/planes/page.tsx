"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../../../lib/api-client";

interface Plan {
  slug: string; name: string; priceMonthlyUsd: number; priceMonthlyCop: number;
  imageUrl?: string | null;
  maxStores: number; maxProducts: number; features?: Record<string, unknown> | null;
}

// Los planes editados aquí alimentan las mismas tarjetas que ven los
// clientes en /planes (misma tabla Plan). Sin inventario en plataforma.
export default function PlataformaPlanes() {
  const [rows, setRows] = useState<Plan[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ slug: "", name: "", priceMonthlyUsd: 0, priceMonthlyCop: 0, imageUrl: "", maxStores: 1, maxProducts: 100, features: '{"ads":false}' });
  const [editing, setEditing] = useState<Plan | null>(null);
  const [editForm, setEditForm] = useState({ name: "", priceMonthlyUsd: 0, priceMonthlyCop: 0, imageUrl: "", maxStores: 1, maxProducts: 100, features: "{}" });

  const load = () => apiFetch<Plan[]>("/billing/plans").then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const parseFeatures = (raw: string) => {
    try { const v = JSON.parse(raw || "{}"); return typeof v === "object" && v ? v : {}; }
    catch { throw new Error("features debe ser JSON válido"); }
  };
  const act = async (fn: () => Promise<unknown>, okMsg: string) => {
    setErr(""); setMsg(""); setBusy(true);
    try { await fn(); setMsg(okMsg); setEditing(null); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Error"); }
    finally { setBusy(false); }
  };
  const create = () => act(() => apiFetch("/admin/plans", {
    method: "POST",
    body: JSON.stringify({ ...form, slug: form.slug.toUpperCase().trim(), features: parseFeatures(form.features) }),
  }), "Plan creado.");
  const saveEdit = () => {
    if (!editing) return;
    act(() => apiFetch(`/admin/plans/${editing.slug}`, {
      method: "PATCH", body: JSON.stringify({ ...editForm, features: parseFeatures(editForm.features) }),
    }), "Plan actualizado.");
  };
  const remove = (p: Plan) => {
    if (!confirm(`Eliminar el plan ${p.slug}? Se bloquea si tiene suscripciones.`)) return;
    act(() => apiFetch(`/admin/plans/${p.slug}`, { method: "DELETE" }), "Plan eliminado.");
  };

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto flex flex-col gap-5">
      <div><h1 className="text-3xl font-extrabold">Planes y permisos</h1><p className="text-sm text-on-surface-variant">Misma tabla que las tarjetas de /planes. <code className="font-mono">features</code> = permisos (ads, affiliates, crear-tienda, pixel, webhooks).</p></div>
      {msg && <div role="status" className="p-3 rounded-xl bg-secondary/15 text-secondary text-sm font-bold">{msg}</div>}
      {err && <div role="alert" className="p-3 rounded-xl bg-error/10 text-error text-sm font-bold">{err}</div>}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((p) => (
          <div key={p.slug} className="p-5 rounded-3xl gs-glass flex flex-col gap-1">
            <div className="font-mono text-xs text-outline">{p.slug}</div>
            {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-full h-28 rounded-2xl object-cover" />}
            <div className="font-bold text-lg">{p.name} · ${p.priceMonthlyCop.toLocaleString("es-CO")} COP/mes</div>
            <div className="text-xs text-on-surface-variant">Tiendas: {p.maxStores} · Productos: {p.maxProducts === -1 ? "∞" : p.maxProducts}</div>
            <div className="text-xs font-mono bg-black/30 rounded-lg p-2 mt-1 break-all">{JSON.stringify(p.features || {})}</div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => { setEditing(p); setEditForm({ name: p.name, priceMonthlyUsd: p.priceMonthlyUsd, priceMonthlyCop: p.priceMonthlyCop, imageUrl: p.imageUrl || "", maxStores: p.maxStores, maxProducts: p.maxProducts, features: JSON.stringify(p.features || {}) }); }} className="text-xs font-bold text-primary">Editar</button>
              <button disabled={busy} onClick={() => remove(p)} className="text-xs font-bold text-error">Eliminar</button>
            </div>
          </div>
        ))}
      </div>
      {editing ? (
        <div className="p-5 rounded-3xl gs-glass flex flex-col gap-2 max-w-2xl">
          <h3 className="font-bold">Editar {editing.slug}</h3>
          <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Nombre" className="bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" />
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs">COP/mes<input type="number" min={0} value={editForm.priceMonthlyCop} onChange={(e) => setEditForm({ ...editForm, priceMonthlyCop: Number(e.target.value) })} className="w-full mt-1 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" /></label>
            <label className="text-xs">Tiendas<input type="number" min={1} value={editForm.maxStores} onChange={(e) => setEditForm({ ...editForm, maxStores: Number(e.target.value) })} className="w-full mt-1 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" /></label>
            <label className="text-xs">Productos (-1=∞)<input type="number" value={editForm.maxProducts} onChange={(e) => setEditForm({ ...editForm, maxProducts: Number(e.target.value) })} className="w-full mt-1 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" /></label>
          </div>
          <label className="text-xs">Imagen de la tarjeta (URL)<input value={editForm.imageUrl} onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })} placeholder="https://…" className="w-full mt-1 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" /></label>
          {editForm.imageUrl && <img src={editForm.imageUrl} alt="" className="w-full h-28 rounded-2xl object-cover" />}
          <label className="text-xs">features (JSON)<textarea value={editForm.features} onChange={(e) => setEditForm({ ...editForm, features: e.target.value })} rows={3} className="w-full mt-1 bg-surface px-3 py-2 rounded-xl text-xs border border-outline-variant/30 font-mono" /></label>
          <div className="flex gap-2"><button disabled={busy} onClick={saveEdit} className="px-4 py-2 rounded-xl bg-primary-container text-on-primary-container font-bold text-sm">Guardar</button><button onClick={() => setEditing(null)} className="text-xs font-bold text-outline">Cancelar</button></div>
        </div>
      ) : (
        <div className="p-5 rounded-3xl gs-glass flex flex-col gap-2 max-w-2xl">
          <h3 className="font-bold">+ Nuevo plan</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })} placeholder="SLUG_EJ" className="bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30 font-mono" />
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre" className="bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" />
            <label className="text-xs">COP/mes<input type="number" min={0} value={form.priceMonthlyCop} onChange={(e) => setForm({ ...form, priceMonthlyCop: Number(e.target.value) })} className="w-full mt-1 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" /></label>
            <label className="text-xs">Imagen (URL)<input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" className="w-full mt-1 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" /></label>
            <label className="text-xs">Tiendas<input type="number" min={1} value={form.maxStores} onChange={(e) => setForm({ ...form, maxStores: Number(e.target.value) })} className="w-full mt-1 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" /></label>
            <label className="text-xs">Productos (-1=∞)<input type="number" value={form.maxProducts} onChange={(e) => setForm({ ...form, maxProducts: Number(e.target.value) })} className="w-full mt-1 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" /></label>
            <label className="text-xs">features (JSON)<input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} className="w-full mt-1 bg-surface px-3 py-2 rounded-xl text-xs border border-outline-variant/30 font-mono" /></label>
          </div>
          <div><button disabled={busy || !form.slug || !form.name} onClick={create} className="px-4 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-sm disabled:opacity-50">Crear plan</button></div>
        </div>
      )}
    </div>
  );
}
