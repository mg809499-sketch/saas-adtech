"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../../../lib/api-client";

interface Dom {
  id: string; storeSlug: string | null; storeName: string | null;
  customDomain: string | null; domainStatus: string; domainVerifiedAt: string | null;
  subscription: { status: string; plan: { name: string } } | null;
}
interface Integrations { storeDomain: string; edgeAskConfigured: boolean; namecheapConfigured: boolean; mockPayments: boolean }

// Dominios propios en uso + conexiones de API (solo presencia, nunca secretos).
export default function PlataformaDominios() {
  const [rows, setRows] = useState<Dom[]>([]);
  const [integ, setInteg] = useState<Integrations | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => {
    apiFetch<Dom[]>("/admin/domains").then(setRows).catch((e) => setErr(e.message));
    apiFetch<Integrations>("/admin/integrations").then(setInteg).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const unlink = (d: Dom) => {
    if (!confirm(`Desvincular ${d.customDomain} de ${d.storeSlug}?`)) return;
    setErr(""); setMsg(""); setBusy(true);
    apiFetch(`/admin/domains/${d.id}`, { method: "DELETE" })
      .then(() => { setMsg("Dominio desvinculado."); load(); })
      .catch((e) => setErr(e instanceof Error ? e.message : "Error"))
      .finally(() => setBusy(false));
  };

  const chip = (ok: boolean, t: string, f: string) =>
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ok ? "bg-secondary/15 text-secondary" : "bg-tertiary/15 text-tertiary"}`}>{ok ? t : f}</span>;

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto flex flex-col gap-5">
      <div><h1 className="text-3xl font-extrabold">Dominios y API</h1><p className="text-sm text-on-surface-variant">Dominios propios activos + estado de las conexiones edge/proveedores.</p></div>
      {msg && <div role="status" className="p-3 rounded-xl bg-secondary/15 text-secondary text-sm font-bold">{msg}</div>}
      {err && <div role="alert" className="p-3 rounded-xl bg-error/10 text-error text-sm font-bold">{err}</div>}
      {integ && (
        <div className="gs-glass rounded-3xl p-5 flex flex-wrap gap-2 items-center text-sm">
          <b>Conexiones:</b>
          <span className="font-mono text-xs">{integ.storeDomain}</span>
          {chip(integ.edgeAskConfigured, "Edge TLS ask OK", "Edge ask sin secreto")}
          {chip(integ.namecheapConfigured, "Namecheap OK", "Namecheap mock")}
          {chip(!integ.mockPayments, "Pagos reales", "Pagos mock (demo)")}
        </div>
      )}
      <div className="overflow-x-auto rounded-3xl gs-glass"><table className="w-full text-sm min-w-[680px]">
        <thead><tr className="text-xs uppercase text-outline"><th className="text-left p-3">Dominio</th><th className="text-left">Tienda</th><th className="text-left">Estado</th><th className="text-left">Verificado</th><th></th></tr></thead>
        <tbody>{rows.map((d) => (
          <tr key={d.id} className="border-t border-outline-variant/20">
            <td className="p-3 font-mono font-bold">{d.customDomain}</td>
            <td>{d.storeName}<span className="block text-xs text-outline font-mono">{d.storeSlug} · {d.subscription?.plan.name}</span></td>
            <td className="text-xs font-bold">{d.domainStatus}</td>
            <td className="text-xs tabular">{d.domainVerifiedAt ? new Date(d.domainVerifiedAt).toLocaleDateString("es-CO") : "—"}</td>
            <td className="p-3 text-right"><button disabled={busy} onClick={() => unlink(d)} className="text-xs font-bold text-error">Desvincular</button></td>
          </tr>))}
        </tbody></table></div>
      {rows.length === 0 && <p className="text-sm text-outline">Ninguna tienda usa dominio propio todavía (usan slug.growupstore.app).</p>}
    </div>
  );
}
