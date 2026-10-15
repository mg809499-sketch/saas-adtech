"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../../lib/api-client";

interface Featured { id: string; name: string; price: number; tenantId: string }
interface Agreement {
  id: string; commissionPct: number; status: string; direction?: string;
  sourceSlug?: string; targetSlug?: string; sourceName?: string | null; targetName?: string | null;
}

const STATUS_LABEL: Record<string, string> = { PENDING: "En revisión por plataforma", ACTIVE: "Activa", REVOKED: "Finalizada" };

function StatusChip({ s }: { s: string }) {
  const cls = s === "ACTIVE" ? "bg-secondary/15 text-secondary" : s === "PENDING" ? "bg-primary/15 text-primary" : "bg-white/10 text-outline";
  return <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${cls}`}>{STATUS_LABEL[s] ?? s}</span>;
}

interface DirectoryStore { id: string; name: string | null; slug: string | null; logoUrl: string | null; plan: string; products: number }

export default function AffiliatesPage() {
  const [featured, setFeatured] = useState<Featured[]>([]);
  const [mine, setMine] = useState<Agreement[]>([]);
  const [directory, setDirectory] = useState<DirectoryStore[]>([]);
  const [targetSlug, setTargetSlug] = useState("");
  const [commission, setCommission] = useState(15);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [f, m, stores] = await Promise.all([
        apiFetch<Featured[]>("/directory/featured-products"),
        apiFetch<Agreement[]>("/affiliates/mine"),
        apiFetch<DirectoryStore[]>("/stores/public").catch(() => [] as DirectoryStore[]),
      ]);
      setFeatured(f);
      setMine(m);
      // Directorio para elegir destino sin escribir el slug a ciegas.
      // Excluye tiendas con las que ya hay solicitud/alianza.
      const taken = new Set(m.flatMap((a) => [a.sourceSlug || "", a.targetSlug || ""]));
      setDirectory(stores.filter((s) => s.slug && !taken.has(s.slug)));
    } catch (e) { setError((e as Error).message); }
  };
  useEffect(() => { load(); }, []);

  const request = async () => {
    setError(null); setMsg(""); setBusy(true);
    try {
      await apiFetch("/affiliates/request", { method: "POST", body: JSON.stringify({ targetSlug, commissionPct: commission }) });
      setTargetSlug(""); await load();
      setMsg("Solicitud enviada. La plataforma la revisa y verás el estado aquí.");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const revoke = async (id: string) => {
    await apiFetch(`/affiliates/${id}/revoke`, { method: "POST" });
    await load();
  };

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto flex flex-col gap-6">
      <div><h1 className="font-display text-3xl font-extrabold tracking-tight">Red Aliada / Afiliados</h1><p className="text-sm text-on-surface-variant">Solicita pauta cruzada con otras tiendas. La plataforma aprueba cada alianza.</p>{error && <p role="alert" className="text-xs text-error mt-1 font-bold">{error}</p>}{msg && <p className="text-xs text-secondary mt-1 font-bold">{msg}</p>}</div>
      <div className="grid md:grid-cols-3 gap-4">{[["Productos destacados", `${featured.length}`], ["Mis solicitudes", `${mine.length}`], ["Alianzas activas", `${mine.filter((m) => m.status === "ACTIVE").length}`]].map(([l, v]) => <div key={l} className="p-5 rounded-2xl gs-glass"><div className="text-xs uppercase text-outline font-bold">{l}</div><div className="text-2xl font-black tabular">{v}</div></div>)}</div>
      <div className="p-6 rounded-3xl gs-glass">
        <h3 className="font-bold font-display">Solicitar pauta aliada</h3>
        <p className="text-xs text-on-surface-variant mt-1">1. Elige la tienda destino · 2. La aprueba el equipo GrowUp · 3. Sus productos entran al escaparate. <a href="/tiendas" className="text-primary font-bold">Ver directorio →</a></p>
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <input value={targetSlug} onChange={(e) => setTargetSlug(e.target.value)} placeholder="Tienda destino (elige o escribe el slug)" aria-label="Tienda destino" list="red-aliada-tiendas" className="px-4 py-2.5 rounded-xl gs-input text-sm flex-1" />
          <datalist id="red-aliada-tiendas">
            {directory.map((s) => <option key={s.id} value={s.slug || ""}>{s.name || s.slug} · {s.plan} ({s.products} productos)</option>)}
          </datalist>
          <label className="flex items-center gap-2 text-sm">Comisión <input type="number" min={1} max={35} value={commission} onChange={(e) => setCommission(Number(e.target.value))} aria-label="Comisión en porcentaje" className="px-3 py-2.5 rounded-xl gs-input text-sm w-24 tabular" /><span className="text-outline">%</span></label>
          <button disabled={busy || !targetSlug.trim()} onClick={request} className="gs-press px-5 py-2.5 rounded-xl bg-secondary text-on-secondary font-bold text-sm disabled:opacity-40">{busy ? "Enviando…" : "Solicitar alianza"}</button>
        </div>
      </div>
      <div className="p-6 rounded-3xl gs-glass">
        <h3 className="font-bold font-display">Estado de mis solicitudes</h3>
        <p className="text-xs text-on-surface-variant mt-1">Contenedor dinámico: refleja la resolución de la plataforma en tiempo real al recargar.</p>
        <div className="mt-3 flex flex-col gap-2">
          {mine.map((a) => (
            <div key={a.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-t border-outline-variant/10 py-3 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusChip s={a.status} />
                <span className="font-semibold">{a.direction === "OUTGOING" ? `→ ${a.targetName ?? a.targetSlug}` : `← ${a.sourceName ?? a.sourceSlug}`}</span>
                <span className="text-outline tabular">{a.commissionPct}% comisión</span>
              </div>
              {a.status === "PENDING" && a.direction === "OUTGOING" && <button onClick={() => revoke(a.id)} className="gs-press self-start text-xs font-bold text-error hover:underline">Cancelar solicitud</button>}
            </div>
          ))}
          {mine.length === 0 && <p className="text-xs text-outline mt-2">Aún no tienes solicitudes. Envía la primera arriba.</p>}
        </div>
      </div>
      <div className="p-6 rounded-3xl gs-glass">
        <h3 className="font-bold font-display">Escaparate aliado</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          {featured.map((p) => <div key={p.id} className="gs-card p-4 rounded-2xl bg-white/5"><div className="font-bold text-sm">{p.name}</div><div className="font-black tabular">${p.price.toLocaleString("es-CO")}</div></div>)}
          {featured.length === 0 && <p className="text-xs text-outline">El escaparate se llena cuando haya alianzas activas.</p>}
        </div>
      </div>
    </div>
  );
}
