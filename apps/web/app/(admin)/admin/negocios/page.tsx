"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../../lib/api-client";

export default function AdminTiendas() {
  const [rows, setRows] = useState<{ id: string; storeName: string | null; storeSlug: string | null; subscription: { status: string; plan: { name: string } } | null; _count: { products: number; orders: number; users: number } }[]>([]);
  useEffect(() => { apiFetch<typeof rows>("/admin/stores").then(setRows).catch(() => setRows([])); }, []);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-extrabold">Tiendas ({rows.length})</h1>
      <div className="gs-glass rounded-2xl overflow-x-auto"><table className="w-full text-sm min-w-[700px]"><thead><tr className="text-xs uppercase text-outline"><th className="text-left p-3">Tienda</th><th>Plan</th><th>Estado</th><th className="text-right">Productos</th><th className="text-right">Órdenes</th><th className="text-right">Usuarios</th></tr></thead>
      <tbody>{rows.map((t) => <tr key={t.id} className="border-t border-outline-variant/10 gs-row-hover"><td className="p-3 font-bold">{t.storeName}<span className="block text-xs font-mono text-outline">{t.storeSlug}</span></td><td className="text-center">{t.subscription?.plan.name || "—"}</td><td className="text-center text-xs font-bold">{t.subscription?.status || "NONE"}</td><td className="text-right">{t._count.products}</td><td className="text-right">{t._count.orders}</td><td className="text-right">{t._count.users}</td></tr>)}</tbody></table></div>
    </div>
  );
}
