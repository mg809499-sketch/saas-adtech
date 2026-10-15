"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, getToken, ProductVariant, ShopProduct } from "../../../../lib/api-client";
import { getPlanStatus } from "../../../../lib/billing";
import {
  Category, GUIDE_PRESETS, SizeGuide, createCategory, createSizeGuide, createVariant,
  deleteCategory, deleteSizeGuide, deleteVariant, guideSizes, listCategories,
  listSizeGuides, renameCategory, updateVariant, variantLabel,
} from "../../../../lib/catalog";
import { ProgressBar, Reveal } from "../../../../components/ui/motion";

const EMPTY = { name: "", sku: "", price: "", compareAtPrice: "", stock: "10", category: "General", categoryId: "", description: "", imageUrl: "", images: [] as string[] };

const flatCats = (cats: Category[]): { id: string; label: string }[] => {
  const out: { id: string; label: string }[] = [];
  for (const c of cats) {
    out.push({ id: c.id, label: c.name });
    for (const k of c.children || []) out.push({ id: k.id, label: `${c.name} / ${k.name}` });
  }
  return out;
};

export default function CatalogPage() {
  const [items, setItems] = useState<ShopProduct[]>([]);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [cats, setCats] = useState<Category[]>([]);
  const [guides, setGuides] = useState<SizeGuide[]>([]);
  const [usage, setUsage] = useState("");
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [newImg, setNewImg] = useState("");
  const [editing, setEditing] = useState<ShopProduct | null>(null);
  const [editForm, setEditForm] = useState({ name: "", price: "", compareAtPrice: "", stock: "", category: "General", categoryId: "", description: "", imageUrl: "", images: [] as string[] });
  const [editImg, setEditImg] = useState("");
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [vForm, setVForm] = useState({ color: "", size: "", sku: "", priceDelta: "", stock: "" });
  const [showCats, setShowCats] = useState(false);
  const [catName, setCatName] = useState("");
  const [catParent, setCatParent] = useState("");
  const [showGuides, setShowGuides] = useState(false);
  const [deleting, setDeleting] = useState<ShopProduct | null>(null);
  const [busy, setBusy] = useState(false);
  const authed = typeof window !== "undefined" && !!getToken();

  const load = useCallback(() => {
    apiFetch<ShopProduct[]>(`/products${q ? `?search=${encodeURIComponent(q)}` : ""}`)
      .then(setItems).catch((e) => setError(e.message));
    getPlanStatus().then((s) => setUsage(`${s.usage.products} productos`)).catch(() => {});
    listCategories().then(setCats).catch(() => {});
    listSizeGuides().then(setGuides).catch(() => {});
  }, [q]);
  useEffect(() => { const t = setTimeout(load, q ? 400 : 0); return () => clearTimeout(t); }, [load, q]);

  const options = useMemo(() => flatCats(cats), [cats]);
  const guideSizeOpts = useMemo(() => Array.from(new Set(guides.flatMap(guideSizes))), [guides]);
  const shown = useMemo(() => {
    if (!catFilter) return items;
    return items.filter((p) => p.categoryId === catFilter || p.category === catFilter);
  }, [items, catFilter]);

  const pickCat = (id: string, set: (v: { category: string; categoryId: string }) => void) => {
    const found = options.find((o) => o.id === id);
    if (found) set({ category: found.label.replace(/.*\/ /, ""), categoryId: found.id });
    else set({ category: "General", categoryId: "" });
  };

  const create = async () => {
    setError(""); setBusy(true);
    try {
      await apiFetch("/products", {
        method: "POST",
        body: JSON.stringify({
          name: form.name, sku: form.sku,
          price: Number(form.price), compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
          stock: Number(form.stock), category: form.category || "General",
          categoryId: form.categoryId || undefined,
          description: form.description || undefined,
          imageUrl: form.imageUrl || undefined,
          images: form.images.length ? form.images : undefined,
        }),
      });
      setShowNew(false); setForm(EMPTY); setNewImg(""); load();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo crear"); }
    finally { setBusy(false); }
  };

  const bump = async (p: ShopProduct, d: number) => {
    try {
      const r = await apiFetch<ShopProduct>(`/products/${p.id}`, { method: "PATCH", body: JSON.stringify({ stock: Math.max(0, p.stock + d) }) });
      setItems((ls) => ls.map((x) => x.id === p.id ? r : x));
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
  };

  const openEdit = (p: ShopProduct) => {
    setEditing(p);
    setEditForm({
      name: p.name, price: String(p.price), compareAtPrice: p.compareAtPrice != null ? String(p.compareAtPrice) : "",
      stock: String(p.stock), category: p.category, categoryId: p.categoryId || "",
      description: p.description || "", imageUrl: p.imageUrl || "", images: [...(p.images || [])],
    });
    setVariants([...(p.variants || [])]);
    setVForm({ color: "", size: "", sku: "", priceDelta: "", stock: "" });
    setEditImg(""); setError("");
  };

  const saveEdit = async () => {
    if (!editing) return;
    setError(""); setBusy(true);
    try {
      const r = await apiFetch<ShopProduct>(`/products/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name, price: Number(editForm.price),
          compareAtPrice: editForm.compareAtPrice ? Number(editForm.compareAtPrice) : null,
          stock: Number(editForm.stock), category: editForm.category,
          categoryId: editForm.categoryId || null,
          description: editForm.description || null,
          imageUrl: editForm.imageUrl || null,
          images: editForm.images,
        }),
      });
      setItems((ls) => ls.map((x) => x.id === editing.id ? { ...r, variants } : x));
      setEditing(null);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar"); }
    finally { setBusy(false); }
  };

  const addVariant = async () => {
    if (!editing) return;
    setError("");
    try {
      const v = await createVariant(editing.id, {
        color: vForm.color || undefined, size: vForm.size || undefined, sku: vForm.sku || undefined,
        priceDelta: vForm.priceDelta ? Number(vForm.priceDelta) : 0, stock: vForm.stock ? Number(vForm.stock) : 0,
      });
      setVariants((ls) => [...ls, v]);
      setVForm({ color: "", size: "", sku: "", priceDelta: "", stock: "" });
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo crear la variante"); }
  };

  const saveVariantStock = async (v: ProductVariant, stock: string) => {
    try {
      const r = await updateVariant(v.id, { stock: Math.max(0, Number(stock) || 0) });
      setVariants((ls) => ls.map((x) => x.id === v.id ? r : x));
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
  };

  const removeVariant = async (v: ProductVariant) => {
    try {
      await deleteVariant(v.id);
      setVariants((ls) => ls.filter((x) => x.id !== v.id));
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo eliminar"); }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setError(""); setBusy(true);
    try {
      await apiFetch(`/products/${deleting.id}`, { method: "DELETE" });
      setItems((ls) => ls.filter((x) => x.id !== deleting.id));
      setDeleting(null); load();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo eliminar"); }
    finally { setBusy(false); }
  };

  const addCategory = async () => {
    if (!catName.trim()) return;
    setError("");
    try {
      await createCategory(catName.trim(), catParent || undefined);
      setCatName(""); setCatParent("");
      const c = await listCategories(); setCats(c);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo crear"); }
  };

  const field = "w-full bg-surface px-4 py-2.5 rounded-2xl text-sm border border-outline-variant/30";
  const gallery = (imgs: string[], cover: string, onCover: (v: string) => void, onImgs: (v: string[]) => void, draft: string, setDraft: (v: string) => void) => (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold">Portada (URL)<input value={cover} onChange={(e) => onCover(e.target.value)} placeholder="https://…" className={`${field} mt-1 font-mono`} /></label>
      {cover && <img src={cover} alt="" className="w-full h-32 rounded-2xl object-cover" />}
      <label className="text-xs font-bold">Galería ({imgs.length}/8)</label>
      <div className="grid grid-cols-4 gap-2">
        {imgs.map((u, i) => (
          <div key={i} className="relative"><img src={u} alt="" className="w-full h-16 rounded-xl object-cover" />
            <button onClick={() => onImgs(imgs.filter((_, j) => j !== i))} className="absolute top-0 right-0 bg-black/60 text-white text-xs px-1.5 rounded-bl-lg">✕</button></div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="https://… agregar a galería" className={`${field} font-mono`} />
        <button onClick={() => { if (draft.trim() && imgs.length < 8) { onImgs([...imgs, draft.trim()]); setDraft(""); } }} className="px-3 py-2 rounded-xl bg-surface-container-high font-bold text-sm">+</button>
      </div>
    </div>
  );

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col xl:flex-row justify-between gap-4">
        <div><h1 className="font-display text-3xl font-extrabold tracking-tight">Catálogo & Inventario</h1><p className="text-sm text-on-surface-variant">Tu tienda · {usage} · los datos viven en el servidor por tenant.</p></div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowCats(!showCats)} className="gs-press px-5 py-2 rounded-2xl bg-surface-container-high font-bold text-sm">Categorías</button>
          <button onClick={() => setShowGuides(!showGuides)} className="gs-press px-5 py-2 rounded-2xl bg-surface-container-high font-bold text-sm">Guías de tallas</button>
          <button onClick={() => setShowNew(true)} className="gs-press px-5 py-2 rounded-2xl bg-brand-600 text-white font-bold text-sm">+ Crear producto</button>
        </div>
      </div>
      {!authed && <p className="text-sm text-error font-bold">Sesión expirada: vuelve a entrar desde /login.</p>}
      {error && <div role="alert" className="p-3 rounded-xl bg-error/10 text-error text-sm font-bold">{error}</div>}

      {showCats && (
        <div className="p-5 rounded-3xl gs-glass flex flex-col gap-3">
          <h3 className="font-bold">Categorías y subcategorías</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Ej. Ropa, Zapatillas, Ropa mujer…" className={`${field} flex-1`} />
            <select value={catParent} onChange={(e) => setCatParent(e.target.value)} className="bg-surface px-3 py-2.5 rounded-2xl text-sm border border-outline-variant/30">
              <option value="">Nivel raíz (categoría)</option>
              {cats.map((c) => <option key={c.id} value={c.id}>Sub de {c.name}</option>)}
            </select>
            <button onClick={addCategory} className="px-4 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-sm">Crear</button>
          </div>
          <div className="flex flex-col gap-1">
            {cats.map((c) => (
              <div key={c.id}>
                <CatRow c={c} onError={(m) => setError(m)} onRename={async (n) => { await renameCategory(c.id, n); setCats(await listCategories()); }} onDelete={async () => { await deleteCategory(c.id).catch((e) => setError(e.message)); setCats(await listCategories()); }} />
                {(c.children || []).map((k) => (
                  <div key={k.id} className="ml-6"><CatRow c={k} sub onError={(m) => setError(m)} onRename={async (n) => { await renameCategory(k.id, n); setCats(await listCategories()); }} onDelete={async () => { await deleteCategory(k.id).catch((e) => setError(e.message)); setCats(await listCategories()); }} /></div>
                ))}
              </div>
            ))}
            {cats.length === 0 && <p className="text-xs text-outline">Sin categorías: crea Ropa, Zapatillas, Accesorios… y sus subcategorías (mujer, hombre, niño).</p>}
          </div>
        </div>
      )}

      {showGuides && (
        <div className="p-5 rounded-3xl gs-glass flex flex-col gap-3">
          <h3 className="font-bold">Guías de tallas (ropa / calzado)</h3>
          <div className="flex flex-wrap gap-2">
            {GUIDE_PRESETS.map((g) => (
              <button key={g.name} onClick={async () => { try { await createSizeGuide({ name: g.name, kind: g.kind, table: g.table }); setGuides(await listSizeGuides()); } catch (e) { setError(e instanceof Error ? e.message : "Error"); } }} className="px-3 py-2 rounded-xl bg-surface-container-high text-xs font-bold">+ {g.name} ({g.table.sizes.join(",")})</button>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {guides.map((g) => (
              <div key={g.id} className="flex items-center gap-2 text-sm p-2 rounded-xl bg-surface-container-low">
                <b>{g.name}</b><span className="text-xs text-outline">{g.kind}</span>
                <span className="text-xs font-mono text-outline truncate flex-1">{guideSizes(g).join(", ")}</span>
                <button onClick={async () => { await deleteSizeGuide(g.id); setGuides(await listSizeGuides()); }} className="text-xs font-bold text-error">Eliminar</button>
              </div>
            ))}
            {guides.length === 0 && <p className="text-xs text-outline">Sin guías: agrega las base con un clic.</p>}
          </div>
        </div>
      )}

      <div className="p-4 rounded-2xl gs-glass flex flex-col md:flex-row gap-3 justify-between">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por SKU o nombre..." aria-label="Filtrar productos" className="bg-surface px-3 py-2 rounded-2xl text-sm border border-outline-variant/30" />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="bg-surface px-3 py-2 rounded-2xl text-sm border border-outline-variant/30">
          <option value="">Todas las categorías</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <span className="text-xs text-outline self-center tabular">{shown.length} referencias</span>
      </div>
      <div className="rounded-2xl gs-glass overflow-x-auto"><table className="w-full text-sm min-w-[920px]"><thead><tr className="text-xs uppercase text-outline border-b border-outline-variant/20"><th className="text-left p-3">Producto & SKU</th><th className="text-left">Categoría</th><th className="text-right">Precio</th><th className="text-center">Stock</th><th className="text-center">Vars.</th><th className="text-right pr-4">Acciones</th></tr></thead>
      <tbody>{shown.map((p) => <tr key={p.id} className="border-t border-outline-variant/10 gs-row-hover">
        <td className="p-3 font-bold"><div className="flex items-center gap-2">{(p.imageUrl || (p.images || [])[0]) && <img src={p.imageUrl || (p.images || [])[0]!} alt="" className="w-9 h-9 rounded-lg object-cover" />}<span>{p.name}<span className="block text-xs font-mono text-outline">{p.sku}</span></span></div></td>
        <td>{p.category}</td><td className="text-right font-bold tabular">${(p.compareAtPrice ?? p.price).toLocaleString("es-CO")}</td>
        <td className="text-center"><span className={`px-3 py-1 rounded-full text-xs font-bold ${p.stock < 10 ? "bg-error/15 text-error" : "bg-secondary/15 text-secondary"}`}>{p.stock} unid.</span><div className="mt-1.5 w-24 mx-auto"><ProgressBar pct={Math.min(100, (p.stock / 60) * 100)} color={p.stock < 10 ? "bg-error" : "bg-secondary"} /></div></td>
        <td className="text-center text-xs tabular">{(p.variants || []).length > 0 ? `${p.variants!.length} · Σ${p.variants!.reduce((a, v) => a + v.stock, 0)}` : "—"}</td>
        <td className="text-right pr-4"><div className="inline-flex gap-1 items-center">
        <button onClick={() => bump(p, -1)} aria-label={`Quitar stock a ${p.name}`} className="gs-press w-8 h-8 rounded-lg bg-surface-container-high font-black">−</button>
        <button onClick={() => bump(p, 1)} aria-label={`Agregar stock a ${p.name}`} className="gs-press w-8 h-8 rounded-lg bg-surface-container-high font-black">+</button>
        <button onClick={() => openEdit(p)} className="gs-press h-8 px-3 rounded-lg bg-surface-container-high text-xs font-bold">Editar</button>
        <button onClick={() => setDeleting(p)} className="gs-press h-8 px-3 rounded-lg bg-error/10 text-error text-xs font-bold">Eliminar</button>
      </div></td></tr>)}</tbody></table>
      {shown.length === 0 && <p className="text-sm text-outline p-4">Sin productos. Crea el primero con “+ Crear producto”.</p>}</div>
      <Reveal><p className="text-xs text-outline">Cambios guardados en PostgreSQL por tenant: recarga y todo persiste.</p></Reveal>

      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowNew(false)}>
          <div role="dialog" aria-modal="true" aria-label="Nuevo producto" className="gs-glass-strong rounded-3xl p-6 max-w-lg w-full flex flex-col gap-3 my-8" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg font-display">Nuevo producto</h2>
            {[["name", "Nombre"], ["sku", "SKU"], ["price", "Precio COP"], ["compareAtPrice", "Precio tachado (opcional)"], ["stock", "Stock inicial"]].map(([k, ph]) => (
              <input key={k} value={form[k as keyof typeof form] as string} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={ph} className={field} />
            ))}
            <label className="text-xs font-bold">Descripción<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={`${field} mt-1`} /></label>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-xs font-bold">Categoría (texto)<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={`${field} mt-1`} /></label>
              <label className="text-xs font-bold">Categoría del árbol<select value={form.categoryId} onChange={(e) => pickCat(e.target.value, (v) => setForm({ ...form, ...v }))} className={`${field} mt-1 bg-surface`}><option value="">—</option>{options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
            </div>
            {gallery(form.images, form.imageUrl, (v) => setForm({ ...form, imageUrl: v }), (v) => setForm({ ...form, images: v }), newImg, setNewImg)}
            <div className="flex gap-2 justify-end"><button onClick={() => setShowNew(false)} className="gs-press px-4 py-2 rounded-xl bg-surface-container-high font-bold text-sm">Cancelar</button><button disabled={busy} onClick={create} className="gs-press px-5 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-sm disabled:opacity-50">{busy ? "Guardando…" : "Guardar"}</button></div>
          </div>
        </div>
      )}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => setEditing(null)}>
          <div role="dialog" aria-modal="true" aria-label={`Editar ${editing.name}`} className="gs-glass-strong rounded-3xl p-6 max-w-lg w-full flex flex-col gap-3 my-8" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg font-display">Editar producto</h2>
            <p className="text-xs font-mono text-outline">SKU {editing.sku} (no editable)</p>
            <label className="text-xs font-bold">Nombre<input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={`${field} mt-1`} /></label>
            <label className="text-xs font-bold">Descripción<textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} className={`${field} mt-1`} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-bold">Precio COP<input value={editForm.price} inputMode="numeric" onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} className={`${field} mt-1 tabular`} /></label>
              <label className="text-xs font-bold">Tachado<input value={editForm.compareAtPrice} inputMode="numeric" placeholder="—" onChange={(e) => setEditForm({ ...editForm, compareAtPrice: e.target.value })} className={`${field} mt-1 tabular`} /></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-bold">Stock<input value={editForm.stock} inputMode="numeric" onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} className={`${field} mt-1 tabular`} /></label>
              <label className="text-xs font-bold">Categoría del árbol<select value={editForm.categoryId} onChange={(e) => pickCat(e.target.value, (v) => setEditForm({ ...editForm, ...v }))} className={`${field} mt-1 bg-surface`}><option value="">—</option>{options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
            </div>
            {gallery(editForm.images, editForm.imageUrl, (v) => setEditForm({ ...editForm, imageUrl: v }), (v) => setEditForm({ ...editForm, images: v }), editImg, setEditImg)}
            <div className="border-t border-outline-variant/20 pt-3 flex flex-col gap-2">
              <h3 className="font-bold text-sm">Variaciones (color / talla / stock)</h3>
              {variants.map((v) => (
                <div key={v.id} className="flex items-center gap-2 text-sm p-2 rounded-xl bg-surface-container-low">
                  <b>{variantLabel(v) || "(sin detalle)"}</b>
                  {v.sku && <span className="text-xs font-mono text-outline">{v.sku}</span>}
                  {v.priceDelta !== 0 && <span className="text-xs tabular">{v.priceDelta > 0 ? "+" : ""}{v.priceDelta.toLocaleString("es-CO")}</span>}
                  <label className="ml-auto flex items-center gap-1 text-xs">Stock<input value={String(v.stock)} inputMode="numeric" onChange={(e) => saveVariantStock(v, e.target.value)} className="w-16 bg-surface px-2 py-1 rounded-lg text-xs border border-outline-variant/30 tabular" /></label>
                  <button onClick={() => removeVariant(v)} className="text-xs font-bold text-error">✕</button>
                </div>
              ))}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <input value={vForm.color} onChange={(e) => setVForm({ ...vForm, color: e.target.value })} placeholder="Color" list="var-colors" className={`${field} !px-3 !py-2`} />
                <input value={vForm.size} onChange={(e) => setVForm({ ...vForm, size: e.target.value })} placeholder="Talla" list="var-sizes" className={`${field} !px-3 !py-2`} />
                <input value={vForm.sku} onChange={(e) => setVForm({ ...vForm, sku: e.target.value })} placeholder="SKU" className={`${field} !px-3 !py-2`} />
                <input value={vForm.priceDelta} onChange={(e) => setVForm({ ...vForm, priceDelta: e.target.value })} placeholder="+COP" inputMode="numeric" className={`${field} !px-3 !py-2`} />
                <input value={vForm.stock} onChange={(e) => setVForm({ ...vForm, stock: e.target.value })} placeholder="Stock" inputMode="numeric" className={`${field} !px-3 !py-2`} />
              </div>
              <datalist id="var-colors">{Array.from(new Set(variants.map((v) => v.color).filter(Boolean))).map((c) => <option key={c as string} value={c as string} />)}</datalist>
              <datalist id="var-sizes">{guideSizeOpts.map((s) => <option key={s} value={s} />)}</datalist>
              <div><button onClick={addVariant} className="px-3 py-2 rounded-xl bg-surface-container-high font-bold text-xs">+ Agregar variación</button></div>
            </div>
            <div className="flex gap-2 justify-end"><button onClick={() => setEditing(null)} className="gs-press px-4 py-2 rounded-xl bg-surface-container-high font-bold text-sm">Cancelar</button><button disabled={busy} onClick={saveEdit} className="gs-press px-5 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-sm disabled:opacity-50">{busy ? "Guardando…" : "Guardar cambios"}</button></div>
          </div>
        </div>
      )}
      {deleting && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleting(null)}>
          <div role="alertdialog" aria-modal="true" aria-label="Eliminar producto" className="gs-glass-strong rounded-3xl p-6 max-w-sm w-full flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg font-display">Eliminar “{deleting.name}”</h2>
            <p className="text-sm text-on-surface-variant">Se elimina del catálogo. Si ya tiene órdenes o campañas asociadas, el servidor lo bloquea.</p>
            <div className="flex gap-2 justify-end"><button onClick={() => setDeleting(null)} className="gs-press px-4 py-2 rounded-xl bg-surface-container-high font-bold text-sm">Cancelar</button><button disabled={busy} onClick={confirmDelete} className="gs-press px-5 py-2 rounded-xl bg-error/15 text-error font-bold text-sm disabled:opacity-50">{busy ? "Eliminando…" : "Eliminar"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function CatRow({ c, sub, onRename, onDelete, onError }: { c: Category; sub?: boolean; onRename: (n: string) => Promise<void>; onDelete: () => Promise<void>; onError: (m: string) => void }) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(c.name);
  if (!edit) {
    return (
      <div className="flex items-center gap-2 text-sm p-2 rounded-xl bg-surface-container-low">
        <b>{sub ? "↳ " : "📁 "}{c.name}</b>
        <span className="ml-auto flex gap-2">
          <button onClick={() => setEdit(true)} className="text-xs font-bold text-primary">Renombrar</button>
          <button onClick={onDelete} className="text-xs font-bold text-error">Eliminar</button>
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm p-2">
      <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 bg-surface px-3 py-1.5 rounded-xl text-sm border border-outline-variant/30" />
      <button onClick={() => onRename(name).then(() => setEdit(false)).catch((e) => onError(e.message))} className="text-xs font-bold text-secondary">Guardar</button>
      <button onClick={() => setEdit(false)} className="text-xs text-outline">✕</button>
    </div>
  );
}
