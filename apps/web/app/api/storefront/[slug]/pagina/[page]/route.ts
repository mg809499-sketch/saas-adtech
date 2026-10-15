import { NextResponse } from "next/server";

// Página publicada de la tienda (caché 120s): bloques visibles para la vitrina.
export const revalidate = 120;

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api/v1";
}

export async function GET(_req: Request, { params }: { params: { slug: string; page: string } }) {
  const r = await fetch(
    `${apiBase()}/storefront/${encodeURIComponent(params.slug.toLowerCase())}/pages/${encodeURIComponent(params.page)}`,
    { next: { revalidate: 120 } },
  );
  if (!r.ok) return NextResponse.json({ blocks: [] }, { status: r.status });
  return NextResponse.json(await r.json());
}
