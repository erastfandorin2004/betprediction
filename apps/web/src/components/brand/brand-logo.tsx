// betanalyse.pro brand mark — theme-adaptive inline SVG (orange ring + soccer
// ball + ascending bars) and the "betanalyse.pro" wordmark.

export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none" className={className} aria-hidden>
      {/* open orange ring */}
      <circle
        cx="24" cy="24" r="21"
        stroke="rgb(var(--accent))" strokeWidth="3" strokeLinecap="round"
        strokeDasharray="104 132" transform="rotate(140 24 24)"
      />
      {/* ascending bars */}
      <rect x="20" y="30" width="3.6" height="8" rx="1" fill="rgb(var(--accent))" />
      <rect x="25.5" y="25.5" width="3.6" height="12.5" rx="1" fill="rgb(var(--accent))" />
      <rect x="31" y="20.5" width="3.6" height="17.5" rx="1" fill="rgb(var(--accent))" />
      {/* soccer ball */}
      <circle cx="18.5" cy="18.5" r="10" fill="#ffffff" stroke="#0b1220" strokeWidth="1.4" />
      <polygon points="18.5,13.6 22.4,16.5 20.9,21.1 16.1,21.1 14.6,16.5" fill="#0b1220" />
      <path
        d="M18.5 8.6 L18.5 13.6 M9.6 16.5 L14.6 16.5 M27.4 16.5 L22.4 16.5 M16.1 21.1 L13.6 25.6 M20.9 21.1 L23.4 25.6"
        stroke="#0b1220" strokeWidth="1.1" strokeLinecap="round"
      />
    </svg>
  );
}

export function BrandLogo({
  size = 38,
  wordClassName = 'text-2xl',
  className,
}: {
  size?: number;
  wordClassName?: string;
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-2.5 ${className ?? ''}`}>
      <BrandMark size={size} className="shrink-0 drop-shadow-[0_0_10px_rgb(var(--accent)/0.45)]" />
      <span className={`font-extrabold lowercase tracking-tight ${wordClassName}`}>
        <span style={{ color: 'rgb(var(--fg-primary))' }}>betanalyse</span>
        <span style={{ color: 'rgb(var(--accent))' }}>.pro</span>
      </span>
    </span>
  );
}
