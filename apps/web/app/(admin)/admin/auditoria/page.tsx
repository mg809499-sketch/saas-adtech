"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../../lib/api-client";

export default function AdminAuditoria() {
  const [rows, setRows] = useState<{ eventId: string; type: string; orderId: string | null; createdAt: string }[]>([]);
  useEffect(() => { apiFetch<typeof rows>("/admin/events?take=50").then(setRows).catch(() => setRows([])); }, []);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-extrabold">Auditoría — eventos de webhook</h1>
      <div className="gs-glass rounded-2xl overflow-x-auto"><table className="w-full text-sm min-w-[700px] font-mono"><thead><tr className="text-xs uppercase text-outline font-sans"><th className="text-left p-3">Evento</th><th className="text-left">Tipo</th><th className="text-left">Orden</th><th className="text-right">Fecha</th></tr></thead>
      <tbody>{rows.map((e) => <tr key={e.eventId} className="border-t border-outline-variant/10 gs-row-hover"><td className="p-3">{e.eventId}</td><td>{e.type}</td><td>{e.orderId || "—"}</td><td className="text-right">{new Date(e.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>
    </div>
  );
}
