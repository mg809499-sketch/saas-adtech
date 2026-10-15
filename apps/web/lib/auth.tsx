"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiFetch } from "./api-client";

interface ShopUser { id: string; tenantId: string; email: string; name?: string | null; role: string }
interface AuthCtx {
  user: ShopUser | null; ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string, storeSlug?: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}
const Ctx = createContext<AuthCtx>({ user: null, ready: false, login: async () => {}, register: async () => {}, logout: () => {}, refresh: async () => {} });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ShopUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Arranque tolerante: sin access pero con refresh (cookie httpOnly o
    // token guardado) intenta restaurar la sesión antes de rendirse.
    const boot = async () => {
      const token = localStorage.getItem("gs_token");
      if (token) {
        try {
          setUser(await apiFetch<ShopUser>("/auth/me"));
        } catch {
          localStorage.removeItem("gs_token");
        }
        setReady(true);
        return;
      }
      const legacy = localStorage.getItem("gs_refresh_token");
      try {
        const data = await apiFetch<{ accessToken?: string; refreshToken?: string; user: ShopUser }>("/auth/refresh", {
          method: "POST",
          body: JSON.stringify(legacy ? { refreshToken: legacy } : {}),
        });
        if (data.accessToken) localStorage.setItem("gs_token", data.accessToken);
        if (data.refreshToken) localStorage.setItem("gs_refresh_token", data.refreshToken);
        setUser(data.user);
      } catch {
        /* sin sesión: queda null y el layout redirige con reason */
      } finally {
        setReady(true);
      }
    };
    boot();
  }, []);

  const save = useCallback((data: { accessToken?: string; refreshToken?: string; user: ShopUser }) => {
    // Compat: si el API retorna tokens en body (localStorage legacy), guárdalos;
    // la sesión real vive en cookies httpOnly cuando el navegador las persiste.
    // El refresh en body es el fallback cuando las cookies no viajan
    // (ej. front en 127.0.0.1 vs API en localhost: cross-site bloquea Lax).
    if (data.accessToken) localStorage.setItem("gs_token", data.accessToken);
    if (data.refreshToken) localStorage.setItem("gs_refresh_token", data.refreshToken);
    // No pisar el contexto: user.tenantId es el tenant legacy (demo), no la
    // tienda propia. Solo fija tenant si no hay ninguno (primera vez).
    if (!localStorage.getItem("gs_tenant") && !localStorage.getItem("gs_store")) {
      localStorage.setItem("gs_tenant", data.user.tenantId);
    }
    setUser(data.user);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    save(await apiFetch<{ accessToken: string; user: ShopUser }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }));
  }, [save]);

  const register = useCallback(async (email: string, password: string, name?: string, storeSlug?: string) => {
    save(await apiFetch<{ accessToken: string; user: ShopUser }>("/auth/register", { method: "POST", body: JSON.stringify({ email, password, name, storeSlug }) }));
  }, [save]);

  const logout = useCallback(() => {
    apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("gs_token"); localStorage.removeItem("gs_refresh_token");
    localStorage.removeItem("gs_console_tenant"); setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    // La sesión vive en cookies httpOnly; el refresh rota ambas. Compat: reenvía tokens legacy.
    const legacy = localStorage.getItem("gs_refresh_token");
    const data = await apiFetch<{ accessToken: string; refreshToken?: string; user: ShopUser }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify(legacy ? { refreshToken: legacy } : {}),
    });
    save(data);
  }, [save]);

  return <Ctx.Provider value={{ user, ready, login, register, logout, refresh }}>{children}</Ctx.Provider>;
}
