import { apiFetch } from "./api-client";

export interface FontItem { family: string; category: string; variants: string[] }

const loaded = new Set<string>();

// Carga on-demand la familia vía Google Fonts (solo las usadas).
export function loadFont(family: string) {
  if (!family || loaded.has(family) || typeof document === "undefined") return;
  loaded.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@400;600;800&display=swap`;
  document.head.appendChild(link);
}

export function useFont(family?: string) {
  if (family) loadFont(family);
  // Sin "inherit" en la lista: como keyword CSS-wide solo es válido en
  // solitario y la declaración entera se descartaba (ninguna fuente aplicaba).
  return family ? `'${family}', system-ui, -apple-system, sans-serif` : undefined;
}

export const listFonts = (q = "", limit = 500) =>
  apiFetch<{ total: number; items: FontItem[] }>(`/fonts?q=${encodeURIComponent(q)}&limit=${limit}`);
