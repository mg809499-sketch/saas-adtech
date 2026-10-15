"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ShopProduct } from "../../lib/api-client";
import { Block, BlockRenderer } from "./BlockRenderer";
import { FontPicker } from "./FontPicker";
import { BLOCK_META, placeholderFor } from "./blocks/placeholders";

interface Page { id: string; slug: string; title: string; status: string }
const TEMPLATES = [
  { slug: "minimal", name: "Minimal", desc: "Alta conversión" },
  { slug: "catalog", name: "Catálogo", desc: "Multicategoría + FAQ" },
  { slug: "landing", name: "Landing", desc: "Venta directa" },
];
const EDITABLE = ["title", "subtitle", "content", "text", "ctaText", "imageUrl", "code", "href", "variant"];

// Visualizador no-code: lienzo neutro (chrome="neutral", sin clases gs-*),
// paleta de los 9 contenedores con placeholders, drag & drop y edición inline.
export function VisualBuilder() {
  const [pages, setPages] = useState<Page[]>([]);
  const [pageId, setPageId] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAbove, setDropAbove] = useState<string | null>(null);
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
      const b = await apiFetch<Block>(`/pages/${pageId}/blocks`, { method: "POST", body: JSON.stringify({ type, props: placeholderFor(type) }) });
      setBlocks([...blocks, b]); setSel(b.id); say(`Contenedor ${type} agregado. Edítalo en el lienzo.`);
    } catch (e) { fail(e); }
  };

  const applyTemplate = async (template: string) => {
    if (!confirm(`Reemplazar los bloques actuales por la plantilla ${template}?`)) return;
    try {
      const r = await apiFetch<Block[]>(`/pages/${pageId}/apply-template`, { method: "POST", body: JSON.stringify({ template }) });
      setBlocks(r); setSel(null); say(`Plantilla ${template} aplicada.`);
    } catch (e) { fail(e); }
  };

  const dropAt = async (targetId: string) => {
    if (!dragId || dragId === targetId) { setDragId(null); setDropAbove(null); return; }
    const ids = blocks.map((b) => b.id).filter((id) => id !== dragId);
    const at = ids.indexOf(targetId);
    ids.splice(at, 0, dragId);
    setDragId(null); setDropAbove(null);
    try {
      const r = await apiFetch<Block[]>(`/pages/${pageId}/reorder`, { method: "POST", body: JSON.stringify({ ids }) });
      setBlocks(r);
    } catch (e) { fail(e); }
  };

  const saveInline = (id: string, props: Record<string, unknown>) => {
    const { id: _drop, ...rest } = props;
    patch(id, { props: rest }).then(() => say("Guardado.")).catch(() => {});
  };

  const toggleVisible = (b: Block) =>
    patch(b.id, { visible: !b.visible }).then(() => setBlocks(blocks.map((x) => x.id === b.id ? { ...x, visible: !x.visible } : x))).catch(() => {});

  const remove = (b: Block) =>
    apiFetch(`/pages/blocks/${b.id}`, { method: "DELETE" })
      .then(() => { setBlocks(blocks.filter((x) => x.id !== b.id)); if (sel === b.id) setSel(null); say("Contenedor eliminado."); })
      .catch((e) => fail(e));

  const publish = async (status: "DRAFT" | "PUBLISHED") => {
    try {
      await apiFetch(`/pages/${pageId}/${status === "PUBLISHED" ? "publish" : "unpublish"}`, { method: "PATCH" });
      loadPages(); say(status === "PUBLISHED" ? "¡Publicado! Visible en tu vitrina." : "Pasó a borrador.");
    } catch (e) { fail(e); }
  };

  const cur = pages.find((p) => p.id === pageId);
  const selBlock = blocks.find((b) => b.id === sel) || null;

  return (
    <div className="flex flex-col gap-4" data-testid="visual-builder">
      {msg && <div role="status" className="p-2.5 rounded-xl bg-secondary/15 text-secondary text-sm font-bold">{msg}</div>}
      {err && <div role="alert" className="p-2.5 rounded-xl bg-error/10 text-error text-sm font-bold">{err}</div>}
      <div className="flex flex-wrap items-center gap-2">
        <select value={pageId} onChange={(e) => setPageId(e.target.value)} className="bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30">
          {pages.map((p) => <option key={p.id} value={p.id}>{p.title} ({p.slug}) · {p.status}</option>)}
        </select>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cur?.status === "PUBLISHED" ? "bg-secondary/15 text-secondary" : "bg-tertiary/15 text-tertiary"}`}>{cur?.status}</span>
        <button onClick={() => publish("PUBLISHED")} className="px-4 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-sm">Publicar</button>
        <button onClick={() => setMobile(!mobile)} className="px-4 py-2 rounded-xl bg-surface-container-high font-bold text-sm">{mobile ? "🖥 Desktop" : "📱 Móvil"}</button>
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-2 flex flex-col gap-2">
          <div className="text-xs font-bold uppercase text-outline">Contenedores</div>
          {BLOCK_META.map((m) => (
            <button key={m.type} onClick={() => addBlock(m.type)} title={m.desc} className="p-2.5 rounded-xl bg-surface-container-high hover:bg-surface-bright text-left">
              <div className="font-bold text-xs">+ {m.name}</div>
              <div className="text-[11px] text-on-surface-variant">{m.desc}</div>
            </button>
          ))}
          <div className="text-xs font-bold uppercase text-outline mt-2">Partir de plantilla</div>
          {TEMPLATES.map((t) => (
            <button key={t.slug} onClick={() => applyTemplate(t.slug)} className="p-2.5 rounded-xl border border-outline-variant/30 text-left">
              <div className="font-bold text-xs">{t.name}</div>
              <div className="text-[11px] text-on-surface-variant">{t.desc}</div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-6">
          <div className={`mx-auto w-full transition-all ${mobile ? "max-w-[390px]" : "max-w-3xl"}`}>
            <div className="vb-canvas p-5 lg:p-8">
              <div className="text-[11px] uppercase tracking-widest font-bold mb-2 text-center" style={{ color: "#9ca3af" }}>Tu sitio — arrastra para reordenar, clic para editar{mobile ? " (móvil)" : ""}</div>
              {blocks.map((b) => (
                <div
                  key={b.id}
                  data-testid={`vb-slot-${b.type}`}
                  draggable
                  onDragStart={() => setDragId(b.id)}
                  onDragOver={(e) => { e.preventDefault(); setDropAbove(b.id); }}
                  onDrop={() => dropAt(b.id)}
                  onClick={() => setSel(b.id)}
                  className={`vb-slot ${sel === b.id ? "vb-selected" : ""} ${dragId === b.id ? "vb-dragging" : ""} ${dropAbove === b.id && dragId ? "vb-drop-above" : ""}`}
                  style={b.visible === false ? { opacity: 0.45 } : undefined}
                >
                  <InlineBlock block={b} products={products} selected={sel === b.id} onSave={(props) => saveInline(b.id, props)} />
                </div>
              ))}
              {blocks.length === 0 && <p className="text-center text-sm py-8" style={{ color: "#9ca3af" }}>Lienzo vacío: agrega un contenedor desde la paleta.</p>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          {!selBlock ? <p className="text-sm text-outline">Selecciona un bloque del lienzo para ver sus propiedades.</p> : (
            <div className="p-4 rounded-2xl gs-glass flex flex-col gap-3 sticky top-20">
              <div className="font-bold text-sm">Contenedor <span className="uppercase text-primary">{selBlock.type}</span></div>
              {EDITABLE.filter((k) => k in selBlock.props || ["title", "content", "imageUrl", "code", "text", "href", "variant"].includes(k)).map((k) => (
                <div key={k}>
                  <label className="text-xs font-bold text-outline">{k === "variant" ? "Estilo del botón" : k}</label>
                  {k === "variant" ? (
                    <select value={String(selBlock.props[k] || "primario")} onChange={(e) => setBlocks(blocks.map((x) => x.id === selBlock.id ? { ...x, props: { ...x.props, [k]: e.target.value } } : x))} className="w-full mt-1 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30">
                      {(["primario", "secundario", "oferta"] as const).map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  ) : k === "code" || k === "content" ? (
                    <textarea value={String(selBlock.props[k] || "")} rows={k === "code" ? 6 : 3} onChange={(e) => setBlocks(blocks.map((x) => x.id === selBlock.id ? { ...x, props: { ...x.props, [k]: e.target.value } } : x))} className="w-full mt-1 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30 font-mono" />
                  ) : (
                    <input value={String(selBlock.props[k] || "")} onChange={(e) => setBlocks(blocks.map((x) => x.id === selBlock.id ? { ...x, props: { ...x.props, [k]: e.target.value } } : x))} placeholder={k === "href" ? "#catalogo o https://…" : ""} className="w-full mt-1 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" />
                  )}
                </div>
              ))}
              <FontPicker value={String(selBlock.props.fontFamily || "")} onPick={(f) => setBlocks(blocks.map((x) => x.id === selBlock.id ? { ...x, props: { ...x.props, fontFamily: f } } : x))} />
              <button onClick={() => saveInline(selBlock.id, selBlock.props)} className="py-2.5 rounded-xl bg-primary-container text-on-primary-container font-bold text-sm">Guardar bloque</button>
              <div className="flex gap-2">
                <button onClick={() => toggleVisible(selBlock)} className="flex-1 py-2 rounded-xl bg-surface-container-high font-bold text-xs">{selBlock.visible === false ? "Mostrar" : "Ocultar"}</button>
                <button onClick={() => remove(selBlock)} className="flex-1 py-2 rounded-xl bg-error/15 text-error font-bold text-xs">Eliminar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Render con edición rápida bajo el bloque seleccionado: inputs que guardan
// al perder foco o con el botón. El resto de props va por el inspector.
function InlineBlock({ block, products, selected, onSave }: { block: Block; products: ShopProduct[]; selected: boolean; onSave: (props: Record<string, unknown>) => void }) {
  const [draft, setDraft] = useState<Record<string, unknown>>(block.props);
  useEffect(() => { setDraft(block.props); }, [block.id, selected]);
  const commit = () => {
    const rest: Record<string, unknown> = { ...block.props, ...draft };
    delete rest.id;
    onSave(rest);
  };
  return (
    <div>
      <BlockRenderer block={{ ...block, props: { ...block.props, ...draft } }} products={products} preview chrome="neutral" />
      {selected && (
        <div className="flex flex-wrap gap-2 mt-1 px-1 pb-1">
          {["title", "subtitle", "content", "text"].filter((k) => k in block.props).map((k) => (
            <input
              key={k}
              value={String(draft[k] ?? "")}
              onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
              onBlur={commit}
              placeholder={k}
              className="text-xs px-2 py-1.5 rounded-lg border"
              style={{ borderColor: "#d1d5db", minWidth: 140, flex: "1 1 140px" }}
            />
          ))}
          <button onClick={commit} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "#111827", color: "#fff" }}>Guardar</button>
        </div>
      )}
    </div>
  );
}
