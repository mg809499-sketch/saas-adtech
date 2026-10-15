"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ShopProduct } from "../../lib/api-client";
import { Block, BlockRenderer } from "./BlockRenderer";
import { FontPicker } from "./FontPicker";

interface Page { id: string; slug: string; title: string; status: string }
const TYPES = ["hero", "texto", "imagen", "productos", "coleccion", "testimonios", "faq", "footer", "html", "boton"] as const;
const EDITABLE_STRINGS = ["title", "subtitle", "content", "text", "ctaText", "ctaHref", "imageUrl", "alt", "href", "radius", "titleSize", "titleColor", "fontSize", "color", "align", "category", "code", "variant"];

export function PagesEditor() {
  const [pages, setPages] = useState<Page[]>([]);
  const [pageId, setPageId] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const friendly = (e: unknown) => (e instanceof Error ? e.message : "Error");
  const say = (m: string) => { setErr(""); setMsg(m); setTimeout(() => setMsg(""), 3000); };
  const fail = (e: unknown) => { setMsg(""); setErr(friendly(e)); };

  const loadPages = () => { apiFetch<Page[]>("/pages").then((p) => { setErr(""); setPages(p); if (!pageId && p.length) setPageId(p[0].id); }).catch((e) => { setPages([]); fail(`No se pudieron cargar las páginas: ${friendly(e)}`); }); };
  useEffect(() => { loadPages(); }, []);
  useEffect(() => {
    if (!pageId) return;
    apiFetch<Block[]>(`/pages/${pageId}/blocks`).then((b) => { setBlocks(b); setSel(null); }).catch((e) => { setBlocks([]); fail(`No se pudieron cargar los bloques: ${friendly(e)}`); });
    apiFetch<ShopProduct[]>("/products").then(setProducts).catch(() => setProducts([]));
  }, [pageId]);

  const refresh = () => apiFetch<Block[]>(`/pages/${pageId}/blocks`).then(setBlocks).catch((e) => { fail(`No se pudo recargar: ${friendly(e)}`); });
  const patch = (id: string, body: object) =>
    apiFetch(`/pages/blocks/${id}`, { method: "PATCH", body: JSON.stringify(body) })
      .then(refresh)
      .catch((e) => { fail(e); throw e; });

  const addBlock = async (type: string) => {
    try {
      const b = await apiFetch<Block>(`/pages/${pageId}/blocks`, { method: "POST", body: JSON.stringify({ type, props: {} }) });
      setBlocks([...blocks, b]); setSel(b.id); say(`Bloque ${type} agregado.`);
    } catch (e) { fail(e); }
  };
  const move = async (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= blocks.length) return;
    const ids = blocks.map((b) => b.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try {
      const r = await apiFetch<Block[]>(`/pages/${pageId}/reorder`, { method: "POST", body: JSON.stringify({ ids }) });
      setBlocks(r);
    } catch (e) { fail(e); }
  };
  const publish = async (status: "DRAFT" | "PUBLISHED") => {
    try {
      await apiFetch(`/pages/${pageId}/${status === "PUBLISHED" ? "publish" : "unpublish"}`, { method: "PATCH" });
      loadPages(); say(status === "PUBLISHED" ? "¡Publicado! Visible en tu vitrina." : "Pasó a borrador.");
    } catch (e) { fail(e); }
  };
  const removeBlock = (id: string) => {
    apiFetch(`/pages/blocks/${id}`, { method: "DELETE" })
      .then(() => { setBlocks(blocks.filter((x) => x.id !== id)); if (sel === id) setSel(null); say("Bloque eliminado."); })
      .catch((e) => fail(e));
  };

  const cur = pages.find((p) => p.id === pageId);
  const selBlock = blocks.find((b) => b.id === sel) || null;

  const setProp = (k: string, v: unknown) => {
    if (!selBlock) return;
    setBlocks(blocks.map((b) => b.id === selBlock.id ? { ...b, props: { ...b.props, [k]: v } } : b));
  };
  const saveProps = () => {
    if (!selBlock) return;
    const { id, ...rest } = selBlock.props as Record<string, unknown>;
    void id;
    patch(selBlock.id, { props: rest }).then(() => say("Bloque guardado.")).catch(() => {});
  };

  return (
    <div className="flex flex-col gap-4">
      {msg && <div role="status" className="p-2.5 rounded-xl bg-secondary/15 text-secondary text-sm font-bold">{msg}</div>}
      {err && <div role="alert" className="p-2.5 rounded-xl bg-error/10 text-error text-sm font-bold">{err}</div>}
      <div className="flex flex-wrap items-center gap-2">
        <select value={pageId} onChange={(e) => setPageId(e.target.value)} className="bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30">
          {pages.map((p) => <option key={p.id} value={p.id}>{p.title} ({p.slug}) · {p.status}</option>)}
        </select>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cur?.status === "PUBLISHED" ? "bg-secondary/15 text-secondary" : "bg-tertiary/15 text-tertiary"}`}>{cur?.status}</span>
        <button onClick={() => publish("PUBLISHED")} className="px-4 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-sm">Publicar</button>
        <button onClick={() => publish("DRAFT")} className="px-4 py-2 rounded-xl bg-surface-container-high font-bold text-sm">A borrador</button>
        <Link href="/consola/sitio/visualizador" className="px-4 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-sm">Visualizador sin código →</Link>
        <button onClick={() => setPreview(!preview)} className="ml-auto px-4 py-2 rounded-xl bg-primary-container text-on-primary-container font-bold text-sm">{preview ? "← Seguir editando" : "Vista previa real 👁"}</button>
        {preview && <button onClick={() => setMobile(!mobile)} className="px-4 py-2 rounded-xl bg-surface-container-high font-bold text-sm">{mobile ? "🖥 Desktop" : "📱 Móvil"}</button>}
      </div>

      {preview ? (
        <div className={`mx-auto w-full transition-all ${mobile ? "max-w-[390px]" : "max-w-4xl"}`}>
          <div className="gs-glass rounded-3xl p-5 lg:p-8">
            <div className="text-[11px] uppercase tracking-widest text-outline font-bold mb-2 text-center">Vista previa — así lo ve el cliente{mobile ? " (móvil)" : ""}</div>
            {blocks.filter((b) => b.visible).map((b) => <BlockRenderer key={b.id} block={b} products={products} preview basePath="" />)}
            {blocks.filter((b) => b.visible).length === 0 && <p className="text-center text-sm text-outline py-8">Página vacía: agrega bloques.</p>}
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-2">
            <div className="text-xs font-bold uppercase text-outline">Paleta — clic para agregar</div>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => <button key={t} onClick={() => addBlock(t)} className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-bright font-bold text-xs capitalize">+ {t}</button>)}
            </div>
            <div className="flex flex-col gap-2 mt-1">
              {blocks.map((b, i) => (
                <div key={b.id} onClick={() => setSel(b.id)} className={`p-3 rounded-2xl border cursor-pointer flex items-center gap-2 ${sel === b.id ? "border-primary bg-primary/10" : "border-outline-variant/20 gs-glass"} ${!b.visible ? "opacity-50" : ""}`}>
                  <span className="text-xs font-black uppercase bg-surface-container-high px-2 py-0.5 rounded-lg">{b.type}</span>
                  <span className="text-xs text-outline truncate flex-1">{String(b.props.title || b.props.content || b.props.text || b.id.slice(0, 6))}</span>
                  <button onClick={(e) => { e.stopPropagation(); move(i, -1); }} className="px-2 font-black">↑</button>
                  <button onClick={(e) => { e.stopPropagation(); move(i, 1); }} className="px-2 font-black">↓</button>
                  <button onClick={(e) => { e.stopPropagation(); patch(b.id, { visible: !b.visible }).then(() => setBlocks(blocks.map((x) => x.id === b.id ? { ...x, visible: !x.visible } : x))).catch(() => {}); }} title="Visible">{b.visible ? "👁" : "🚫"}</button>
                  <button onClick={(e) => { e.stopPropagation(); removeBlock(b.id); }} className="text-error font-black px-1">✕</button>
                </div>
              ))}
              {blocks.length === 0 && <p className="text-sm text-outline">Sin bloques. Agrega el primero desde la paleta.</p>}
            </div>
          </div>
          <div className="lg:col-span-5">
            {!selBlock ? <p className="text-sm text-outline">Selecciona un bloque para editarlo al 100%.</p> : (
              <div className="p-4 rounded-2xl gs-glass flex flex-col gap-3 sticky top-20">
                <div className="font-bold text-sm">Editar bloque <span className="uppercase text-primary">{selBlock.type}</span></div>
                {EDITABLE_STRINGS.filter((k) => k in selBlock.props || ["title", "content", "text", "imageUrl", "ctaText", "code", "href", "variant"].includes(k)).map((k) => (
                  <div key={k}>
                    <label className="text-xs font-bold text-outline">{k === "variant" ? "Estilo del botón" : k}</label>
                    {k === "variant" ? (
                      <select value={String(selBlock.props[k] || "primario")} onChange={(e) => setProp(k, e.target.value)} className="w-full mt-1 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30">
                        {(["primario", "secundario", "oferta"] as const).map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    ) : k === "code" || k === "content" ? (
                      <textarea value={String(selBlock.props[k] || "")} onChange={(e) => setProp(k, e.target.value)} rows={k === "code" ? 6 : 3} className="w-full mt-1 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30 font-mono" />
                    ) : (
                      <input value={String(selBlock.props[k] || "")} onChange={(e) => setProp(k, e.target.value)} placeholder={k === "href" ? "#catalogo o https://…" : ""} className="w-full mt-1 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" />
                    )}
                  </div>
                ))}
                <div>
                  <label className="text-xs font-bold text-outline">Fuente del bloque</label>
                  <FontPicker value={String(selBlock.props.fontFamily || "")} onPick={(f) => setProp("fontFamily", f)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs font-bold text-outline">Tamaño título</label><input value={String(selBlock.props.titleSize || "")} onChange={(e) => setProp("titleSize", e.target.value)} placeholder="32px" className="w-full mt-1 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" /></div>
                  <div><label className="text-xs font-bold text-outline">Color</label><input value={String(selBlock.props.titleColor || selBlock.props.color || "")} onChange={(e) => { setProp("titleColor", e.target.value); setProp("color", e.target.value); }} placeholder="#ffffff" className="w-full mt-1 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30 font-mono" /></div>
                </div>
                <button onClick={saveProps} className="py-2.5 rounded-xl bg-primary-container text-on-primary-container font-bold text-sm">Guardar bloque</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
