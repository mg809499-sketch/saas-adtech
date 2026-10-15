// Placeholders "vida natural" por contenedor: todo bloque nace con contenido
// válido para sanitizeProps para que el comerciante edite encima, nunca de vacío.
export interface BlockMeta { type: string; name: string; desc: string }

export const BLOCK_META: BlockMeta[] = [
  { type: "hero", name: "Héroe", desc: "Titular + subtítulo + botón + imagen" },
  { type: "texto", name: "Texto", desc: "Párrafo con alineación y color" },
  { type: "imagen", name: "Imagen", desc: "Foto con enlace opcional" },
  { type: "productos", name: "Productos", desc: "Grilla desde tu catálogo" },
  { type: "coleccion", name: "Colección", desc: "Chips de categorías" },
  { type: "testimonios", name: "Testimonios", desc: "Opiniones de clientes" },
  { type: "faq", name: "Preguntas", desc: "Acordeón de preguntas" },
  { type: "footer", name: "Pie", desc: "Cierre de página" },
  { type: "html", name: "HTML", desc: "Código propio (sin scripts)" },
  { type: "boton", name: "Botón", desc: "CTA a catálogo u oferta" },
];

export function placeholderFor(type: string, seed = "tienda"): Record<string, unknown> {
  switch (type) {
    case "hero":
      return { title: "Tu titular aquí", subtitle: "Describe tu propuesta de valor en una línea", ctaText: "Ver catálogo", ctaHref: "#catalogo", imageUrl: `https://picsum.photos/seed/${seed}-hero/1200/600` };
    case "texto":
      return { content: "Escribe aquí el texto de tu tienda: envíos, garantías, historia de la marca.", align: "left" };
    case "imagen":
      return { imageUrl: `https://picsum.photos/seed/${seed}-img/1200/600`, alt: "Imagen de muestra" };
    case "productos":
      return { title: "Destacados", limit: 6 };
    case "coleccion":
      return { title: "Explora por categoría" };
    case "testimonios":
      return { title: "Opiniones", items: [{ name: "María G.", text: "Edita este testimonio con una opinión real." }, { name: "Carlos R.", text: "Agrega aquí la segunda opinión." }] };
    case "faq":
      return { title: "Preguntas frecuentes", items: [{ q: "¿Hacen envíos?", a: "Edita esta respuesta." }, { q: "¿Qué medios de pago aceptan?", a: "PSE, tarjeta y Nequi." }] };
    case "footer":
      return { text: "" };
    case "html":
      return { code: "<!-- Tu HTML aquí (sin <script>) -->" };
    case "boton":
      return { text: "Ver ofertas", href: "#catalogo", variant: "oferta", align: "center" };
    default:
      return {};
  }
}
