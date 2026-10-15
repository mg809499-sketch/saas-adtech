"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/auth";
import { checkSlug, createStore, getOnboarding, getPlanStatus, myStores, PlanStatus, StoreTemplate } from "../../../lib/billing";

const STEPS = ["Crea tu tienda", "Agrega tu primer producto", "Conecta Bold", "Abre tu consola"];
const TEMPLATES: { slug: StoreTemplate; name: string; desc: string }[] = [
  { slug: "minimal", name: "Minimal", desc: "Alta conversión, catálogo reducido" },
  { slug: "catalog", name: "Catálogo", desc: "Multicategoría, filtros y FAQ" },
  { slug: "landing", name: "Landing", desc: "Venta directa en un hilo" },
];

export default function CrearTiendaPage() {
  const { user, ready, refresh } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [template, setTemplate] = useState<StoreTemplate>("minimal");
  const [avail, setAvail] = useState<boolean | null>(null);
  const [status, setStatus] = useState<PlanStatus | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [storeUrl, setStoreUrl] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<{ key: string; done: boolean; href: string; label: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) { router.push("/login?next=/crear-tienda"); return; }
    // La portada manda ?nombre=&slug= desde su CTA.
    try {
      const sp = new URLSearchParams(window.location.search);
      const n = (sp.get("nombre") || "").slice(0, 60);
      const s = (sp.get("slug") || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30);
      if (n) setName(n);
      if (s) setSlug(s);
    } catch { /* sin query */ }
    getPlanStatus().then(setStatus).catch(() => setStatus(null));
    myStores().catch(() => []);
  }, [ready, user, router]);

  useEffect(() => {
    const s = slug.toLowerCase().trim();
    if (!/^[a-z0-9-]{3,30}$/.test(s)) { setAvail(null); return; }
    const t = setTimeout(() => checkSlug(s).then((r) => setAvail(r.available)).catch(() => setAvail(null)), 400);
    return () => clearTimeout(t);
  }, [slug]);

  const submit = async () => {
    setError(""); setBusy(true);
    try {
      const key = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
      const r = await createStore({ name, slug: slug.toLowerCase().trim(), templateSlug: template }, key);
      localStorage.setItem("gs_console_tenant", r.tenant.id);
      localStorage.setItem("gs_tenant", r.tenant.id);
      localStorage.removeItem("gs_store");
      localStorage.removeItem("gs_store_slug");
      await refresh(); // el JWT ahora trae rol MERCHANT
      setDone(r.tenant.id);
      setStoreUrl(r.storeUrl || null);
      getOnboarding(r.tenant.id).then((o) => setChecklist(o.items)).catch(() => {});
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo crear"); }
    finally { setBusy(false); }
  };

  if (!ready) return <div className="p-8 text-sm">Cargando…</div>;
  if (!status?.active) {
    return (
      <div className="max-w-lg mx-auto p-8 text-center flex flex-col gap-3">
        <h1 className="text-2xl font-extrabold">Necesitas un plan activo</h1>
        <p className="text-sm text-on-surface-variant">La creación de tiendas requiere membresía vigente.</p>
        <Link href="/planes" className="py-3 rounded-2xl bg-primary-container text-on-primary-container font-bold">Ver planes →</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto p-8 flex flex-col gap-4">
        <div className="p-6 rounded-3xl bg-secondary/10 border border-secondary/30 text-center"><div className="text-4xl">🎉</div><h1 className="text-2xl font-extrabold mt-2">¡Tu tienda está lista!</h1><p className="text-sm text-on-surface-variant">Plantilla {template} + 14 días de trial.</p>{storeUrl && <a href={storeUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-primary">{storeUrl} →</a>}</div>
        {(checklist.length ? checklist : STEPS.map((s) => ({ key: s, done: false, href: "", label: s }))).map((s, i) => (
          <div key={s.key} className="p-4 rounded-2xl gs-glass flex items-center gap-3">
            <span className={`w-7 h-7 rounded-full font-black text-sm flex items-center justify-center ${s.done || i === 0 ? "bg-secondary text-on-secondary" : "bg-surface-container-high"}`}>{s.done ? "✓" : i + 1}</span>
            <span className="text-sm font-bold">{s.label}</span>
            {s.href && <Link href={s.href} className="ml-auto text-xs text-primary font-bold">Ir →</Link>}
          </div>
        ))}
      </div>
    );
  }

  const valid = name.trim().length >= 3 && avail === true;
  return (
    <div className="max-w-lg mx-auto p-5 lg:p-8 flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold">Crea tu tienda</h1>
      <p className="text-sm text-on-surface-variant">Plan {status.plan?.name} · tu tienda nace con plantilla lista y trial de 14 días.</p>
      <label className="text-xs font-bold">Nombre de la tienda</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mi Tienda Pro" className="bg-surface-container px-4 py-2.5 rounded-2xl text-sm border border-outline-variant/30" />
      <label className="text-xs font-bold">Plantilla inicial</label>
      <div className="grid grid-cols-3 gap-2">
        {TEMPLATES.map((t) => (
          <button key={t.slug} type="button" onClick={() => setTemplate(t.slug)} className={`p-3 rounded-2xl text-left border ${template === t.slug ? "border-secondary bg-secondary/10" : "border-outline-variant/30 gs-glass"}`}>
            <div className="font-bold text-sm">{t.name}</div>
            <div className="text-[11px] text-on-surface-variant">{t.desc}</div>
          </button>
        ))}
      </div>
      <label className="text-xs font-bold">Slug (tu dirección: slug.growupstore.app)</label>
      <div className="flex gap-2 items-center">
        <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="mi-tienda" className="flex-1 bg-surface-container px-4 py-2.5 rounded-2xl text-sm border border-outline-variant/30 font-mono" />
        {avail === true && <span className="text-secondary text-xs font-bold">Disponible ✓</span>}
        {avail === false && <span className="text-error text-xs font-bold">En uso ✕</span>}
      </div>
      {error && <div className="text-sm text-error font-bold">{error}</div>}
      <button disabled={!valid || busy} onClick={submit} className="py-3.5 rounded-2xl bg-secondary text-on-secondary font-bold disabled:opacity-40">{busy ? "Creando…" : "Crear mi tienda"}</button>
    </div>
  );
}
