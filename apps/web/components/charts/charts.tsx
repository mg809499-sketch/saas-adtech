"use client";
import { useEffect, useState } from "react";

// Ola multicanal del brand: ventas Bold (área verde) + tráfico Meta (línea punteada) + pulso.
export function SalesWave({ id = "wave" }: { id?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(t); }, []);
  const dash = (len: number) => ({ strokeDasharray: len, strokeDashoffset: on ? 0 : len, transition: "stroke-dashoffset 1.8s ease-out" });
  return (
    <svg className="w-full h-44 overflow-visible" preserveAspectRatio="none" viewBox="0 0 650 200">
      <defs>
        <linearGradient id={`${id}-bold`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4edea3" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4edea3" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-meta`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#8083ff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#8083ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[40, 90, 140].map((y) => <line key={y} x1="0" x2="650" y1={y} y2={y} stroke="rgba(255,255,255,.09)" strokeDasharray="4 4" />)}
      <path d="M0,140 Q75,110 150,120 T300,70 T450,40 T600,10 L600,200 L0,200 Z" fill={`url(#${id}-bold)`} className={`transition-opacity duration-1000 ${on ? "opacity-100" : "opacity-0"}`} />
      <path d="M0,140 Q75,110 150,120 T300,70 T450,40 T600,10" fill="none" stroke="#5ff0b0" strokeWidth="3" strokeLinecap="round" pathLength={1000} style={{ ...dash(1000), filter: "drop-shadow(0 0 6px rgba(78,222,163,.7))" }} />
      <path d="M0,150 Q80,130 160,110 T320,85 T480,50 T600,25 L600,200 L0,200 Z" fill={`url(#${id}-meta)`} className={`transition-opacity duration-1000 ${on ? "opacity-100" : "opacity-0"}`} />
      <path d="M0,150 Q80,130 160,110 T320,85 T480,50 T600,25" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeDasharray="6 5" pathLength={1000} style={{ ...dash(1000), transitionDelay: "0.25s", filter: "drop-shadow(0 0 5px rgba(128,131,255,.8))" }} />
      <g style={{ opacity: on ? 1 : 0, transition: "opacity 0.6s 1.4s" }}>
        <circle cx="450" cy="40" r="9" fill="#4edea3" opacity="0.35"><animate attributeName="r" values="6;12;6" dur="2s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" /></circle>
        <circle cx="450" cy="40" r="5" fill="#fff" />
      </g>
    </svg>
  );
}

// Barras de horas pico con pico destacado.
export function PeakBars({ data }: { data: { label: string; value: number; peak?: boolean }[] }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(t); }, []);
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="flex items-end justify-between gap-2 h-44">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
          <div className={`w-full rounded-t-xl transition-all duration-700 ease-out ${d.peak ? "bg-gradient-to-t from-secondary/70 to-emerald-200 shadow-[0_0_14px_rgba(78,222,163,0.55)]" : "bg-gradient-to-t from-white/25 to-white/10 group-hover:from-primary/60 group-hover:to-primary/20"}`}
            style={{ height: on ? `${Math.max(8, (d.value / max) * 100)}%` : "6%" }} title={`${d.label}: ${d.value}`} />
          <span className={`text-[10px] font-bold ${d.peak ? "text-secondary" : "text-outline"}`}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// Mini sparkline.
export function Sparkline({ data, color = "#4edea3", height = 32 }: { data: number[]; color?: string; height?: number }) {
  const max = Math.max(...data); const min = Math.min(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${height - 4 - ((v - min) / (max - min || 1)) * (height - 10)}`).join(" ");
  return (
    <svg className="w-full overflow-visible" style={{ height }} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
      <polygon points={`0,${height} ${pts} 100,${height}`} fill={color} opacity="0.22" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
    </svg>
  );
}

// Dona de aprobación con animación.
export function Donut({ pct, size = 120, label }: { pct: number; size?: number; label?: string }) {
  const [p, setP] = useState(0);
  useEffect(() => { const t = requestAnimationFrame(() => setP(pct)); return () => cancelAnimationFrame(t); }, [pct]);
  const r = 44; const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox="0 0 110 110">
        <defs>
          <linearGradient id="gs-donut-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6ffbbe" />
            <stop offset="100%" stopColor="#00a572" />
          </linearGradient>
        </defs>
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="11" />
        <circle cx="55" cy="55" r={r} fill="none" stroke="url(#gs-donut-grad)" strokeWidth="11" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * p) / 100} transform="rotate(-90 55 55)"
          style={{ transition: "stroke-dashoffset 1.4s ease-out", filter: "drop-shadow(0 0 6px rgba(78,222,163,.7))" }} />
        <text x="55" y="60" textAnchor="middle" className="fill-current font-black" fontSize="21">{p.toFixed(1)}%</text>
      </svg>
      {label && <span className="text-xs text-outline font-bold uppercase">{label}</span>}
    </div>
  );
}
