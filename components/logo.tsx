export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0176d3" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="#fff" strokeWidth="2.5" />
      <path d="M16 7v18M10 16h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".55" />
      <path d="M19.5 12.5l-2 5.5-5.5 2 2-5.5z" fill="#fff" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-tight text-ink">
        Meridian <span className="font-normal text-muted">CRM</span>
      </span>
    </span>
  );
}
