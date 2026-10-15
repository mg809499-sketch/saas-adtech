"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ProductVariant, ShopProduct } from "./api-client";

export interface CartLine { product: ShopProduct; qty: number; variantId?: string | null; variantLabel?: string | null; unitPrice?: number }
interface CartCtx {
  lines: CartLine[]; count: number; total: number;
  add: (p: ShopProduct, qty?: number, variant?: ProductVariant | null) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}
const Ctx = createContext<CartCtx>({ lines: [], count: 0, total: 0, add: () => {}, setQty: () => {}, remove: () => {}, clear: () => {} });
export const useCart = () => useContext(Ctx);
const KEY = "gs_cart";
function keyFor(): string {
  if (typeof window === "undefined") return KEY;
  const store = localStorage.getItem("gs_store");
  return store ? `${KEY}:${store}` : KEY;
}
export const lineKey = (l: { product: ShopProduct; variantId?: string | null }) =>
  l.variantId ? `${l.product.id}#${l.variantId}` : l.product.id;
const linePrice = (l: CartLine) => l.unitPrice ?? l.product.price;
const lineStock = (l: CartLine) => {
  if (l.variantId) {
    const v = (l.product.variants || []).find((x) => x.id === l.variantId);
    return v ? v.stock : l.product.stock;
  }
  return l.product.stock;
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(keyFor()) || "[]") as CartLine[];
      // Compat: carritos viejos sin variante/precio.
      setLines(raw.map((l) => ({ ...l, unitPrice: l.unitPrice ?? l.product.price })));
    } catch { /* vacío */ }
  }, []);
  useEffect(() => { localStorage.setItem(keyFor(), JSON.stringify(lines)); }, [lines]);

  const add = useCallback((product: ShopProduct, qty = 1, variant: ProductVariant | null = null) => {
    const vid = variant?.id || null;
    const label = variant ? [variant.color, variant.size].filter(Boolean).join(" / ") : null;
    const price = product.price + (variant?.priceDelta ?? 0);
    const stock = variant ? variant.stock : product.stock;
    setLines((ls) => {
      const i = ls.findIndex((l) => l.product.id === product.id && (l.variantId || null) === vid);
      if (i >= 0) { const c = [...ls]; c[i] = { ...c[i], qty: Math.min(c[i].qty + qty, Math.max(stock, c[i].qty)), unitPrice: price }; return c; }
      return [...ls, { product, qty: Math.min(qty, stock), variantId: vid, variantLabel: label, unitPrice: price }];
    });
  }, []);
  const setQty = useCallback((key: string, qty: number) => {
    setLines((ls) => qty <= 0
      ? ls.filter((l) => lineKey(l) !== key)
      : ls.map((l) => lineKey(l) === key ? { ...l, qty: Math.min(qty, Math.max(lineStock(l), l.qty)) } : l));
  }, []);
  const remove = useCallback((key: string) => setLines((ls) => ls.filter((l) => lineKey(l) !== key)), []);
  const clear = useCallback(() => setLines([]), []);

  const { count, total } = useMemo(() => ({
    count: lines.reduce((a, l) => a + l.qty, 0),
    // Se cobra price (+delta de variante). compareAtPrice es solo tachado visual.
    total: lines.reduce((a, l) => a + linePrice(l) * l.qty, 0),
  }), [lines]);

  return <Ctx.Provider value={{ lines, count, total, add, setQty, remove, clear }}>{children}</Ctx.Provider>;
}
export const cop = (n: number) => `$${n.toLocaleString("es-CO")} COP`;
