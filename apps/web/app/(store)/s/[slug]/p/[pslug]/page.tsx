"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, ShopProduct } from "../../../../../../lib/api-client";
import { useCart, cop } from "../../../../../../lib/cart";
import { variantLabel } from "../../../../../../lib/catalog";

export default function StoreProductPage({ params }: { params: { slug: string; pslug: string } }) {
  const [p, setP] = useState<ShopProduct | null | undefined>(undefined);
  const [qty, setQty] = useState(1);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [img, setImg] = useState(0);
  const { add } = useCart();

  useEffect(() => {
    apiFetch<ShopProduct>(`/products/${params.pslug}`).then(setP).catch(() => setP(null));
  }, [params.pslug]);

  const variants = useMemo(() => p && typeof p === "object" ? (p.variants || []) : [], [p]);
  const colors = useMemo(() => Array.from(new Set(variants.map((v) => v.color).filter(Boolean))) as string[], [variants]);
  const allSizes = useMemo(() => Array.from(new Set(variants.map((v) => v.size).filter(Boolean))) as string[], [variants]);
  const sizes = useMemo(() => Array.from(new Set(variants.filter((v) => !color || v.color === color).map((v) => v.size).filter(Boolean))) as string[], [variants, color]);
  // Exige elegir cada dimensión que exista (color y/o talla).
  const sel = useMemo(() => {
    if (colors.length > 0 && !color) return null;
    if (allSizes.length > 0 && !size) return null;
    if (!color && !size) return null;
    return variants.find((v) => (!color || v.color === color) && (!size || v.size === size)) || null;
  }, [variants, colors, allSizes, color, size]);
  const price = (p && typeof p === "object" ? p.price : 0) + (sel?.priceDelta ?? 0);
  const stock = sel ? sel.stock : (p && typeof p === "object" ? p.stock : 0);
  const gallery = useMemo(() => {
    if (!p || typeof p !== "object") return [];
    return [p.imageUrl, ...(p.images || [])].filter(Boolean) as string[];
  }, [p]);

  if (p === undefined) return <div className="p-8 text-sm text-on-surface-variant">Cargando…</div>;
  if (p === null) return <div className="p-8 text-sm">Producto no encontrado. <Link href="../" className="text-primary font-bold">Volver →</Link></div>;
  return (
    <div className="max-w-3xl mx-auto p-5 lg:p-8 flex flex-col gap-4">
      <Link href="../" className="text-sm text-primary font-bold">← {`Volver`}</Link>
      <div className="text-xs uppercase text-outline font-bold">{p.category} · {p.sku}</div>
      <h1 className="text-3xl font-extrabold">{p.name}</h1>
      {gallery.length > 0 && (
        <div className="flex flex-col gap-2">
          <img src={gallery[Math.min(img, gallery.length - 1)]} alt={p.name} className="w-full max-h-96 rounded-3xl object-cover" />
          {gallery.length > 1 && (
            <div className="flex gap-2">{gallery.map((u, i) => (
              <button key={i} onClick={() => setImg(i)} className={`w-16 h-16 rounded-xl overflow-hidden border-2 ${i === img ? "border-primary" : "border-transparent"}`}><img src={u} alt="" className="w-full h-full object-cover" /></button>
            ))}</div>
          )}
        </div>
      )}
      <p className="text-on-surface-variant">{p.description || "Producto original con garantía."}</p>
      <div className="text-4xl font-black">{cop(p.compareAtPrice ?? price)}</div>
      {variants.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          {colors.length > 0 && (
            <label className="text-xs font-bold">Color
              <select value={color} onChange={(e) => { setColor(e.target.value); setSize(""); setQty(1); }} className="w-full mt-1 bg-surface px-3 py-2.5 rounded-xl text-sm border border-outline-variant/30">
                <option value="">Elige color…</option>{colors.map((c) => <option key={c} value={c!}>{c}</option>)}
              </select></label>
          )}
          {sizes.length > 0 && (
            <label className="text-xs font-bold">Talla
              <select value={size} onChange={(e) => { setSize(e.target.value); setQty(1); }} className="w-full mt-1 bg-surface px-3 py-2.5 rounded-xl text-sm border border-outline-variant/30">
                <option value="">Elige talla…</option>{sizes.map((s) => <option key={s} value={s!}>{s}</option>)}
              </select></label>
          )}
        </div>
      )}
      <div className="text-sm font-bold text-secondary">{stock} disponibles{sel ? ` · ${variantLabel(sel)}` : ""}</div>
      <div className="flex items-center gap-3">
        <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 rounded-xl bg-surface-container-high font-bold">−</button>
        <span className="font-black text-xl w-8 text-center">{qty}</span>
        <button onClick={() => setQty(Math.min(Math.max(stock, 1), qty + 1))} className="w-10 h-10 rounded-xl bg-surface-container-high font-bold">+</button>
        <button
          disabled={variants.length > 0 && !sel}
          onClick={() => add(p, qty, sel)}
          className="px-6 py-3 rounded-2xl bg-primary-container text-on-primary-container font-bold disabled:opacity-40">
          Agregar al carrito</button>
      </div>
      {variants.length > 0 && !sel && <p className="text-xs text-outline">Elige color y talla para agregar.</p>}
      <Link href="/checkout" className="text-sm text-primary font-bold">Ir al checkout → (usa esta tienda)</Link>
    </div>
  );
}
