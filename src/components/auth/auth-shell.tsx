import Image from "next/image";
import { BrandMark } from "@/src/components/auth/brand-mark";

type AuthShellProps = {
  children: React.ReactNode;
  headline?: string;
  subcopy?: string;
};

export function AuthShell({
  children,
  headline = "Precision in Every Swing.",
  subcopy = "Empowering club owners with the elite tools needed to manage courts, players, and premium hospitality without friction.",
}: AuthShellProps) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(380px,440px)] xl:grid-cols-[minmax(0,1.35fr)_minmax(400px,480px)]">
      <aside className="relative hidden overflow-hidden bg-brand-deep lg:block">
        <Image
          src="/login-bg.png"
          alt="Players on an outdoor padel court at a luxury club"
          fill
          priority
          sizes="(min-width: 1024px) 65vw, 100vw"
          className="auth-kenburns object-cover object-[center_35%]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-brand-deep/80 via-brand-deep/15 to-transparent"
        />
        <div className="auth-fade-in absolute inset-x-0 bottom-0 max-w-xl p-10 xl:p-14">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-white xl:text-5xl">
            {headline}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/85 xl:text-lg">
            {subcopy}
          </p>
        </div>
      </aside>

      <section className="relative flex min-h-dvh flex-col bg-panel px-6 py-8 sm:px-10 lg:px-12">
        <div className="relative mb-8 overflow-hidden rounded-2xl lg:hidden">
          <div className="relative h-44 sm:h-52">
            <Image
              src="/login-bg.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-[center_30%]"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-brand-deep/70 to-transparent"
            />
            <p className="absolute bottom-4 left-4 right-4 font-display text-2xl font-semibold tracking-tight text-white">
              {headline}
            </p>
          </div>
        </div>

        <header className="auth-fade-up">
          <BrandMark />
        </header>

        <div className="auth-fade-up-delay mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8 lg:py-10">
          {children}
        </div>

        <footer className="mt-auto flex items-center justify-between border-t border-border pt-6 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
          <p>© {new Date().getFullYear()} Padel Galaxio</p>
          <div className="flex gap-4">
            <a href="#" className="transition-colors hover:text-brand">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-brand">
              Terms
            </a>
          </div>
        </footer>
      </section>
    </div>
  );
}
