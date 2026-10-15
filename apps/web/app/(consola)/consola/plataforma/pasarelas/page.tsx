"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../../../lib/api-client";

interface Gw {
  tenantId: string; storeSlug: string | null; storeName: string | null;
  boldConfigured: boolean; metaConfigured: boolean;
  metaAdAccount: string | null; metaPixel: string | null;
  subscription: string; plan: string | null;
}

// Cómo se implementa la pasarela: cada tienda guarda sus llaves Bold cifradas
// (AES-256-GCM) con PUT /tenant/gateway desde SU consola; el webhook Bold
// llega firmado (HMAC) y confirma pagos. Aquí ves el estado por tienda y
// puedes revocar llaves (el comercio las vuelve a conectar).
export default function PlataformaPasarelas() {
  const [rows, setRows] = useState<Gw[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => apiFetch<Gw[]>("/admin/gateways").then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const revoke = (g: Gw) => {
    if (!confirm(`Revocar llaves Bold/Meta de ${g.storeSlug}? El comercio deberá reconectar.`)) return;
    setErr(""); setMsg(""); setBusy(true);
    apiFetch(`/admin/gateways/${g.tenantId}/keys`, { method: "DELETE" })
      .then(() => { setMsg("Llaves revocadas."); load(); })
      .catch((e) => setErr(e instanceof Error ? e.message : "Error"))
      .finally(() => setBusy(false));
  };

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto flex flex-col gap-5">
      <div><h1 className="text-3xl font-extrabold">Pasarelas y pagos (plataforma)</h1><p className="text-sm text-on-surface-variant">Nunca se muestran secretos: solo estado. Con MOCK_PAYMENTS la confirmación es simulada en demo.</p></div>
      {msg && <div role="status" className="p-3 rounded-xl bg-secondary/15 text-secondary text-sm font-bold">{msg}</div>}
      {err && <div role="alert" className="p-3 rounded-xl bg-error/10 text-error text-sm font-bold">{err}</div>}
      <div className="overflow-x-auto rounded-3xl gs-glass"><table className="w-full text-sm min-w-[680px]">
        <thead><tr className="text-xs uppercase text-outline"><th className="text-left p-3">Tienda</th><th className="text-left">Bold</th><th className="text-left">Meta</th><th className="text-left">Cuenta/Pixel</th><th></th></tr></thead>
        <tbody>{rows.map((g) => (
          <tr key={g.tenantId} className="border-t border-outline-variant/20">
            <td className="p-3 font-bold">{g.storeName}<span className="block text-xs text-outline font-mono font-normal">{g.storeSlug} · {g.plan} ({g.subscription})</span></td>
            <td className={`text-xs font-bold ${g.boldConfigured ? "text-secondary" : "text-outline"}`}>{g.boldConfigured ? "Configurado" : "Sin configurar"}</td>
            <td className={`text-xs font-bold ${g.metaConfigured ? "text-secondary" : "text-outline"}`}>{g.metaConfigured ? "Conectado" : "Pendiente"}</td>
            <td className="text-xs font-mono">{g.metaAdAccount || "—"} · {g.metaPixel || "—"}</td>
            <td className="p-3 text-right"><button disabled={busy || (!g.boldConfigured && !g.metaConfigured)} onClick={() => revoke(g)} className="text-xs font-bold text-error disabled:opacity-40">Revocar llaves</button></td>
          </tr>))}
        </tbody></table></div>
    </div>
  );
}
