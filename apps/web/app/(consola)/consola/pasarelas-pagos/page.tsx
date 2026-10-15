"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, getToken, ShopOrder } from "../../../../lib/api-client";
import { cop } from "../../../../lib/cart";
import { Sparkline, Donut } from "../../../../components/charts/charts";
import { Reveal, CountUp, TiltZone } from "../../../../components/ui/motion";

interface GatewayState { boldPublicKeyMasked: string | null; boldConfigured: boolean; metaConfigured: boolean; metaPending?: boolean }

export default function PaymentsPage() {
  const [toast, setToast] = useState("");
  const [gw, setGw] = useState<GatewayState | null>(null);
  const [denied, setDenied] = useState<"login" | "customer" | null>(null);
  const [form, setForm] = useState({ boldPublicKey: "", boldSecretKey: "", metaAccessToken: "" });
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [statsLoaded, setStatsLoaded] = useState(false);

  const load = () => {
    if (!getToken()) { setDenied("login"); return; }
    apiFetch<GatewayState>("/tenant/gateway")
      .then((g) => { setGw(g); setDenied(null); })
      .catch((e) => setDenied(e.message.includes("comercio") || e.message.includes("403") ? "customer" : "login"));
    // Métricas reales de la tienda: sin mocks. Tienda nueva → ceros + estado vacío.
    apiFetch<ShopOrder[]>("/orders")
      .catch(() => apiFetch<ShopOrder[]>("/orders/mine").catch(() => [] as ShopOrder[]))
      .then((o) => { setOrders(o); setStatsLoaded(true); });
  };
  useEffect(load, []);

  const save = async () => {
    setSaving(true); setToast("");
    try {
      const g = await apiFetch<GatewayState>("/tenant/gateway", { method: "PUT", body: JSON.stringify(form) });
      setGw(g); setForm({ boldPublicKey: "", boldSecretKey: "", metaAccessToken: "" });
      setToast("Llaves guardadas cifradas (AES-256-GCM) en el servidor.");
    } catch (e) { setToast(e instanceof Error ? e.message : "Error guardando"); }
    finally { setSaving(false); setTimeout(() => setToast(""), 3500); }
  };

  const ping = async () => {
    setToast("Verificando Bold…");
    try {
      const g = await apiFetch<GatewayState>("/tenant/gateway");
      setGw(g);
      setToast(g.boldConfigured ? "Bold configurado: llaves presentes en servidor." : "Bold sin configurar: guarda tus llaves abajo.");
    } catch {
      setToast("Sin sesión de comercio: entra como comercio para verificar.");
    }
    setTimeout(() => setToast(""), 3000);
  };

  const paid = orders.filter((o) => o.status === "PAID");
  const decided = orders.filter((o) => o.status === "PAID" || o.status === "FAILED");
  const approval = decided.length > 0 ? (paid.length / decided.length) * 100 : null;
  const volume = paid.reduce((a, o) => a + o.total, 0);
  const byMethod = (m: string) => paid.filter((o) => o.paymentMethod === m).reduce((a, o) => a + o.total, 0);
  const pseShare = volume > 0 ? Math.round((byMethod("PSE") / volume) * 100) : 0;
  const cardShare = volume > 0 ? Math.round((byMethod("CARD") / volume) * 100) : 0;
  const nequiShare = volume > 0 ? Math.max(0, 100 - pseShare - cardShare) : 0;
  const spark = paid.map((o) => o.total).slice(-8);
  const emptyStats = statsLoaded && orders.length === 0;

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col xl:flex-row justify-between gap-4"><div><h1 className="font-display text-3xl font-extrabold tracking-tight">Pasarelas & Pagos</h1><p className="text-on-surface-variant text-sm">Bold · métricas reales de tu tienda · secretos cifrados AES-256 en servidor</p></div>
      <button onClick={ping} className="gs-press px-4 py-2 rounded-xl bg-surface-container-high font-bold text-sm">Verificar configuración</button></div>
      {toast && <div role="status" className="p-3 rounded-xl bg-secondary/15 text-secondary text-sm font-bold">{toast}</div>}
      {emptyStats && (
        <div className="p-5 rounded-3xl bg-secondary/10 border border-secondary/30 text-center">
          <p className="font-bold">Sin movimientos todavía</p>
          <p className="text-sm text-on-surface-variant">Cuando tu tienda reciba el primer cobro Bold, aquí verás aprobación, volumen y métodos reales.</p>
        </div>
      )}

      <TiltZone className="grid md:grid-cols-3 gap-4">
        <Reveal><div className="gs-tilt gs-card p-5 rounded-2xl gs-glass"><div className="text-xs uppercase text-outline font-bold">Aprobación ({decided.length} cobros decididos)</div><div className="text-2xl font-black tabular">{approval === null ? "—" : <><CountUp value={approval} decimals={1} suffix="%" /></>}</div><div className="mt-2"><Sparkline data={spark.length > 1 ? spark : [0, 0]} /></div></div></Reveal>
        <Reveal delay={70}><div className="gs-tilt gs-card p-5 rounded-2xl gs-glass"><div className="text-xs uppercase text-outline font-bold">Volumen cobrado ({paid.length} pagos)</div><div className="text-2xl font-black tabular">{cop(volume)}</div><div className="mt-3 flex h-2 rounded-full overflow-hidden bg-white/10"><div className="bg-primary" style={{ width: `${pseShare}%` }} /><div className="bg-secondary" style={{ width: `${cardShare}%` }} /><div className="bg-tertiary" style={{ width: `${nequiShare}%` }} /></div><div className="text-xs text-outline mt-1 tabular">PSE {pseShare}% · Tarjeta {cardShare}% · Nequi {nequiShare}%</div></div></Reveal>
        <Reveal delay={140}><div className="gs-tilt gs-card p-5 rounded-2xl gs-glass flex items-center gap-4"><Donut pct={approval === null ? 0 : Math.round(approval * 10) / 10} size={96} /><div><div className="text-xs uppercase text-outline font-bold">Intentos por estado</div><div className="font-bold tabular">{paid.length} aprobados · {orders.filter((o) => o.status === "PENDING_PAYMENT").length} pendientes · {orders.filter((o) => o.status === "FAILED").length} rechazados</div><div className="text-xs text-outline">Fuente: tus órdenes Bold</div></div></div></Reveal>
      </TiltZone>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="p-6 rounded-3xl gs-glass">
          <div className="flex items-center justify-between"><h2 className="font-bold">Credenciales Bold de Producción</h2><span className="text-xs px-3 py-1 rounded-full bg-surface-container-high font-semibold">Cifrado AES-256 servidor</span></div>
          {denied === "login" && <p className="text-sm text-on-surface-variant mt-3">Debes <Link href="/login?next=/consola/pasarelas-pagos" className="text-primary font-bold">entrar como comercio</Link> para gestionar llaves.</p>}
          {denied === "customer" && <p className="text-sm text-on-surface-variant mt-3">Tu rol es cliente: solo el comercio administra llaves y ve métricas de cobro.</p>}
          {gw && (
            <div className="mt-3 space-y-3">
              <div><label className="text-xs font-bold">Clave Pública (enmascarada)</label><div className="bg-surface-container-low rounded-xl px-3 py-2 font-mono text-sm">{gw.boldPublicKeyMasked || "— sin configurar —"}</div></div>
              <div><label className="text-xs font-bold">Clave Secreta</label><div className="bg-surface-container-low rounded-xl px-3 py-2 font-mono text-sm">•••••••• (solo servidor, jamás sale completa)</div></div>
              <div className="text-xs font-bold">{gw.boldConfigured ? <span className="text-secondary">● Bold configurado</span> : <span className="text-error">○ Bold sin configurar</span>} · {gw.metaConfigured ? <span className="text-secondary">● Meta conectado</span> : gw.metaPending ? <span className="text-primary">○ Meta pendiente de configuración</span> : <span className="text-outline">○ Meta desconectado</span>}</div>
              <div className="pt-2 border-t border-outline-variant/20 grid gap-2">
                <input value={form.boldPublicKey} onChange={(e) => setForm({ ...form, boldPublicKey: e.target.value })} placeholder="Nueva clave pública (opcional)" className="bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" />
                <input value={form.boldSecretKey} onChange={(e) => setForm({ ...form, boldSecretKey: e.target.value })} placeholder="Nueva clave secreta (opcional)" type="password" className="bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" />
                <input value={form.metaAccessToken} onChange={(e) => setForm({ ...form, metaAccessToken: e.target.value })} placeholder="Nuevo token Meta (opcional)" type="password" className="bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" />
                <button disabled={saving} onClick={save} className="px-5 py-2.5 rounded-xl bg-primary-container text-on-primary-container font-bold text-sm disabled:opacity-50">{saving ? "Guardando…" : "Guardar llaves cifradas"}</button>
              </div>
            </div>
          )}
        </div>
        <div className="p-6 rounded-3xl gs-glass"><h2 className="font-bold">Orquestación Webhooks</h2><div className="font-mono text-sm bg-surface-container-low rounded-xl p-2 mt-3">POST /api/v1/webhooks/bold · firma x-bold-signature</div>
          <ul className="text-sm mt-3 space-y-2"><li><code className="text-secondary font-bold">payment.approved</code> → Pagada + factura</li><li><code className="text-tertiary font-bold">payment.pending</code> → WhatsApp T+5min</li><li><code className="text-error font-bold">payment.rejected</code> → remarketing CAPI</li></ul></div>
      </div>
    </div>
  );
}
