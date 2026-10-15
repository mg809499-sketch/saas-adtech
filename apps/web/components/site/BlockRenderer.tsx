"use client";
import Link from "next/link";
import { useFont } from "../../lib/fonts";
import { cop } from "../../lib/cart";
import type { ShopProduct } from "../../lib/api-client";

export interface Block { id: string; type: string; props: Record<string, unknown>; visible?: boolean }
export type BlockChrome = "store" | "neutral";
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const num = (v: unknown, d = 0) => (typeof v === "number" ? v : d);

// Render de bloques: mismo componente en preview del editor y vitrina real.
// chrome="store" (default): tema GrowUp de la vitrina. chrome="neutral": lienzo
// blanco del visualizador, sin ninguna clase gs-* (aislamiento de estilos).
export function BlockRenderer({ block, products = [], preview = false, basePath = "", chrome = "store" }: {
  block: Block; products?: ShopProduct[]; preview?: boolean; basePath?: string; chrome?: BlockChrome;
}) {
  const p = block.props;
  const ff = useFont(str(p.fontFamily));
  const font = ff ? { fontFamily: ff } : undefined;
  const n = chrome === "neutral";
  // Estilos neutros inline: nada depende del tema global.
  const vbBtn = { display: "inline-block", marginTop: 16, padding: "12px 24px", borderRadius: 12, background: "#111827", color: "#fff", fontWeight: 700, fontSize: 14 } as const;
  const vbCard = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 } as const;
  const vbMuted = { color: "#6b7280" } as const;
  const vbTitle = { color: "#111827" } as const;

  switch (block.type) {
    case "hero":
      return (
        <div className="text-center py-10" style={n ? { background: "#fff", color: "#111827", ...font } : font}>
          <h2 className="text-3xl lg:text-5xl font-extrabold" style={n ? { ...vbTitle, ...font, fontSize: str(p.titleSize) || undefined } : { color: str(p.titleColor) || undefined, fontSize: str(p.titleSize) || undefined, ...font }}>{str(p.title, "Título")}</h2>
          {str(p.subtitle) && <p className="mt-2" style={n ? vbMuted : undefined}>{str(p.subtitle)}</p>}
          {str(p.imageUrl) && <img src={str(p.imageUrl)} alt="" className="mx-auto mt-4 max-h-72 rounded-2xl object-cover" />}
          {str(p.ctaText) && (preview || n
            ? <span style={n ? vbBtn : undefined} className={n ? "" : "inline-block mt-4 px-6 py-3 rounded-2xl bg-primary-container text-on-primary-container font-bold text-sm"}>{str(p.ctaText)}</span>
            : <Link href={str(p.ctaHref, "#")} className="inline-block mt-4 px-6 py-3 rounded-2xl bg-primary-container text-on-primary-container font-bold text-sm">{str(p.ctaText)}</Link>)}
        </div>
      );
    case "texto":
      return <p className={`${str(p.align) === "center" ? "text-center" : str(p.align) === "right" ? "text-right" : "text-left"} py-3`} style={n ? { ...vbTitle, ...font, fontSize: str(p.fontSize) || undefined } : { ...font, color: str(p.color) || undefined, fontSize: str(p.fontSize) || undefined }}>{str(p.content)}</p>;
    case "imagen":
      return (
        <div className="py-3 text-center" style={n ? { background: "#fff" } : undefined}>
          {preview || n || !str(p.href) ? <img src={str(p.imageUrl)} alt={str(p.alt)} className="mx-auto rounded-2xl max-h-96 object-cover" style={{ borderRadius: str(p.radius) || undefined }} />
            : <Link href={str(p.href)}><img src={str(p.imageUrl)} alt={str(p.alt)} className="mx-auto rounded-2xl max-h-96 object-cover" /></Link>}
        </div>
      );
    case "productos": {
      const list = products.filter((x) => !str(p.category) || x.category === str(p.category)).slice(0, num(p.limit, 6));
      return (
        <div id="catalogo" className="py-4 scroll-mt-24" style={n ? { background: "#fff", color: "#111827", ...font } : font}>
          {str(p.title) && <h3 className="font-bold text-xl mb-3" style={n ? vbTitle : undefined}>{str(p.title)}</h3>}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {list.map((x) => (
              <div key={x.id} style={n ? vbCard : undefined} className={n ? "" : "gs-glass rounded-2xl p-4"}>
                <div className="font-bold text-sm" style={n ? vbTitle : undefined}>{x.name}</div>
                <div className="font-black mt-1" style={n ? vbTitle : undefined}>{cop(x.price)}</div>
                {x.compareAtPrice != null && x.compareAtPrice > x.price && (
                  <div className="text-xs line-through opacity-60">{cop(x.compareAtPrice)}</div>
                )}
                {!preview && !n && <Link href={`${basePath}/p/${x.slug}`} className="text-xs font-bold text-primary">Ver →</Link>}
              </div>
            ))}
          </div>
          {list.length === 0 && <p className="text-xs mt-2" style={n ? vbMuted : undefined}>Sin productos todavía: agrega el primero en tu catálogo o cambia la categoría.</p>}
        </div>
      );
    }
    case "coleccion":
      return <div className="py-3" style={n ? { background: "#fff", color: "#111827", ...font } : font}><h3 className="font-bold mb-2" style={n ? vbTitle : undefined}>{str(p.title, "Colección")}</h3><div className="flex gap-2 flex-wrap">{[...Array.from(new Set(products.map((x) => x.category)))].map((c) => <span key={c} style={n ? { ...vbCard, padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 } : undefined} className={n ? "" : "px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold"}>{c}</span>)}</div></div>;
    case "testimonios": {
      const items = Array.isArray(p.items) ? p.items as { name?: string; text?: string }[] : [];
      return (
        <div className="py-4" style={n ? { background: "#fff", color: "#111827", ...font } : font}><h3 className="font-bold text-xl mb-3" style={n ? vbTitle : undefined}>{str(p.title, "Opiniones")}</h3>
          <div className="grid sm:grid-cols-2 gap-3">{items.map((t, i) => <div key={i} style={n ? vbCard : undefined} className={n ? "" : "gs-glass rounded-2xl p-4"}><p className="text-sm" style={n ? vbTitle : undefined}>“{str(t.text)}”</p><div className="text-xs font-bold mt-2" style={n ? vbMuted : undefined}>— {str(t.name)}</div></div>)}</div>
        </div>
      );
    }
    case "faq": {
      const items = Array.isArray(p.items) ? p.items as { q?: string; a?: string }[] : [];
      return (
        <div className="py-4" style={n ? { background: "#fff", color: "#111827", ...font } : font}><h3 className="font-bold text-xl mb-3" style={n ? vbTitle : undefined}>{str(p.title, "Preguntas")}</h3>
          {items.map((f, i) => <details key={i} style={n ? { ...vbCard, borderRadius: 10, padding: "10px 16px", marginBottom: 8 } : undefined} className={n ? "" : "gs-glass rounded-xl px-4 py-2.5 mb-2"}><summary className="font-bold text-sm cursor-pointer" style={n ? vbTitle : undefined}>{str(f.q)}</summary><p className="text-sm mt-1" style={n ? vbMuted : undefined}>{str(f.a)}</p></details>)}
        </div>
      );
    }
    case "boton": {
      const variant = str(p.variant, "primario");
      const align = str(p.align, "center");
      const justify = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
      const href = str(p.href, "#") || "#";
      const label = str(p.text, "Ver más");
      const variantStyle = variant === "oferta"
        ? { background: "#f59e0b", color: "#111827" }
        : variant === "secundario"
          ? { background: "transparent", color: n ? "#111827" : undefined, border: `2px solid ${n ? "#111827" : "currentColor"}` }
          : { background: "#4f46e5", color: "#fff" };
      const body = (
        <span className="inline-block px-8 py-3.5 rounded-2xl font-bold text-sm" style={n ? { ...vbBtn, ...variantStyle, ...font } : { ...variantStyle, ...font }}>{variant === "oferta" ? `🔥 ${label}` : label}</span>
      );
      return (
        <div className="py-3 flex" style={{ justifyContent: justify }}>
          {preview || n ? body : <Link href={href}>{body}</Link>}
        </div>
      );
    }
    case "footer":
      return <footer className="text-center text-xs py-6 border-t mt-4" style={n ? { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" } : font}>{str(p.text, "© Mi tienda")}</footer>;
    case "html":
      // Solo merchants autenticados crean bloques; el contenido se escapa en servidor
      // (sanitizeProps whitelist). En cliente se renderiza tal cual para preview/vitrina.
      return <div className="py-2" dangerouslySetInnerHTML={{ __html: str(p.code) }} />;
    default:
      return preview || n ? <div className="text-xs text-error">Bloque desconocido: {block.type}</div> : null;
  }
}
