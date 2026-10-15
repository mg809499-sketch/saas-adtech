"use client";
import { useEffect, useRef, useState } from "react";

// Titular por letras: cada letra llega con un salto, en cascada.
// El h1 lleva aria-label con el texto completo; las letras son decorativas.
export function JumpLetters({ text, base = 0, step = 35 }: { text: string; base?: number; step?: number }) {
  return (
    <span aria-hidden style={{ whiteSpace: "pre" }}>
      {Array.from(text).map((ch, i) => (
        <span key={i} className="wl-letter" style={{ animationDelay: `${base + i * step}ms` }}>
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </span>
  );
}

// Entradas por sección: suben 24px con stagger, una sola vez.
// Sin JS o con reduced-motion el contenido nace visible (sin flash).
export function Rise({ children, delay = 0, className = "", style }: { children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setArmed(true);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }),
      { threshold: 0.12 },
    );
    io.observe(el);
    const t = setTimeout(() => setOn(true), 4000);
    return () => { io.disconnect(); clearTimeout(t); };
  }, []);
  const hidden = armed && !on;
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: hidden ? 0 : 1,
        transform: hidden ? "translateY(24px)" : "translateY(0)",
        transition: "opacity 600ms ease-out, transform 600ms cubic-bezier(0.23,1,0.32,1)",
        transitionDelay: `${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
