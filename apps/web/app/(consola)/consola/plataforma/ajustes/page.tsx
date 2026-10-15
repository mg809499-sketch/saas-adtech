"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../../../lib/api-client";

interface Setting { key: string; label: string; type: "string" | "number" | "boolean"; value: unknown }

// Ajustes del negocio principal GrowUp (NO los de la tienda del cliente).
export default function PlataformaAjustes() {
  const [rows, setRows] = useState<Setting[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const load = () => apiFetch<Setting[]>("/admin/settings").then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const save = async (s: Setting, value: unknown) => {
    setErr(""); setMsg(""); setBusy(s.key);
    try {
      await apiFetch("/admin/settings", { method: "PATCH", body: JSON.stringify({ key: s.key, value }) });
      setMsg(`${s.label} actualizado.`);
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Error"); }
    finally { setBusy(null); }
  };

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto flex flex-col gap-5">
      <div><h1 className="text-3xl font-extrabold">Ajustes GrowUp</h1><p className="text-sm text-on-surface-variant">Configuración del negocio principal. Aplica a toda la plataforma.</p></div>
      {msg && <div role="status" className="p-3 rounded-xl bg-secondary/15 text-secondary text-sm font-bold">{msg}</div>}
      {err && <div role="alert" className="p-3 rounded-xl bg-error/10 text-error text-sm font-bold">{err}</div>}
      <div className="flex flex-col gap-3">
        {rows.map((s) => (
          <SettingRow key={s.key} s={s} busy={busy === s.key} onSave={(v) => save(s, v)} />
        ))}
      </div>
    </div>
  );
}

function SettingRow({ s, busy, onSave }: { s: Setting; busy: boolean; onSave: (v: unknown) => void }) {
  const [v, setV] = useState<string>(String(s.value ?? ""));
  const [b, setB] = useState<boolean>(s.value === true);
  useEffect(() => { setV(String(s.value ?? "")); setB(s.value === true); }, [s]);
  return (
    <div className="p-4 rounded-2xl gs-glass flex items-center gap-3">
      <div className="flex-1"><div className="font-bold text-sm">{s.label}</div><div className="text-xs text-outline font-mono">{s.key}</div></div>
      {s.type === "boolean" ? (
        <button onClick={() => { setB(!b); onSave(!b); }} disabled={busy} className={`px-4 py-2 rounded-xl font-bold text-sm ${b ? "bg-secondary text-on-secondary" : "bg-surface-container-high"}`}>{b ? "Activado" : "Apagado"}</button>
      ) : (
        <>
          <input
            type={s.type === "number" ? "number" : "text"}
            value={v} onChange={(e) => setV(e.target.value)}
            className="w-48 bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30" />
          <button onClick={() => onSave(s.type === "number" ? Number(v) : v)} disabled={busy} className="px-4 py-2 rounded-xl bg-primary-container text-on-primary-container font-bold text-sm disabled:opacity-50">Guardar</button>
        </>
      )}
    </div>
  );
}
