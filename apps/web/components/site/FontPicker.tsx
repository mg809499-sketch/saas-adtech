"use client";
import { useState } from "react";
import { FontItem, listFonts, loadFont } from "../../lib/fonts";

// Buscador de fuentes con preview real "Ag" (500 vía API, fallback local).
const FALLBACK = ["Outfit", "Plus Jakarta Sans", "Inter", "Roboto", "Poppins", "Montserrat", "Playfair Display", "DM Sans", "Nunito", "Raleway", "Oswald", "Lora", "Merriweather", "Ubuntu", "Work Sans", "Fira Sans", "Quicksand", "Rubik", "Barlow", "Cabin", "Anton", "Bebas Neue", "Pacifico", "Dancing Script", "Lobster", "Caveat", "Space Grotesk", "Sora", "Manrope", "Archivo", "Bricolage Grotesque", "Clash Display", "General Sans"];

// Las familias de iconos (Material Icons/Symbols) renderizarían tofu:
// se excluyen de la lista para que toda opción cambie visible la letra.
const usable = (items: FontItem[]) => items.filter((f) => !/^material\s/i.test(f.family));

export function FontPicker({ value, onPick }: { value?: string; onPick: (f: string) => void }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<FontItem[]>(usable(FALLBACK.map((family) => ({ family, category: "", variants: [] }))));
  const [open, setOpen] = useState(false);

  const search = (v: string) => {
    setQ(v);
    listFonts(v, 60).then((r) => { if (r.items.length) setItems(usable(r.items)); }).catch(() => {});
  };

  return (
    <div className="relative">
      <button onClick={() => { setOpen(!open); if (!open) search(q); }} className="w-full text-left bg-surface px-3 py-2 rounded-xl text-sm border border-outline-variant/30 truncate">
        {value || "Elegir fuente…"}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto gs-glass-strong rounded-2xl p-2 flex flex-col gap-1">
          <input autoFocus value={q} onChange={(e) => search(e.target.value)} placeholder="Buscar (500)…" className="bg-surface px-3 py-1.5 rounded-lg text-sm border border-outline-variant/30" />
          {items.map((f) => {
            loadFont(f.family);
            return (
              <button key={f.family} onClick={() => { onPick(f.family); setOpen(false); }} className="text-left px-2 py-1.5 rounded-lg hover:bg-white/5 flex items-baseline justify-between gap-2">
                <span style={{ fontFamily: `'${f.family}'` }} className="text-base">Ag {f.family}</span>
                {value === f.family && <span className="text-secondary text-xs font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
