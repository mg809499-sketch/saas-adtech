export function GrowupLogo({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center overflow-hidden rounded-xl ${className}`} style={{ width: size, height: size }} aria-label="GrowUp Store">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/growup-logo.svg" alt="GrowUp Store" width={size} height={size} style={{ width: "100%", height: "100%" }} />
    </span>
  );
}
