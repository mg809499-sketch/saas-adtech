"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../../lib/api-client";
import { Sparkline } from "../../../../components/charts/charts";
import { Reveal, CountUp, ProgressBar } from "../../../../components/ui/motion";

interface Campaign { id: string; name: string; dailyBudget: number; status: string; product?: { name: string } | null }
interface AdsStatus { connected: boolean; pending?: boolean; adAccount: string; pixel?: string | null; businessManagerId?: string | null }

export default function AdsPage() {
  const [status, setStatus] = useState<AdsStatus | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [budget, setBudget] = useState(20);
  const [productId, setProductId] = useState("");
  const [wizard, setWizard] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [conn, setConn] = useState({ accessToken: "", businessManagerId: "", adAccountId: "", pixelId: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [s, c, p] = await Promise.all([
        apiFetch<AdsStatus>("/meta-ads/status"),
        apiFetch<Campaign[]>("/meta-ads/campaigns").catch(() => []),
        apiFetch<{ id: string; name: string }[]>("/products").catch(() => []),
      ]);
      setStatus(s); setCampaigns(c);
      setProducts(p.map((x) => ({ id: x.id, name: x.name })));
      if (p[0]) setProductId(p[0].id);
    } catch (e) { setError((e as Error).message); }
  };
  useEffect(() => { load(); }, []);

  const connect = async () => {
    setError(null); setBusy(true);
    try {
      const s = await apiFetch<AdsStatus>("/meta-ads/connect", {
        method: "POST",
        body: JSON.stringify({
          accessToken: conn.accessToken,
          ...(conn.businessManagerId ? { businessManagerId: conn.businessManagerId } : {}),
          ...(conn.adAccountId ? { adAccountId: conn.adAccountId } : {}),
          ...(conn.pixelId ? { pixelId: conn.pixelId } : {}),
        }),
      });
      setStatus(s); setShowConnect(false);
      setConn({ accessToken: "", businessManagerId: "", adAccountId: "", pixelId: "" });
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const create = async () => {
    setError(null);
    try {
      await apiFetch("/meta-ads/campaigns", { method: "POST", body: JSON.stringify({ productId, dailyBudget: budget }) });
      setWizard(false); await load();
    } catch (e) { setError((e as Error).message); }
  };
  const toggle = async (c: Campaign) => {
    await apiFetch(`/meta-ads/campaigns/${c.id}/${c.status === "ACTIVE" ? "pause" : "resume"}`, { method: "PATCH" });
    await load();
  };

  const stateLabel = !status ? "cargando…" : status.connected
    ? `Conectado · ${status.adAccount} · píxel ${status.pixel}`
    : status.pending ? "Pendiente de configuración: falta cuenta o píxel" : "Desconectado";

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto flex flex-col gap-6">
      <div className="gs-glass rounded-2xl p-4 flex flex-col xl:flex-row justify-between gap-3">
        <div>
          <h1 className="font-bold font-display">Meta Ads Studio</h1>
          <p className="text-xs mt-1">
            {!status ? <span className="text-on-surface-variant">cargando…</span>
              : status.connected ? <span className="text-secondary font-bold">● {stateLabel}</span>
              : <span className="text-primary font-bold">○ {stateLabel}</span>}
          </p>
          {error && <p role="alert" className="text-xs text-error mt-1">{error}</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowConnect(true)} className="gs-press px-5 py-2 rounded-xl bg-surface-container-high border border-outline-variant/30 font-bold text-sm">
            {status?.connected ? "Actualizar conexión" : "Conectar con Meta"}
          </button>
          <button onClick={() => setWizard(true)} disabled={!status?.connected} title={status?.connected ? "" : "Conecta tu cuenta Meta primero"} className="gs-press px-5 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-sm disabled:opacity-40">+ Crear campaña Express</button>
        </div>
      </div>
      {!status?.connected && (
        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-sm">
          Conecta tu Business Manager, cuenta publicitaria, píxel y token para activar el Studio. Sin esos tres datos el estado es <b>pendiente de configuración</b>, nunca “conectado”.
        </div>
      )}
      <Reveal>
        <div className="grid md:grid-cols-3 gap-4">
          {[["Campañas", campaigns.length], ["Activas", campaigns.filter((c) => c.status === "ACTIVE").length], ["En revisión", campaigns.filter((c) => c.status === "PENDING_REVIEW").length]].map(([l, v]) => (
            <div key={l as string} className="p-5 rounded-2xl gs-glass"><div className="text-xs uppercase text-outline font-bold">{l}</div><div className="text-2xl font-black tabular"><CountUp value={Number(v)} /></div></div>
          ))}
        </div>
      </Reveal>
      <div className="rounded-2xl gs-glass overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead><tr className="text-xs uppercase text-outline"><th className="text-left p-3">Campaña</th><th className="text-right">Presupuesto</th><th className="text-right">Estado</th><th className="text-right pr-4">Acción</th></tr></thead>
          <tbody>{campaigns.map((c) => (
            <tr key={c.id} className="border-t border-outline-variant/10 gs-row-hover">
              <td className="p-3 font-bold">{c.name}<span className="block text-xs font-normal text-on-surface-variant">{c.product?.name ?? ""}</span></td>
              <td className="text-right tabular">${c.dailyBudget}/día</td>
              <td className="text-right text-xs font-bold">{c.status}</td>
              <td className="text-right pr-4"><button onClick={() => toggle(c)} className="gs-press text-xs font-bold text-primary hover:underline">{c.status === "ACTIVE" ? "Pausar" : "Activar"}</button></td>
            </tr>
          ))}</tbody>
        </table>
        {campaigns.length === 0 && <p className="text-xs text-outline p-4">Sin campañas todavía.</p>}
      </div>
      <div className="gs-glass rounded-2xl p-4"><div className="text-xs uppercase font-bold mb-2 text-outline">Presupuesto por campaña</div><Sparkline data={campaigns.map((c) => c.dailyBudget)} color="#8083ff" /></div>
      <div className="gs-glass rounded-2xl p-4"><ProgressBar pct={status?.connected ? 100 : status?.pending ? 45 : 10} color="bg-secondary" /></div>
      {showConnect && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowConnect(false)}>
          <div role="dialog" aria-modal="true" aria-label="Conectar cuenta Meta" className="gs-glass-strong rounded-3xl p-6 max-w-lg w-full flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold font-display text-lg">Conectar con Meta</h2>
            <p className="text-sm text-on-surface-variant">Datos de tu negocio en Meta Business Suite. Se guardan cifrados en el servidor y solo con los tres el estado pasa a conectado.</p>
            <label className="text-xs font-bold">Business Manager ID<input value={conn.businessManagerId} onChange={(e) => setConn({ ...conn, businessManagerId: e.target.value })} placeholder="1234567890" className="w-full mt-1 px-4 py-2.5 rounded-2xl text-sm bg-surface border border-outline-variant/30 font-mono" /></label>
            <label className="text-xs font-bold">Ad Account ID<input value={conn.adAccountId} onChange={(e) => setConn({ ...conn, adAccountId: e.target.value })} placeholder="act_981247192" className="w-full mt-1 px-4 py-2.5 rounded-2xl text-sm bg-surface border border-outline-variant/30 font-mono" /></label>
            <label className="text-xs font-bold">Pixel ID<input value={conn.pixelId} onChange={(e) => setConn({ ...conn, pixelId: e.target.value })} placeholder="987654321" className="w-full mt-1 px-4 py-2.5 rounded-2xl text-sm bg-surface border border-outline-variant/30 font-mono" /></label>
            <label className="text-xs font-bold">Access Token<input value={conn.accessToken} onChange={(e) => setConn({ ...conn, accessToken: e.target.value })} placeholder="Token de acceso (mín. 8 caracteres)" type="password" className="w-full mt-1 px-4 py-2.5 rounded-2xl text-sm bg-surface border border-outline-variant/30 font-mono" /></label>
            <div className="flex justify-end gap-2 mt-1"><button onClick={() => setShowConnect(false)} className="gs-press px-4 py-2 rounded-xl bg-surface-container-high font-bold text-sm">Cancelar</button><button disabled={busy || conn.accessToken.length < 8} onClick={connect} className="gs-press px-5 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-sm disabled:opacity-40">{busy ? "Conectando…" : "Guardar conexión"}</button></div>
          </div>
        </div>
      )}
      {wizard && <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setWizard(false)}><div role="dialog" aria-modal="true" aria-label="Campaña Express" className="gs-glass-strong rounded-3xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold font-display">Campaña Express</h2>
        <label className="text-xs uppercase font-bold block mt-4">Producto</label>
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full mt-1 p-2.5 rounded-xl gs-input text-sm">
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label className="text-xs uppercase font-bold block mt-4">Presupuesto: ${budget}/día</label>
        <input type="range" min={5} max={100} step={5} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="w-full accent-indigo-500" />
        <p className="text-sm text-on-surface-variant">Alcance estimado: {(budget * 750).toLocaleString()} - {(budget * 1400).toLocaleString()} (estimación interna, no dato de Meta)</p>
        <div className="flex justify-end gap-2 mt-4"><button onClick={() => setWizard(false)} className="gs-press px-4 py-2 rounded-xl bg-surface-container-high font-bold text-sm">Cancelar</button><button onClick={create} className="gs-press px-5 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-sm">Publicar</button></div>
      </div></div>}
    </div>
  );
}
