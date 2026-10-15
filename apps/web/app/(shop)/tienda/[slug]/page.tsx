"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ShopProduct } from "../../../../lib/api-client";
import { useCart, cop } from "../../../../lib/cart";

export default function ProductoPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [p, setP] = useState<ShopProduct | null>(null);
  const [qty, setQty] = useState(1); const [added, setAdded] = useState(false);
  const { add } = useCart();

  useEffect(() => {
    apiFetch<ShopProduct>(`/products/${slug}`).then(setP).catch(() => setP(null));
  }, [slug]);

  if (p === null) return <div className="max-w-3xl mx-auto p-8 text-sm text-on-surface-variant">Cargando producto…</div>;
  return (
    <div className="max-w-3xl mx-auto p-5 lg:p-8 flex flex-col gap-4">
      <Link href="/tienda" className="text-sm text-primary font-bold">← Volver a la tienda</Link>
      <div className="text-xs uppercase text-outline font-bold">{p.category} · {p.sku}</div>
      <h1 className="text-3xl font-extrabold">{p.name}</h1>
      <p className="text-on-surface-variant">{p.description || "Producto original GrowUp Store con garantía."}</p>
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-black">{cop(p.compareAtPrice ?? p.price)}</span>
        {p.compareAtPrice && <span className="text-outline line-through">{cop(p.price)}</span>}
      </div>
      <div className={`text-sm font-bold ${p.stock < 10 ? "text-error" : "text-secondary"}`}>{p.stock} unidades disponibles</div>
      <div className="flex items-center gap-3">
        <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 rounded-xl bg-surface-container-high font-bold">−</button>
        <span className="font-black text-xl w-8 text-center">{qty}</span>
        <button onClick={() => setQty(Math.min(p.stock, qty + 1))} className="w-10 h-10 rounded-xl bg-surface-container-high font-bold">+</button>
        <button disabled={p.stock === 0} onClick={() => { add(p, qty); setAdded(true); setTimeout(() => setAdded(false), 2500); }} className="px-6 py-3 rounded-2xl bg-primary-container text-on-primary-container font-bold disabled:opacity-40">
          {added ? "¡Agregado ✓" : "Agregar al carrito"}
        </button>
      </div>
    </div>
  );
}
