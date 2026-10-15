"use client";
import { FluidShader } from "./FluidShader";

// Fondo global: shader fluido WebGL (marca) + rejilla + viñeta.
// En light mode se atenúa con velo claro. Sin WebGL, queda el fondo base.
export function PageShader() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-surface">
      <FluidShader />
      <div
        className="absolute inset-0 opacity-[0.5] dark:opacity-[0.35]"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.14) 1px, transparent 1px)", backgroundSize: "26px 26px" }}
      />
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 10%, transparent 55%, rgba(2,6,18,.55) 100%)" }} />
      <div className="absolute inset-0 bg-white/60 dark:bg-transparent" />
    </div>
  );
}
