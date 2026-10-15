"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ShopProduct } from "../../../../lib/api-client";
import { useCart, cop } from "../../../../lib/cart";
import { useStore } from "../../../../lib/store";
import { Reveal, TiltZone } from "../../../../components/ui/motion";
import { Block, BlockRenderer } from "../../../../components/site/BlockRenderer";

export default function StoreHomePage({ params }: { params: { slug: string } }) {
  const { store } = useStore();
  const [items, setItems] = useState<ShopProduct[]>([]);
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [q, setQ] = useState("");
  const { add } = useCart();

  // Espera al StoreProvider: sin tenant resuelto el GET /products caería al
  // demo-tenant por defecto y mostraría datos ajenos.
  useEffect(() => {
    if (!store?.id) return;
    apiFetch<ShopProduct[]>(`/products${q ? `?search=${encodeURIComponent(q)}` : ""}`, {
      headers: { "x-tenant-id": store.id },
    })
      .then(setItems).catch(() => setItems([]));
  }, [q, store?.id]);

  useEffect(() => {
    apiFetch<{ blocks: Block[] }>(`/storefront/${params.slug}/pages/home`)
      .then((r) => setBlocks(r.blocks || [])).catch(() => setBlocks([]));
  }, [params.slug]);

  useEffect(() => {
    if (store?.seo?.title) document.title = store.seo.title;
  }, [store]);

  const theme = store?.theme || {};
  const primary = theme.primary || "#8083ff";

  return (
    <div className="max-w-7xl mx-auto p-5 lg:p-8 flex flex-col gap-6">
      {theme.announcement && (
        <div className="text-center text-sm font-bold px-4 py-2 rounded-2xl" style={{ background: `${primary}33`, border: `1px solid ${primary}55` }}>{theme.announcement}</div>
      )}
      {blocks !== null && blocks.length > 0 ? (
        <div className="flex flex-col">
          {blocks.map((b) => <BlockRenderer key={b.id} block={b} products={items} basePath={`/s/${params.slug}`} />)}
        </div>
      ) : (
      <>
      <div className="text-center py-6">
        {store?.logoUrl && <img src={store.logoUrl} alt={store.storeName || store.name || ""} className="mx-auto h-16 w-16 rounded-2xl object-cover mb-3" />}
        <h1 className="text-3xl lg:text-5xl font-extrabold" style={{ color: theme.heroTitle ? primary : undefined }}>{theme.heroTitle || store?.storeName || store?.name}</h1>
        <p className="text-on-surface-variant mt-2">{theme.heroSubtitle || "Compra directa · pago Bold · envío a toda Colombia"}</p>
        {theme.bannerUrl && <img src={theme.bannerUrl} alt="" className="mx-auto mt-4 max-h-72 rounded-2xl object-cover" />}
        {store?.seo?.description && <p className="text-xs text-outline mt-1 max-w-2xl mx-auto">{store.seo.description}</p>}
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en esta tienda..." className="max-w-md mx-auto w-full bg-surface-container px-4 py-2.5 rounded-2xl text-sm border border-outline-variant/30" />
      <TiltZone className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((p, i) => (
          <Reveal key={p.id} delay={Math.min(i, 6) * 60}>
            <div className="gs-tilt gs-card gs-glass rounded-3xl p-5 flex flex-col h-full">
              {(p.imageUrl || (p.images || [])[0]) && <Link href={`/s/${params.slug}/p/${p.slug}`}><img src={p.imageUrl || (p.images || [])[0]!} alt={p.name} className="w-full h-40 rounded-2xl object-cover mb-3" /></Link>}
              <div className="text-xs uppercase text-outline font-bold">{p.category}</div>
              <Link href={`/s/${params.slug}/p/${p.slug}`} className="font-bold text-lg mt-1 hover:text-primary">{p.name}</Link>
              <div className="mt-2 text-2xl font-black">{cop(p.compareAtPrice ?? p.price)}</div>
              <div className="text-xs font-bold mt-1 text-secondary">{p.stock} disponibles</div>
              <div className="flex gap-2 mt-4">
                <Link href={`/s/${params.slug}/p/${p.slug}`} className="flex-1 text-center py-2.5 rounded-xl bg-surface-container-high font-bold text-sm">Ver</Link>
                <button onClick={() => add(p)} className="flex-1 py-2.5 rounded-xl bg-primary-container text-on-primary-container font-bold text-sm">Agregar</button>
              </div>
            </div>
          </Reveal>
        ))}
      </TiltZone>
      {items.length === 0 && blocks !== null && blocks.length === 0 && (
        <div className="gs-glass rounded-3xl p-8 text-center flex flex-col items-center gap-2 max-w-md mx-auto">
          <span className="material-symbols-outlined text-outline text-[32px]" aria-hidden>storefront</span>
          <p className="font-bold">Esta tienda aún no publica productos</p>
          <p className="text-sm text-on-surface-variant">Vuelve pronto o descubre otras tiendas de la red.</p>
          <Link href="/tiendas" className="gs-press mt-2 px-5 py-2.5 rounded-xl bg-secondary text-on-secondary font-bold text-sm">Ver tiendas</Link>
        </div>
      )}
      </>
      )}
    </div>
  );
}
