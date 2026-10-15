import { NextResponse } from "next/server";

// Catálogo público por slug (caché 60s). Resuelve el tenant una vez y pide
// los productos con x-tenant-id al API central.
export const revalidate = 60;

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api/v1";
}

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const take = Math.min(Math.max(Number(url.searchParams.get("take")) || 50, 1), 100);
  const store = await fetch(`${apiBase()}/stores/by-slug/${encodeURIComponent(params.slug.toLowerCase())}`, {
    next: { revalidate: 60 },
  });
  if (!store.ok) return NextResponse.json({ message: "tienda no disponible" }, { status: store.status });
  const tenantId = ((await store.json()) as { id: string }).id;
  const qs = new URLSearchParams({ take: String(take) });
  if (search) qs.set("search", search);
  const r = await fetch(`${apiBase()}/products?${qs.toString()}`, {
    headers: { "x-tenant-id": tenantId },
    next: { revalidate: 60 },
  });
  if (!r.ok) return NextResponse.json({ message: "catálogo no disponible" }, { status: r.status });
  return NextResponse.json(await r.json());
}
