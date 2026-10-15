"use client";
import { AuthProvider } from "../../../../lib/auth";import { CartProvider } from "../../../../lib/cart";
import { ShopHeader } from "../../../../components/shop/ShopHeader";
import { StoreProvider, useStore } from "../../../../lib/store";
import Link from "next/link";

function StoreShell({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <StoreProvider slug={slug}>
      <StoreInner slug={slug}>{children}</StoreInner>
    </StoreProvider>
  );
}

function StoreInner({ slug, children }: { slug: string; children: React.ReactNode }) {
  const { store, ready, error } = useStore();
  if (error) {
    return (
      <div className="max-w-lg mx-auto p-10 text-center flex flex-col gap-3">
        <h1 className="text-2xl font-extrabold">Tienda no disponible</h1>
        <p className="text-sm text-on-surface-variant">{error}</p>
        <Link href="/tiendas" className="text-primary font-bold text-sm">Ver directorio →</Link>
      </div>
    );
  }
  if (!ready) return <div className="p-10 text-center text-sm text-on-surface-variant">Cargando tienda…</div>;
  return (
    <CartProvider key={store!.id}>
      <ShopHeader />
      <div className="border-b border-outline-variant/20 bg-surface-container-low/60">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-2 text-sm">
          <Link href="/tiendas" className="text-outline hover:text-on-surface">← Directorio</Link>
          {store!.logoUrl && <img src={store!.logoUrl} alt="" className="w-6 h-6 rounded-lg object-cover" />}
          <span className="font-bold">{store!.storeName || store!.name}</span>
          <span className="text-xs text-outline font-mono">{slug}.growupstore.app</span>
        </div>
      </div>
      {children}
    </CartProvider>
  );
}

export default function StoreLayout({ children, params }: { children: React.ReactNode; params: { slug: string } }) {
  return (
    <AuthProvider>
      <div className="min-h-screen text-on-surface">
        <StoreShell slug={params.slug}>{children}</StoreShell>
      </div>
    </AuthProvider>
  );
}
