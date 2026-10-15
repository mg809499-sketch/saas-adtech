import { NextResponse } from "next/server";

// Ficha pública de la tienda (caché 60s). Proxy al API central: respeta
// RLS/tenant y planes allá; aquí solo se cachea el borde para el free tier.
export const revalidate = 60;

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api/v1";
}

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const r = await fetch(`${apiBase()}/stores/by-slug/${encodeURIComponent(params.slug.toLowerCase())}`, {
    next: { revalidate: 60 },
  });
  if (!r.ok) return NextResponse.json({ message: "tienda no disponible" }, { status: r.status });
  const t = (await r.json()) as Record<string, unknown>;
  // Sin secretos ni PII: solo lo que la vitrina pinta.
  const { id, storeName, storeSlug, logoUrl, theme, seo } = t as {
    id: string; storeName: string | null; storeSlug: string | null;
    logoUrl: string | null; theme: unknown; seo: unknown;
  };
  return NextResponse.json({ id, storeName, storeSlug, logoUrl, theme, seo });
}
