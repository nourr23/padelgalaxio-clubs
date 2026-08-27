export function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-white shadow-sm"
      >
        <svg
          viewBox="0 0 32 32"
          className="size-6"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 8.5c0-.83.67-1.5 1.5-1.5H18c3.59 0 6.5 2.91 6.5 6.5S21.59 20 18 20h-4.5v5.5a1.5 1.5 0 0 1-3 0V8.5Z"
            fill="currentColor"
          />
          <circle cx="22.5" cy="22.5" r="2.25" fill="currentColor" />
        </svg>
      </span>
      <div className="leading-tight">
        <p className="font-display text-lg font-semibold tracking-tight text-brand">
          Padel Galaxio
        </p>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
          Club Management
        </p>
      </div>
    </div>
  );
}
