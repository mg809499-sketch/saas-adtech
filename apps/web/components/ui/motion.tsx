"use client";
import { useEffect, useRef, useState } from "react";

// Reveal on scroll: fade + rise una sola vez (solo transform+opacity, GPU).
export function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ transitionDelay: `${Math.min(delay, 240)}ms` }} data-hidden={!seen}
      className={`gs-reveal ${className}`}>
      {children}
    </div>
  );
}

// Número animado 0 → value (arranca al entrar en viewport, respeta reduced-motion).
export function CountUp({ value, decimals = 0, prefix = "", suffix = "", duration = 1100 }: { value: number; decimals?: number; prefix?: string; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(value); return; }
    let raf = 0; let started = false;
    const start = () => {
      if (started) return; started = true;
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        setN(value * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { start(); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, duration]);
  return <span ref={ref} className="tabular">{prefix}{n.toLocaleString("es-CO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

// Barra de progreso animada (solo transform scaleX, sin layout).
export function ProgressBar({ pct, color = "bg-secondary", track = "bg-white/10" }: { pct: number; color?: string; track?: string }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = requestAnimationFrame(() => setW(Math.max(0, Math.min(100, pct)))); return () => cancelAnimationFrame(t); }, [pct]);
  return (
    <div className={`w-full h-2 rounded-full overflow-hidden ${track}`}>
      <div className={`h-full w-full rounded-full origin-left transition-transform duration-1000 ease-out ${color}`} style={{ transform: `scaleX(${w / 100})` }} />
    </div>
  );
}

// Título con entrada palabra por palabra (rápida, legible, una sola vez).
export function BounceTitle({ segments, stagger = 0.06, className = "" }: {
  segments: { text: string; gradient?: boolean }[];
  stagger?: number;
  className?: string;
}) {
  const full = segments.map((s) => s.text).join("");
  let i = 0;
  return (
    <span className={className}>
      <span className="sr-only">{full}</span>
      <span aria-hidden>
        {segments.map((seg, si) => (
          <span key={si} className={seg.gradient ? "text-white" : undefined}>
            {seg.text.split(/(\s+)/).map((part, pi) =>
              /^\s+$/.test(part) ? (
                <span key={pi}>{part}</span>
              ) : (
                <span key={pi} className="gs-word">
                  <span className="gs-letter" style={{ animationDelay: `${(i++ * stagger).toFixed(3)}s` }}>{part}</span>
                </span>
              ),
            )}
          </span>
        ))}
      </span>
    </span>
  );
}

// Zona con tilt delegado: cualquier hijo con .gs-tilt rota hacia el cursor.
// Evita un listener por tarjeta; solo transform/opacity (sin reflow).
export function TiltZone({ children, className = "", max = 6 }: { children: React.ReactNode; className?: string; max?: number }) {
  const cur = useRef<HTMLElement | null>(null);
  const move = (e: React.MouseEvent) => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = (e.target as HTMLElement).closest?.(".gs-tilt") as HTMLElement | null;
    if (cur.current && cur.current !== t) cur.current.style.transform = "";
    cur.current = t;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    t.style.transform = `rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translate3d(${(px * 10).toFixed(1)}px, ${(py * 10).toFixed(1)}px, 0)`;
    t.style.setProperty("--mx", `${((px + 0.5) * 100).toFixed(1)}%`);
    t.style.setProperty("--my", `${((py + 0.5) * 100).toFixed(1)}%`);
  };
  const leave = () => {
    if (cur.current) { cur.current.style.transform = ""; cur.current = null; }
  };
  return (
    <div onMouseMove={move} onMouseLeave={leave} style={{ perspective: "900px" }} className={className}>
      {children}
    </div>
  );
}
