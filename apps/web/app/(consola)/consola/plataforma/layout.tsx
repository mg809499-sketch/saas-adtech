"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../../lib/api-client";

// Guardia cliente de la consola de plataforma: solo ADMIN.
// El middleware ya filtra en servidor; esto evita el flash.
export default function PlataformaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);
  useEffect(() => {
    apiFetch<{ role: string }>("/auth/me")
      .then((me) => {
        if (me.role !== "ADMIN") router.replace("/consola/dashboard-central");
        else setOk(true);
      })
      .catch(() => router.replace("/login?next=/consola/plataforma"));
  }, [router]);
  if (!ok) return <div className="p-10 text-center text-sm text-on-surface-variant">Verificando rol de plataforma…</div>;
  return <>{children}</>;
}
