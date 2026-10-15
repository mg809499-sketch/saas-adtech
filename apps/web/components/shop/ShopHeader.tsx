"use client";
import Link from "next/link";
import { useState } from "react";
import { GrowupLogo } from "../brand/GrowupLogo";
import { useAuth } from "../../lib/auth";
import { lineKey, useCart, cop } from "../../lib/cart";

export function ShopHeader() {
  const { user, logout } = useAuth();
  const { count, lines, total, setQty, remove } = useCart();
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 bg-surface-container/70 backdrop-blur-2xl border-b border-outline-variant/30">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
          <Link href="/" className="gs-press flex items-center gap-2 font-bold tracking-tight" aria-label="GrowUp Store inicio"><GrowupLogo size={34} /> GrowUp Store</Link>
          <nav aria-label="Tienda" className="hidden md:flex gap-5 text-sm text-on-surface-variant">
            <Link href="/tiendas" className="gs-press hover:text-on-surface">Tiendas</Link>
            <Link href="/mis-pedidos" className="gs-press hover:text-on-surface">Mis pedidos</Link>
            <Link href="/planes" className="gs-press hover:text-on-surface">Planes</Link>
            <Link href="/consola/dashboard-central" className="gs-press hover:text-on-surface">Consola</Link>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <span className="hidden sm:inline text-xs text-on-surface-variant">{user.email} <button onClick={logout} className="gs-press text-primary font-bold ml-1 hover:underline">Salir</button></span>
            ) : (
              <Link href="/login?next=/tienda" className="gs-press text-xs font-bold text-primary px-2 py-1">Entrar</Link>
            )}
            <button onClick={() => setOpen(true)} aria-haspopup="dialog" className="gs-press relative px-4 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-sm shadow-soft">
              Carrito {count > 0 && <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-primary-container text-on-primary-container text-[11px] font-black flex items-center justify-center tabular">{count}</span>}
            </button>
          </div>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Carrito de compras" className="safe-bottom absolute right-0 top-0 bottom-0 w-full max-w-md bg-surface-container-lowest border-l border-outline-variant/30 p-5 flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="font-bold text-lg font-display">Tu carrito ({count})</h2><button onClick={() => setOpen(false)} aria-label="Cerrar carrito" className="gs-press w-9 h-9 rounded-xl bg-surface-container-high text-outline font-bold">✕</button></div>
            <div className="flex-1 overflow-y-auto mt-4 space-y-3">
              {lines.length === 0 && <p className="text-sm text-on-surface-variant">Vacío. <Link href="/tienda" onClick={() => setOpen(false)} className="text-primary font-bold">Ir a la tienda →</Link></p>}
              {lines.map((l) => (
                <div key={lineKey(l)} className="p-3 rounded-2xl bg-surface-container-low flex items-center justify-between gap-2">
                  <div><div className="font-bold text-sm">{l.product.name}{l.variantLabel && <span className="block text-xs font-normal text-secondary">{l.variantLabel}</span>}</div><div className="text-xs text-outline">{cop(l.unitPrice ?? l.product.price)} c/u</div></div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQty(lineKey(l), l.qty - 1)} aria-label={`Quitar uno de ${l.product.name}`} className="gs-press w-7 h-7 rounded-lg bg-surface-container-high font-bold">−</button>
                    <span className="text-sm font-bold w-5 text-center tabular">{l.qty}</span>
                    <button onClick={() => setQty(lineKey(l), l.qty + 1)} aria-label={`Agregar uno de ${l.product.name}`} className="gs-press w-7 h-7 rounded-lg bg-surface-container-high font-bold">+</button>
                    <button onClick={() => remove(lineKey(l))} className="gs-press text-error text-xs ml-1 hover:underline">Quitar</button>
                  </div>
                </div>
              ))}
            </div>
            {lines.length > 0 && (
              <div className="pt-4 border-t border-outline-variant/20">
                <div className="flex justify-between font-black text-lg tabular"><span>Total</span><span>{cop(total)}</span></div>
                <Link href="/checkout" onClick={() => setOpen(false)} className="gs-press block text-center mt-3 py-3 rounded-2xl bg-secondary text-on-secondary font-bold">Ir al checkout →</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
