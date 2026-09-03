import Image from "next/image";

export function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/main-app-logo.png"
        alt="Padel Galaxio"
        width={44}
        height={44}
        className="size-11 shrink-0 rounded-xl object-contain"
        priority
      />
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
