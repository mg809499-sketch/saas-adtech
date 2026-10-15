"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../../lib/api-client";

export default function AdminSubs() {
  const [rows, setRows] = useState<{ id: string; status: string; plan: { name: string }; tenant: { storeName: string | null; storeSlug: string | null }; currentPeriodEnd: string | null }[]>([]);
  useEffect(() => { apiFetch<typeof rows>("/admin/subscriptions").then(setRows).catch(() => setRows([])); }, []);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-extrabold">Suscripciones</h1>
      <div className="gs-glass rounded-2xl overflow-x-auto"><table className="w-full text-sm min-w-[700px]"><thead><tr className="text-xs uppercase text-outline"><th className="text-left p-3">Tienda</th><th>Plan</th><th>Estado</th><th className="text-right">Vigente hasta</th></tr></thead>
      <tbody>{rows.map((s) => <tr key={s.id} className="border-t border-outline-variant/10 gs-row-hover"><td className="p-3 font-bold">{s.tenant.storeName}<span className="block text-xs font-mono text-outline">{s.tenant.storeSlug}</span></td><td className="text-center">{s.plan.name}</td><td className="text-center text-xs font-bold">{s.status}</td><td className="text-right text-xs">{s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : "—"}</td></tr>)}</tbody></table></div>
    </div>
  );
}
