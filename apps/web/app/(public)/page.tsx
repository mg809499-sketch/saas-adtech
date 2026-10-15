"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GrowupLogo } from "../../components/brand/GrowupLogo";
import { SalesWave } from "../../components/charts/charts";
import { Reveal, CountUp, BounceTitle, TiltZone } from "../../components/ui/motion";
import { getPlans, PlanInfo } from "../../lib/billing";
import { apiFetch } from "../../lib/api-client";
import { JumpLetters, Rise } from "../../components/landing/motion";

interface LiveStore { id: string; name: string | null; slug: string | null; logoUrl: string | null; plan: string; products: number }
interface Me { email: string; role: string }

const FALLBACK_PLANS = [
  { slug: "STARTER", name: "Starter", priceMonthlyCop: 116000, imageUrl: null as string | null, desc: "Lanza tu primer catálogo y cobra desde el día uno.", feats: ["Hasta 100 productos", "Bold: tarjetas, PSE y Nequi", "Métricas esenciales", "Hosting y SSL incluidos"] },
  { slug: "SCALE_PRO", name: "Scale Pro", priceMonthlyCop: 316000, imageUrl: null as string | null, desc: "Para marcas que ya venden y quieren acelerar.", feats: ["Productos ilimitados", "Meta Ads Studio Express", "Red Aliada cross-sell", "Dominio .com gratis el 1er año", "Webhooks + API", "Soporte WhatsApp 24/7"], popular: true },
  { slug: "ENTERPRISE", name: "Enterprise", priceMonthlyCop: 796000, imageUrl: null as string | null, desc: "Multimarca, alto volumen y acompañamiento.", feats: ["Hasta 5 tiendas", "CAPI dedicado", "Account manager AdTech", "Tasas Bold preferenciales"] },
];

export default function LandingPage() {
  const [annual, setAnnual] = useState(false);
  const [demo, setDemo] = useState(false);
  const [plans, setPlans] = useState<PlanInfo[] | null>(null);
  const [stores, setStores] = useState<LiveStore[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [ctaName, setCtaName] = useState("");
  const ctaSlug = ctaName.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);

  useEffect(() => {
    getPlans().then(setPlans).catch(() => setPlans(null));
    apiFetch<LiveStore[]>("/stores/public").then((s) => setStores(s.slice(0, 6))).catch(() => setStores([]));
    const token = typeof window !== "undefined" ? localStorage.getItem("gs_token") : null;
    if (token) apiFetch<Me>("/auth/me").then(setMe).catch(() => setMe(null));
  }, []);

  const showPlans = plans && plans.length > 0 ? plans.map((p, i) => ({
    slug: p.slug, name: p.name, priceMonthlyCop: p.priceMonthlyCop, imageUrl: p.imageUrl || undefined,
    desc: FALLBACK_PLANS[i % FALLBACK_PLANS.length].desc,
    feats: FALLBACK_PLANS[i % FALLBACK_PLANS.length].feats, popular: i === 1,
  })) : FALLBACK_PLANS;

  return (
    <div className="min-h-screen text-on-surface">
      {/* ── Header cristal ─────────────────────────────── */}
      <header className="safe-top fixed top-0 inset-x-0 z-50 bg-surface-container/70 backdrop-blur-2xl border-b border-outline-variant/30">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight" aria-label="GrowUp Store inicio">
            <GrowupLogo size={36} /> GrowUp Store
          </Link>
          <nav aria-label="Principal" className="hidden md:flex gap-5 text-sm text-on-surface-variant">
            <Link href="/" className="gs-press hover:text-on-surface">Inicio</Link>
            <Link href="/tiendas" className="gs-press hover:text-on-surface">Tiendas</Link>
            <Link href="/planes" className="gs-press hover:text-on-surface">Planes</Link>
            <Link href="/consola/dashboard-central" className="gs-press hover:text-on-surface">Consola</Link>
          </nav>
          <div className="flex gap-2">
            <Link href="/login?next=/tienda" className="gs-press hidden sm:inline-flex px-4 py-2 rounded-xl text-sm font-semibold text-on-surface-variant hover:text-on-surface">Entrar</Link>
            <Link href="/crear-tienda" className="gs-press px-4 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-sm shadow-soft">Abrir consola</Link>
          </div>
        </div>
      </header>

      <main className="pt-[calc(4rem+env(safe-area-inset-top,0px))]">
        {/* ── 1. HERO ──────────────────────────────────── */}
        <section className="relative text-center overflow-hidden">
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-14 md:pt-20 pb-16">
            <p className="text-sm text-on-surface-variant">E-commerce + Bold + Meta Ads para Colombia</p>
            <h1 aria-label="Vende más. Cobra al instante." className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-3xl mx-auto text-white mt-3 leading-[1.02]">
              <span className="wl-mask"><JumpLetters text="Vende más." /></span>
              <span className="wl-mask"><JumpLetters text="Cobra al instante." base={350} /></span>
            </h1>
            <Rise delay={120}>
              <p className="max-w-2xl mx-auto mt-5 text-base md:text-lg text-on-surface-variant leading-relaxed">
                Monta tu tienda en minutos, cobra con Bold por PSE, tarjeta o Nequi y lanza tus anuncios de Meta en tres clics.
              </p>
            </Rise>
            <Rise delay={200}>
              <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8 max-w-md sm:max-w-none mx-auto">
                <Link href="/crear-tienda" className="gs-press px-8 py-4 rounded-2xl bg-secondary text-on-secondary font-bold shadow-lift">Crear mi tienda gratis</Link>
                <button onClick={() => setDemo(true)} className="gs-press px-6 py-4 rounded-2xl bg-surface-container-high font-bold border border-outline-variant/30">Ver cómo funciona</button>
              </div>
            </Rise>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mt-10 text-left">
              {[
                { v: <CountUp value={500} suffix="K+" />, l: "Pedidos procesados", s: "Bold + Red Aliada" },
                { v: <CountUp value={99.8} decimals={1} suffix="%" />, l: "Aprobación Bold", s: "PSE y tarjetas" },
                { v: <CountUp value={5.2} decimals={1} suffix="x" />, l: "ROAS promedio", s: "Meta Ads Studio" },
                { v: <span><CountUp value={480} /> ms</span>, l: "Respuesta edge", s: "Tiendas en Colombia" },
              ].map((s, i) => (
                <Rise key={s.l} delay={i * 70}>
                  <div className="gs-card gs-glass rounded-2xl p-4">
                    <dt className="order-2 text-xs text-outline mt-1">{s.l} · {s.s}</dt>
                    <dd className="order-1 text-2xl font-extrabold tabular">{s.v}</dd>
                  </div>
                </Rise>
              ))}
            </dl>
          </div>
        </section>

        {/* ── 2. PROMESA ───────────────────────────────── */}
        <section>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <Rise>
            <div className="gs-glass rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-extrabold">Promesa GrowUp</h2>
                <p className="text-sm text-on-surface-variant mt-2 max-w-xl">Productos auténticos de tus tiendas, pagos verificados con Bold y acompañamiento real. Sin letra pequeña.</p>
                <div className="grid grid-cols-2 gap-2 mt-4 max-w-xl">
                  {[["Pagos verificados", "Bold confirma cada cobro"], ["Hosting + SSL", "Incluidos en tu plan"], ["Tus datos", "Exporta tu tienda cuando quieras"], ["Soporte humano", "WhatsApp 24/7 en Scale Pro"]].map(([t, d]) => (
                    <div key={t} className="p-3 rounded-2xl bg-surface-container-low"><div className="font-bold text-sm">{t}</div><div className="text-xs text-on-surface-variant">{d}</div></div>
                  ))}
                </div>
              </div>
              <Link href="/crear-tienda" className="gs-press shrink-0 px-8 py-4 rounded-2xl bg-secondary text-on-secondary font-bold shadow-lift">Compra ahora</Link>
            </div>
          </Rise>
          </div>
        </section>

        {/* ── 3. RED ALIADA ────────────────────────────── */}
        <section>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 flex flex-col md:flex-row items-center gap-6">
            <Rise className="flex-1">
              <h2 className="text-2xl md:text-3xl font-extrabold">Vende en red</h2>
              <p className="text-sm text-on-surface-variant mt-2 max-w-xl">Otras tiendas ofrecen tus productos y tú los suyos, con comisión automática. Gana productos, visibilidad y recompra.</p>
            </Rise>
            <Rise delay={120}>
              <Link href="/tiendas" className="gs-press shrink-0 px-8 py-4 rounded-2xl bg-primary-container text-on-primary-container font-bold">Conocer la red</Link>
            </Rise>
          </div>
        </section>

        {/* ── 4. BENTO TODO EN UNO ─────────────────────── */}
        <section>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <Rise><h2 className="text-2xl md:text-3xl font-extrabold text-center">Todo en uno</h2></Rise>
          <Rise delay={80}><p className="text-sm text-on-surface-variant text-center mt-2">Cuatro motores, una sola consola.</p></Rise>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {[
              { t: "Tu tienda", d: "Catálogo, variantes, tallas y colores.", h: "/crear-tienda", c: "Abrir" },
              { t: "Cobra con Bold", d: "PSE, tarjeta y Nequi liquidados.", h: "/consola/pasarelas-pagos", c: "Conectar" },
              { t: "Anuncia en Meta", d: "Campañas Express en tres clics.", h: "/consola/meta-ads-studio", c: "Anunciar" },
              { t: "Dominio propio", d: "tu-nombre.com verificado por TXT.", h: "/consola/dominio-marca", c: "Vincular" },
            ].map((b, i) => (
              <Rise key={b.t} delay={i * 70}>
                <div className="gs-card gs-glass rounded-3xl p-6 flex flex-col h-full">
                  <div className="font-bold text-lg">{b.t}</div>
                  <div className="text-sm text-on-surface-variant mt-1 flex-1">{b.d}</div>
                  <Link href={b.h} className="gs-press mt-4 text-sm font-bold text-primary">{b.c} →</Link>
                </div>
              </Rise>
            ))}
          </div>
          </div>
        </section>

        {/* ── 5. TIENDAS DESTACADAS (vivo) ─────────────── */}
        <section>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
            <Rise><h2 className="text-2xl md:text-3xl font-extrabold text-center">Tiendas que ya venden aquí</h2></Rise>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
              {stores.map((s, i) => (
                <Rise key={s.id} delay={Math.min(i, 5) * 70}>
                  <Link href={`/s/${s.slug}`} className="gs-card gs-glass rounded-3xl p-5 flex items-center gap-4">
                    {s.logoUrl
                      ? <img src={s.logoUrl} alt={s.name || ""} className="w-14 h-14 rounded-2xl object-cover" loading="lazy" />
                      : <span className="w-14 h-14 rounded-2xl bg-secondary/15 text-secondary font-black text-xl flex items-center justify-center">{(s.name || "?").slice(0, 1)}</span>}
                    <span><span className="block font-bold">{s.name}</span><span className="block text-xs text-on-surface-variant">{s.plan} · {s.products} productos</span></span>
                  </Link>
                </Rise>
              ))}
              {stores.length === 0 && <p className="text-center text-sm text-outline col-span-full">Muy pronto: las primeras tiendas de la red.</p>}
            </div>
          </div>
        </section>

        {/* ── 6. TU TIENDA (solo sesión) ───────────────── */}
        {me && (
          <section>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
            <Rise>
              <div className="gs-glass rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="font-bold text-lg">Hola de nuevo, {me.email}</h2>
                  <p className="text-sm text-on-surface-variant">Tu consola te espera con tus pedidos y tu catálogo al día.</p>
                </div>
                <Link href="/consola/dashboard-central" className="gs-press px-6 py-3 rounded-2xl bg-secondary text-on-secondary font-bold text-sm">Abrir mi consola</Link>
              </div>
            </Rise>
            </div>
          </section>
        )}

        {/* ── 7. CÓMO FUNCIONA ─────────────────────────── */}
        <section>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <Rise><h2 className="text-2xl md:text-3xl font-extrabold text-center">De cero a cobrando</h2></Rise>
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            {[
              { t: "Crea tu tienda", d: "Nombre, slug y plantilla. Diez minutos.", time: "10 min" },
              { t: "Conecta Bold", d: "Pega tus llaves y cobra PSE y tarjetas.", time: "5 min" },
              { t: "Vende todos los días", d: "Catálogo, Meta Ads y Red Aliada trabajando.", time: "24/7" },
            ].map((s, i) => (
              <Rise key={s.t} delay={i * 80}>
                <div className="gs-card rounded-3xl p-6 bg-secondary/10 border border-secondary/25 h-full">
                  <div className="text-xs font-black uppercase tracking-widest text-secondary">{s.time}</div>
                  <div className="font-bold text-xl mt-2">{i + 1}. {s.t}</div>
                  <div className="text-sm text-on-surface-variant mt-1">{s.d}</div>
                </div>
              </Rise>
            ))}
          </div>
          </div>
        </section>

        {/* ── 8. PAGOS ─────────────────────────────────── */}
        <section>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 text-center">
            <Rise><h2 className="text-2xl md:text-3xl font-extrabold">Pagan con</h2></Rise>
            <Rise delay={90}>
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {["Bold", "PSE", "Nequi", "Visa", "Mastercard", "Red Aliada"].map((m) => (
                  <span key={m} className="px-5 py-2.5 rounded-2xl bg-surface-container-high font-bold text-sm">{m}</span>
                ))}
              </div>
            </Rise>
          </div>
        </section>

        {/* ── 9. ECOSISTEMA ────────────────────────────── */}
        <section>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <Rise><h2 className="text-2xl md:text-3xl font-extrabold text-center">Lo que incluye</h2></Rise>
          <TiltZone className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {[
              { t: "Tienda propia", d: "Tu slug.growupstore.app o tu dominio .com." },
              { t: "Recordatorios", d: "Tu consola te avisa de cada pedido." },
              { t: "Asistente", d: "Soporte humano por WhatsApp 24/7." },
              { t: "Panel en vivo", d: "Ventas, stock y campañas en un lugar." },
            ].map((c, i) => (
              <Reveal key={c.t} delay={i * 70}>
                <div className="gs-tilt gs-card gs-glass rounded-3xl p-5 h-full">
                  <div className="font-bold">{c.t}</div>
                  <div className="text-sm text-on-surface-variant mt-1">{c.d}</div>
                </div>
              </Reveal>
            ))}
          </TiltZone>
          <Reveal delay={120}>
            <div className="relative max-w-6xl mx-auto mt-10 text-left">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary-container via-secondary-container to-tertiary-container rounded-3xl blur-2xl opacity-20 gs-orb" aria-hidden />
              <div className="relative bg-surface-container-lowest rounded-3xl shadow-2xl overflow-hidden p-5 lg:p-7 border border-outline-variant/20">
                <div className="flex items-center justify-between pb-4 gap-3">
                  <span className="text-xs text-outline">Panel en vivo de una tienda real</span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-bold"><span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" /> Sincronizado</span>
                </div>
                <h3 className="font-bold">Ventas y tráfico, en un solo lugar</h3>
                <p className="text-xs text-outline mt-0.5">Cobros Bold frente a visitas desde Meta</p>
                <SalesWave id="hero" />
              </div>
            </div>
          </Reveal>
          </div>
        </section>

        {/* ── 10. SERVICIOS ────────────────────────────── */}
        <section>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
            <Rise><h2 className="text-2xl md:text-3xl font-extrabold text-center">Servicios GrowUp</h2></Rise>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              {[
                { t: "Montaje exprés", d: "Tu tienda lista con plantilla y trial.", h: "/crear-tienda", c: "Empezar" },
                { t: "Bold guiado", d: "Te acompañamos a conectar tu pasarela.", h: "/consola/pasarelas-pagos", c: "Conectar" },
                { t: "Meta Express", d: "Tu primera campaña en tres clics.", h: "/consola/meta-ads-studio", c: "Anunciar" },
                { t: "Mayoreo y red", d: "Alianzas y venta por volumen.", h: "/consola/red-aliada-afiliados", c: "Aliarme" },
              ].map((s, i) => (
                <Rise key={s.t} delay={i * 70}>
                  <div className="gs-card gs-glass rounded-3xl p-6 flex flex-col h-full">
                    <div className="font-bold text-lg">{s.t}</div>
                    <div className="text-sm text-on-surface-variant mt-1 flex-1">{s.d}</div>
                    <Link href={s.h} className="gs-press mt-4 text-sm font-bold text-primary">{s.c} →</Link>
                  </div>
                </Rise>
              ))}
            </div>
          </div>
        </section>

        {/* ── 11. COLOMBIA ─────────────────────────────── */}
        <section className="text-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <Rise><h2 className="text-2xl md:text-3xl font-extrabold">Hecho en Colombia</h2></Rise>
          <Rise delay={80}><p className="text-sm text-on-surface-variant mt-2 max-w-xl mx-auto">Precios en COP, PSE y Nequi de nacimiento, hosting y soporte en tu horario.</p></Rise>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mt-8">
            {[["COP", "Precios en pesos"], ["PSE", "Banco local"], ["24/7", "Soporte WhatsApp"], ["SSL", "Hosting incluido"]].map(([v, l], i) => (
              <Rise key={l} delay={i * 60}>
                <div className="gs-card gs-glass rounded-2xl p-5">
                  <div className="text-2xl font-black">{v}</div>
                  <div className="text-xs text-outline mt-1">{l}</div>
                </div>
              </Rise>
            ))}
          </div>
          </div>
        </section>

        {/* ── 12. TESTIMONIOS ──────────────────────────── */}
        <section>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
            <Rise><h2 className="text-2xl md:text-3xl font-extrabold text-center">Lo que dicen</h2></Rise>
            <div className="grid md:grid-cols-2 gap-4 mt-8 max-w-4xl mx-auto">
              {[
                { q: "Monté mi tienda en una tarde y el primer pago por PSE llegó al día siguiente.", n: "Comercio Demo", s: "Mi Tienda Deportiva" },
                { q: "La Red Aliada me trae pedidos que yo sola no alcanzaría.", n: "Aliada Demo", s: "Tienda Aliada" },
              ].map((t, i) => (
                <Rise key={t.n} delay={i * 90}>
                  <blockquote className="gs-card gs-glass rounded-3xl p-6">
                    <p className="text-base leading-relaxed">“{t.q}”</p>
                    <footer className="text-sm font-bold mt-4">{t.n} <span className="text-xs font-normal text-on-surface-variant">· {t.s}</span></footer>
                  </blockquote>
                </Rise>
              ))}
            </div>
          </div>
        </section>

        {/* ── 13. PLANES ───────────────────────────────── */}
        <section>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <Rise><h2 className="text-2xl md:text-3xl font-extrabold text-center">Elige tu plan</h2></Rise>
          <Rise delay={70}><p className="text-center text-on-surface-variant mt-3">Empieza gratis. Cambia de plan cuando vendas más.</p></Rise>
          <div className="flex justify-center mt-6" role="group" aria-label="Periodo de facturación">
            <div className="bg-surface-container-high p-1.5 rounded-2xl flex border border-outline-variant/20">
              <button onClick={() => setAnnual(false)} aria-pressed={!annual} className={`gs-press px-5 py-2 rounded-xl text-sm font-bold ${!annual ? "bg-surface-container shadow" : "text-on-surface-variant"}`}>Mensual</button>
              <button onClick={() => setAnnual(true)} aria-pressed={annual} className={`gs-press px-5 py-2 rounded-xl text-sm font-bold ${annual ? "bg-surface-container shadow" : "text-on-surface-variant"}`}>Anual −25%</button>
            </div>
          </div>
          <TiltZone className="grid md:grid-cols-3 gap-5 mt-8 items-stretch">
            {showPlans.map((p, i) => (
              <Reveal key={p.slug} delay={i * 70} className="h-full">
                <div className={`gs-tilt gs-card rounded-3xl p-6 flex flex-col h-full ${i === 1 ? "gs-glass-strong shadow-lift border border-secondary/30" : "gs-glass"}`}>
                  {i === 1 && <span className="text-xs font-extrabold text-secondary uppercase tracking-wide">El favorito</span>}
                  {p.imageUrl && <img src={p.imageUrl} alt="" loading="lazy" className="w-full h-36 rounded-2xl object-cover mt-2" />}
                  <h3 className="font-bold text-lg mt-1.5 font-display">{p.name}</h3>
                  <p className="text-sm text-on-surface-variant mt-1">{p.desc}</p>
                  <div className="text-4xl font-black mt-4 tabular">${Math.round(annual ? p.priceMonthlyCop * 0.75 : p.priceMonthlyCop).toLocaleString("es-CO")}<span className="text-sm font-normal text-outline"> COP/mes</span></div>
                  <ul className="mt-4 space-y-2 text-sm">{p.feats.map((f) => <li key={f} className="flex gap-2"><span className="material-symbols-outlined text-secondary text-[18px]" aria-hidden>check_circle</span><span>{f}</span></li>)}</ul>
                  <Link href="/planes" className={`gs-press mt-6 text-center py-3 rounded-xl font-bold ${i === 1 ? "bg-secondary text-on-secondary" : "bg-surface-container-high border border-outline-variant/20"}`}>Elegir {p.name}</Link>
                </div>
              </Reveal>
            ))}
          </TiltZone>
          </div>
        </section>

        {/* ── 14. CTA FINAL ────────────────────────────── */}
        <section>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
          <Rise>
            <div className="gs-glass-strong rounded-3xl p-8 md:p-12 text-center border border-secondary/25">
              <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-[1.02]">
                <span className="wl-mask"><span className="wl-line">Nombra tu tienda.</span></span>
                <span className="wl-mask"><span className="wl-line" style={{ animationDelay: "110ms" }}>Cobra esta semana.</span></span>
              </h2>
              <div className="max-w-md mx-auto mt-6 flex flex-col gap-2">
                <input value={ctaName} onChange={(e) => setCtaName(e.target.value)} placeholder="Mi Tienda Pro" aria-label="Nombre de tu tienda" className="bg-surface-container px-5 py-3.5 rounded-2xl text-sm border border-outline-variant/30 text-center" />
                <Link href={ctaSlug ? `/crear-tienda?nombre=${encodeURIComponent(ctaName.trim())}&slug=${encodeURIComponent(ctaSlug)}` : "/crear-tienda"} className="gs-press py-3.5 rounded-2xl bg-secondary text-on-secondary font-bold">Abrir mi tienda{ctaSlug ? ` · ${ctaSlug}` : ""}</Link>
              </div>
            </div>
          </Rise>
          </div>
        </section>

        {/* ── Demo modal ───────────────────────────────── */}
        {demo && <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDemo(false)}><div role="dialog" aria-modal="true" aria-label="Tour de GrowUp Store" className="bg-surface-container rounded-3xl p-6 max-w-lg w-full border border-outline-variant/30" onClick={(e) => e.stopPropagation()}><h3 className="font-bold font-display text-lg">De la tienda al cobro en 3 pasos</h3><ol className="text-sm text-on-surface-variant mt-3 space-y-2 list-decimal pl-5"><li>Crea tu tienda y sube tu catálogo.</li><li>Conecta Bold y cobra por PSE, tarjeta o Nequi.</li><li>Lanza tu campaña de Meta y mide el ROAS.</li></ol><div className="flex gap-2 mt-5"><Link href="/crear-tienda" className="gs-press flex-1 text-center py-2.5 rounded-xl bg-secondary text-on-secondary font-bold">Empezar ahora</Link><button onClick={() => setDemo(false)} className="gs-press px-5 py-2.5 rounded-xl bg-surface-container-high font-bold">Cerrar</button></div></div></div>}
      </main>

      <footer className="border-t border-outline-variant/30 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="font-display font-extrabold text-on-surface leading-none" style={{ fontSize: "clamp(40px, 8vw, 120px)", letterSpacing: "-0.02em" }}>GROWUP STORE</p>
          <div className="mt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-outline">
            <span className="flex items-center gap-2 text-on-surface-variant font-semibold"><GrowupLogo size={24} /> GrowUp Store</span>
            <span className="flex gap-5">
              <Link href="/tiendas" className="hover:text-on-surface">Tiendas</Link>
              <Link href="/planes" className="hover:text-on-surface">Planes</Link>
              <Link href="/login?next=/tienda" className="hover:text-on-surface">Entrar</Link>
            </span>
            <span>Hecho en Colombia · Pagos Bold · © 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
