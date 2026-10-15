"use client";
import { useEffect, useState } from "react";
import { apiFetch, getTenant } from "../../../../lib/api-client";

interface DomainState { domain: string | null; status: string; verifiedAt: string | null; txtValue: string | null }
interface Quote { domain: string; available: boolean; priceUsd: number | null }

export default function DomainPage() {
  const [sub, setSub] = useState("mitienda");
  const [msg, setMsg] = useState("");
  const [dom, setDom] = useState<DomainState | null>(null);
  const [newDomain, setNewDomain] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Quote[]>([]);
  const [source, setSource] = useState<"mock" | "namecheap" | null>(null);
  const [searching, setSearching] = useState(false);
  const tid = typeof window !== "undefined" ? getTenant() : "";

  const load = () => apiFetch<DomainState>(`/stores/${tid}/domain`).then(setDom).catch(() => setDom(null));
  useEffect(() => { load(); }, []);

  const clean = (v: string) =>
    v.toLowerCase().trim().replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "").replace(/\.$/, "");

  const attach = async () => {
    setMsg("");
    try {
      await apiFetch(`/stores/${tid}/domain`, { method: "POST", body: JSON.stringify({ domain: clean(newDomain) }) });
      setNewDomain(""); load(); setMsg("Dominio vinculado. Agrega el TXT y verifica.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Error"); }
  };
  const verify = async () => {
    setMsg("Verificando DNS…");
    try {
      const r = await apiFetch<{ verified: boolean; hint?: string }>(`/stores/${tid}/domain/verify`, { method: "POST" });
      setMsg(r.verified ? "¡Dominio verificado! ✓" : r.hint || "Aún no se ve el TXT.");
      load();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Error"); }
  };
  const unlink = async () => {
    await apiFetch(`/stores/${tid}/domain`, { method: "DELETE" });
    load();
  };
  const runSearch = async () => {
    if (search.trim().length < 3) { setMsg("Escribe al menos 3 caracteres para buscar."); return; }
    setSearching(true); setMsg("");
    try {
      const r = await apiFetch<{ source: "mock" | "namecheap"; results: Quote[] }>(`/stores/${tid}/domain-search?q=${encodeURIComponent(search.trim())}`);
      setResults(r.results); setSource(r.source);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Error buscando"); }
    finally { setSearching(false); }
  };
  const quote = async (domain: string) => {
    setMsg("");
    try {
      const r = await apiFetch<{ domain: string; priceUsd: number; next: string }>(`/stores/${tid}/domain/purchase`, { method: "POST", body: JSON.stringify({ domain }) });
      setMsg(`${r.domain} cotizado en $${r.priceUsd} USD. ${r.next}`);
      setNewDomain(r.domain);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Error"); }
  };

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto flex flex-col gap-6">
      <div><h1 className="font-display text-3xl font-extrabold tracking-tight">Dominio & Marca</h1><p className="text-sm text-on-surface-variant">Subdominio gratuito + busca, cotiza y vincula tu dominio propio.</p>{msg && <p className="text-sm font-bold text-secondary mt-1">{msg}</p>}</div>
      <div className="p-6 rounded-3xl gs-glass"><h2 className="font-bold font-display">Subdominio gratuito</h2>
        <p className="text-xs text-on-surface-variant mt-1">Se activa al crear tu tienda (plantilla Catálogo + 14 días de trial). Requiere el registro wildcard <code className="font-mono">*.growupstore.app</code> en el edge.</p>
        <div className="flex gap-2 mt-3 flex-wrap items-center"><span className="bg-surface-container-lowest px-3 py-2 rounded-lg font-bold">https://</span><input value={sub} onChange={(e) => setSub(e.target.value)} aria-label="Subdominio" className="bg-surface-container-lowest px-3 py-2 rounded-lg font-bold" /><span className="px-3 py-2 text-primary font-bold">.growupstore.app</span>
        <button onClick={() => { navigator.clipboard?.writeText(`https://${sub}.growupstore.app`); setMsg("¡Copiado!"); setTimeout(() => setMsg(""), 2000); }} className="gs-press px-4 py-2 rounded-lg bg-surface-container-high font-bold text-sm">Copiar</button></div></div>
      <div className="p-6 rounded-3xl gs-glass">
        <h2 className="font-bold font-display">Buscar y cotizar dominio</h2>
        <div className="flex gap-2 mt-3 flex-col sm:flex-row">
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runSearch()} placeholder="tutienda (.com, .co, .store…)" aria-label="Buscar dominio" className="px-4 py-2.5 rounded-xl gs-input text-sm flex-1" />
          <button onClick={runSearch} disabled={searching} className="gs-press px-5 py-2.5 rounded-xl bg-secondary text-on-secondary font-bold text-sm disabled:opacity-40">{searching ? "Buscando…" : "Buscar"}</button>
        </div>
        {source === "mock" && <p className="text-xs text-outline mt-2">Precios de referencia (proveedor sin configurar). La disponibilidad se confirma al vincular.</p>}
        {results.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {results.map((r) => (
              <div key={r.domain} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-surface-container-low">
                <div><span className="font-bold">{r.domain}</span> <span className={`text-xs font-bold ${r.available ? "text-secondary" : "text-error"}`}>{r.available ? "Disponible" : "Ocupado"}</span></div>
                <div className="flex items-center gap-3">
                  <span className="font-black tabular">{r.priceUsd != null ? `$${r.priceUsd} USD` : "—"}</span>
                  {r.available && <button onClick={() => quote(r.domain)} className="gs-press px-4 py-2 rounded-xl bg-surface-container-high font-bold text-xs">Cotizar y vincular</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="p-6 rounded-3xl gs-glass"><h2 className="font-bold font-display">Tu dominio propio</h2>
        {dom?.domain
          ? <div className="mt-3 text-sm flex flex-col gap-2">
              <div><span className="font-bold">{dom.domain}</span> · <span className={dom.status === "VERIFIED" ? "text-secondary font-bold" : "text-primary font-bold"}>{dom.status}</span></div>
              {dom.status !== "VERIFIED" && dom.txtValue && <div className="p-3 rounded-xl gs-glass font-mono text-xs">TXT _growup-verify.{dom.domain} = {dom.txtValue}</div>}
              <div className="flex gap-2">
                {dom.status !== "VERIFIED" && <button onClick={verify} className="gs-press px-4 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-sm">Verificar DNS</button>}
                <button onClick={unlink} className="gs-press px-4 py-2 rounded-xl bg-surface-container-high font-bold text-sm">Desvincular</button>
              </div>
            </div>
          : <div className="flex gap-2 mt-3 flex-col sm:flex-row"><input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="tutienda.com" aria-label="Dominio a vincular" className="px-4 py-2.5 rounded-xl gs-input text-sm flex-1" /><button onClick={attach} className="gs-press px-4 py-2 rounded-xl bg-primary font-bold text-sm">Vincular</button></div>}
      </div>
    </div>
  );
}
