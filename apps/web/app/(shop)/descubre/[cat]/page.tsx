import Link from "next/link";
import { Reveal } from "../../../../components/ui/motion";

const INFO: Record<string, { h: string; p: string; feats: string[]; cta: [string, string][] }> = {
  tienda: {
    h: "Descubre — Tienda GrowUp Store",
    p: "Tu vitrina con checkout Bold integrado: PSE, tarjetas y Nequi en un flujo de 3 pasos, con reserva de stock y confirmación por WhatsApp.",
    feats: ["Catálogo con seed inicial y SKUs", "Carrito persistente + checkout con login", "Reserva de stock 15 min y webhook firmado", "Recibo y mis pedidos por cliente"],
    cta: [["/tienda", "Ver tienda demo"], ["/crear-tienda", "Crear mi tienda"]],
  },
  dashboard: {
    h: "Descubre — Dashboard Central",
    p: "La consola del comercio: ventas vs. inversión Meta en tiempo real, horas pico, aprobación Bold y órdenes en vivo. Requiere login y plan activo.",
    feats: ["KPIs animados con sparklines", "Ola multicanal ventas vs. ads", "Dona de aprobación 98.7%", "Órdenes en tiempo real"],
    cta: [["/planes", "Activar mi plan"], ["/login?next=/consola/dashboard-central", "Entrar a la consola"]],
  },
  pasarelas: {
    h: "Descubre — Pasarelas Bold",
    p: "Conecta tu Merchant ID y llaves Bold: se guardan cifradas AES-256 en el servidor y solo ves máscaras. Webhooks con firma HMAC-SHA256.",
    feats: ["Llaves cifradas, nunca en claro", "Solo el comercio las administra", "Eventos approved/pending/rejected", "Uptime y latencia monitoreados"],
    cta: [["/planes", "Empezar"], ["/crear-tienda", "Crear mi tienda"]],
  },
  dominios: {
    h: "Descubre — Dominios y Marca",
    p: "Cada tienda nace con slug.growupstore.app. Configura SSL, favicon, SEO y modo mantenimiento desde la consola.",
    feats: ["Subdominio gratis por tienda", "SSL automático", "SEO y vista previa de pestaña", "Modo mantenimiento"],
    cta: [["/crear-tienda", "Reclamar mi slug"], ["/planes", "Ver planes"]],
  },
};

export default function DescubrePage({ params }: { params: { cat: string } }) {
  const info = INFO[params.cat] || INFO.tienda;
  return (
    <div className="max-w-3xl mx-auto p-5 lg:p-10 flex flex-col gap-5">
      <Reveal><h1 className="text-3xl lg:text-4xl font-extrabold">{info.h}</h1></Reveal>
      <Reveal delay={80}><p className="text-on-surface-variant">{info.p}</p></Reveal>
      <div className="grid sm:grid-cols-2 gap-3">
        {info.feats.map((f, i) => (
          <Reveal key={f} delay={i * 60}><div className="gs-glass gs-card rounded-2xl p-4 text-sm font-semibold">✓ {f}</div></Reveal>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {info.cta.map(([href, label]) => (
          <Link key={href + label} href={href} className="px-6 py-3 rounded-2xl bg-primary-container text-on-primary-container font-bold text-sm">{label}</Link>
        ))}
      </div>
    </div>
  );
}
