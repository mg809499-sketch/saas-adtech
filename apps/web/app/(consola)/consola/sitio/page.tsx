"use client";
import { useEffect, useState } from "react";
import { apiFetch, getConsoleTenant, getTenant } from "../../../../lib/api-client";
import { myStores } from "../../../../lib/billing";
import { Reveal } from "../../../../components/ui/motion";
import { PagesEditor } from "../../../../components/site/PagesEditor";

interface DomainState { domain: string | null; status: string; verifiedAt: string | null; txtValue: string | null }

const PRESETS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4"];
const HEX = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

// Vacío = no cambiar (el API exige mínimos: @IsOptional salta undefined,
// pero "" fallaría MinLength/Matches → 400).
const clean = (o: Record<string, string>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ""));

export default function SitioPage() {
  const [tab, setTab] = useState<"tema" | "seo" | "dominio" | "datos" | "paginas">("tema");
  const [tid, setTid] = useState("");
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<Record<string, string>>({});
  const [seo, setSeo] = useState({ title: "", description: "" });
  const [store, setStore] = useState({ storeName: "", logoUrl: "" });
  const [dom, setDom] = useState<DomainState | null>(null);
  const [newDomain, setNewDomain] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const ok = (m: string) => { setErr(""); setMsg(m); setTimeout(() => setMsg(""), 4000); };
  const fail = (e: unknown) => { setMsg(""); setErr(e instanceof Error ? e.message : "Error"); };

  // Precarga: la tienda ya tiene tema/SEO/datos (el API los trae en /stores/mine).
  // Sin esto el formulario nace vacío y cada guardado es no-op o 400.
  useEffect(() => {
    const id = (typeof window !== "undefined" && (getConsoleTenant() || getTenant())) || "";
    setTid(id);
    if (id) apiFetch<DomainState>(`/stores/${id}/domain`).then(setDom).catch(() => setDom(null));
    myStores()
      .then((stores) => {
        const mine = stores.find((s) => s.id === id) || null;
        if (!mine) { if (stores.length === 0) setErr("No encontramos tu tienda en este contexto."); return; }
        if (mine.theme) setTheme({ ...mine.theme });
        setSeo({ title: mine.seo?.title || "", description: mine.seo?.description || "" });
        setStore({ storeName: mine.storeName || "", logoUrl: mine.logoUrl || "" });
      })
      .catch((e) => fail(e))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDomain = () => {
    if (!tid) return;
    apiFetch<DomainState>(`/stores/${tid}/domain`).then(setDom).catch(() => setDom(null));
  };

  const needTid = () => {
    if (tid) return true;
    fail(new Error("Sin tienda en contexto: vuelve a la consola e inténtalo de nuevo."));
    return false;
  };

  const saveTheme = async () => {
    setErr(""); setMsg("");
    if (!needTid()) return;
    const body = clean(theme);
    if (body.primary && !HEX.test(body.primary)) { fail(new Error("Color primario inválido: usa hex de 3 o 6 dígitos, ej. #6366f1.")); return; }
    if (body.accent && !HEX.test(body.accent)) { fail(new Error("Color acento inválido: usa hex de 3 o 6 dígitos, ej. #10b981.")); return; }
    if (Object.keys(body).length === 0) { fail(new Error("Nada que guardar: cambia al menos un campo del tema.")); return; }
    setBusy("theme");
    try {
      const r = await apiFetch<{ theme: Record<string, string> }>(`/stores/${tid}/theme`, { method: "PATCH", body: JSON.stringify(body) });
      if (r.theme) setTheme({ ...r.theme });
      ok("Tema guardado. Verifícalo en tu vitrina.");
    } catch (e) { fail(e); } finally { setBusy(null); }
  };
  const saveSeo = async () => {
    setErr(""); setMsg("");
    if (!needTid()) return;
    const body = clean(seo);
    if (Object.keys(body).length === 0) { fail(new Error("Escribe título (mín. 10 caracteres) y descripción (mín. 30) antes de guardar.")); return; }
    setBusy("seo");
    try {
      const r = await apiFetch<{ seo: { title?: string; description?: string } }>(`/stores/${tid}/seo`, { method: "PATCH", body: JSON.stringify(body) });
      setSeo({ title: r.seo?.title || "", description: r.seo?.description || "" });
      ok("SEO guardado.");
    } catch (e) { fail(e); } finally { setBusy(null); }
  };
  const saveStore = async () => {
    setErr(""); setMsg("");
    if (!needTid()) return;
    const body = clean(store);
    if (Object.keys(body).length === 0) { fail(new Error("Escribe el nombre de la tienda (mín. 3 caracteres) antes de guardar.")); return; }
    setBusy("store");
    try {
      const r = await apiFetch<{ storeName?: string | null; logoUrl?: string | null }>(`/stores/${tid}`, { method: "PATCH", body: JSON.stringify(body) });
      setStore({ storeName: r.storeName || "", logoUrl: r.logoUrl || "" });
      ok("Datos guardados.");
    } catch (e) { fail(e); } finally { setBusy(null); }
  };
  const cleanDomain = (v: string) =>
    v.toLowerCase().trim().replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "").replace(/\.$/, "");
  const attach = async () => {
    setErr(""); setMsg("");
    if (!needTid()) return;
    try { await apiFetch(`/stores/${tid}/domain`, { method: "POST", body: JSON.stringify({ domain: cleanDomain(newDomain) }) }); setNewDomain(""); loadDomain(); ok("Dominio vinculado. Completa la verificación TXT."); }
    catch (e) { fail(e); }
  };
  const verify = async () => {
    setErr(""); setMsg("Verificando DNS…");
    try {
      const r = await apiFetch<{ verified: boolean; hint?: string }>(`/stores/${tid}/domain/verify`, { method: "POST" });
      if (r.verified) ok("¡Dominio verificado! ✓");
      else fail(new Error(r.hint || "Aún no se ve el TXT."));
      loadDomain();
    } catch (e) { fail(e); }
  };

  return (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto flex flex-col gap-5">
      <div><h1 className="text-3xl font-extrabold">Personaliza tu sitio web</h1><p className="text-sm text-on-surface-variant">Tema, SEO y dominio propio de tu tienda.</p></div>
      {loading && <div className="text-sm text-on-surface-variant">Cargando los datos actuales de tu sitio…</div>}
      {msg && <div role="status" className="p-3 rounded-xl bg-secondary/15 text-secondary text-sm font-bold">{msg}</div>}
      {err && <div role="alert" className="p-3 rounded-xl bg-error/10 text-error text-sm font-bold">{err}</div>}
      <div className="flex gap-2 bg-surface-container-low p-1.5 rounded-xl w-fit">
        {(["tema", "seo", "dominio", "datos", "paginas"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-bold capitalize ${tab === t ? "bg-surface-container shadow" : "text-on-surface-variant"}`}>{t === "paginas" ? "🧱 Constructor visual" : t === "datos" ? "Datos" : t === "seo" ? "SEO" : t === "tema" ? "Tema" : "Dominio"}</button>
        ))}
      </div>

      {tab === "tema" && (
        <Reveal><div className="p-6 rounded-3xl gs-glass flex flex-col gap-4">
          <div><label className="text-xs font-bold">Color primario</label><div className="flex gap-2 mt-1 flex-wrap">{PRESETS.map((c) => <button key={c} onClick={() => setTheme({ ...theme, primary: c })} className="w-9 h-9 rounded-xl border-2" style={{ background: c, borderColor: theme.primary === c ? "#fff" : "transparent" }} />)}<input value={theme.primary || ""} onChange={(e) => setTheme({ ...theme, primary: e.target.value })} placeholder="#6366f1" className="bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30 font-mono w-28" /></div></div>
          <div><label className="text-xs font-bold">Color acento</label><div className="flex gap-2 mt-1 flex-wrap">{PRESETS.map((c) => <button key={c} onClick={() => setTheme({ ...theme, accent: c })} className="w-9 h-9 rounded-xl border-2" style={{ background: c, borderColor: theme.accent === c ? "#fff" : "transparent" }} />)}<input value={theme.accent || ""} onChange={(e) => setTheme({ ...theme, accent: e.target.value })} placeholder="#10b981" className="bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30 font-mono w-28" /></div></div>
          {[["heroTitle", "Título del hero"], ["heroSubtitle", "Subtítulo del hero"], ["announcement", "Anuncio superior"], ["bannerUrl", "URL del banner (imagen)"]].map(([k, ph]) => (
            <div key={k}><label className="text-xs font-bold">{ph}</label><input value={theme[k] || ""} onChange={(e) => setTheme({ ...theme, [k]: e.target.value })} placeholder={ph} className="w-full mt-1 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" /></div>
          ))}
          <div className="rounded-2xl overflow-hidden border border-outline-variant/20 p-5 text-center" style={{ background: `linear-gradient(135deg, ${theme.primary || "#6366f1"}33, transparent)` }}>
            <div className="text-xs uppercase text-outline font-bold">Vista previa</div>
            <div className="text-2xl font-extrabold mt-1" style={{ color: theme.primary || undefined }}>{theme.heroTitle || "Tu tienda"}</div>
            <div className="text-sm text-on-surface-variant">{theme.heroSubtitle || "Subtítulo de ejemplo"}</div>
            {theme.announcement && <div className="mt-2 text-xs font-bold px-3 py-1 rounded-full inline-block" style={{ background: theme.accent || "#10b981" }}>{theme.announcement}</div>}
          </div>
          <button onClick={saveTheme} disabled={busy === "theme" || loading} className="self-start px-5 py-2.5 rounded-xl bg-primary-container text-on-primary-container font-bold text-sm disabled:opacity-50">{busy === "theme" ? "Guardando…" : "Guardar tema"}</button>
        </div></Reveal>
      )}

      {tab === "seo" && (
        <Reveal><div className="p-6 rounded-3xl gs-glass flex flex-col gap-4">
          <div><div className="flex justify-between"><label className="text-xs font-bold">Título (10-70)</label><span className="text-xs text-outline">{seo.title.length}/70</span></div><input value={seo.title} onChange={(e) => setSeo({ ...seo, title: e.target.value })} className="w-full mt-1 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" /></div>
          <div><div className="flex justify-between"><label className="text-xs font-bold">Descripción (30-160)</label><span className="text-xs text-outline">{seo.description.length}/160</span></div><textarea value={seo.description} onChange={(e) => setSeo({ ...seo, description: e.target.value })} rows={3} className="w-full mt-1 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" /></div>
          <div className="rounded-2xl border border-outline-variant/20 p-4 bg-white/[0.03]"><div className="text-xs text-outline">Vista previa en Google</div><div className="text-[#8ab4f8] text-lg">{seo.title || "Título de tu tienda"}</div><div className="text-sm text-on-surface-variant">{seo.description || "Descripción…"}</div></div>
          <button onClick={saveSeo} disabled={busy === "seo" || loading} className="self-start px-5 py-2.5 rounded-xl bg-primary-container text-on-primary-container font-bold text-sm disabled:opacity-50">{busy === "seo" ? "Guardando…" : "Guardar SEO"}</button>
        </div></Reveal>
      )}

      {tab === "dominio" && (
        <Reveal><div className="p-6 rounded-3xl gs-glass flex flex-col gap-4">
          <div className="text-sm">Estado: {dom?.domain ? <><code className="font-mono text-primary">{dom.domain}</code> · <b className={dom.status === "VERIFIED" ? "text-secondary" : "text-tertiary"}>{dom.status}</b></> : <span className="text-outline">sin dominio propio (usas slug.growupstore.app)</span>}</div>
          <div className="flex gap-2 flex-wrap">
            <input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="https://www.tutienda.com o tutienda.com" className="flex-1 min-w-52 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30 font-mono" />
            <button onClick={attach} className="px-4 py-2 rounded-xl bg-surface-container-high font-bold text-sm">Vincular</button>
          </div>
          {dom?.domain && dom.status !== "VERIFIED" && (
            <div className="p-4 rounded-2xl bg-surface-container-low text-sm flex flex-col gap-2">
              <p>Para demostrar que el dominio es tuyo, crea este registro <b>TXT</b> en tu DNS (Cloudflare: nombre <code className="font-mono">_growup-verify</code>):</p>
              <code className="font-mono text-xs bg-black/30 p-2 rounded-lg break-all">Nombre: _growup-verify · Valor: {dom.txtValue}</code>
              <div><button onClick={verify} className="px-4 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-sm">Verificar ahora</button></div>
            </div>
          )}
          {dom?.domain && <button onClick={() => apiFetch(`/stores/${tid}/domain`, { method: "DELETE" }).then(loadDomain).catch((e) => fail(e))} className="self-start text-xs text-error font-bold">Desvincular dominio</button>}
        </div></Reveal>
      )}

      {tab === "datos" && (
        <Reveal><div className="p-6 rounded-3xl gs-glass flex flex-col gap-4">
          <div><label className="text-xs font-bold">Nombre de la tienda</label><input value={store.storeName} onChange={(e) => setStore({ ...store, storeName: e.target.value })} className="w-full mt-1 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" /></div>
          <div><label className="text-xs font-bold">Logo (URL de imagen)</label><input value={store.logoUrl} onChange={(e) => setStore({ ...store, logoUrl: e.target.value })} placeholder="https://…" className="w-full mt-1 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" /></div>
          <button onClick={saveStore} disabled={busy === "store" || loading} className="self-start px-5 py-2.5 rounded-xl bg-primary-container text-on-primary-container font-bold text-sm disabled:opacity-50">{busy === "store" ? "Guardando…" : "Guardar datos"}</button>
        </div></Reveal>
      )}

      {tab === "paginas" && <PagesEditor />}
    </div>
  );
}
