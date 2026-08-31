"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logout } from "@/lib/auth/actions";
import {
  IconBell,
  IconCalendar,
  IconCourts,
  IconDashboard,
  IconHelp,
  IconPlayers,
  IconSearch,
  IconSettings,
} from "@/src/components/dashboard/icons";

type DashboardShellProps = {
  children: React.ReactNode;
  displayName: string;
  roleLabel: string;
  clubName: string | null;
  email: string;
};

const primaryNav = [
  { href: "/dashboard", label: "Dashboard", icon: IconDashboard, match: "exact" as const },
  { href: "/dashboard/courts", label: "Courts", icon: IconCourts, match: "prefix" as const },
  {
    href: "/dashboard/schedule",
    label: "Calendar",
    icon: IconCalendar,
    match: "prefix" as const,
  },
] as const;

function isActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({
  children,
  displayName,
  roleLabel,
  clubName,
  email,
}: DashboardShellProps) {
  const pathname = usePathname();
  const settingsActive =
    pathname === "/dashboard/settings" ||
    pathname.startsWith("/dashboard/settings/");
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="flex flex-col border-b border-border bg-panel lg:min-h-dvh lg:border-r lg:border-b-0">
        <div className="px-5 py-6">
          <p className="font-display text-lg font-semibold tracking-tight text-brand">
            Padel Galaxio
          </p>
          <p className="mt-0.5 text-[10px] font-semibold tracking-[0.18em] text-muted uppercase">
            Club Management
          </p>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {primaryNav.map((item) => {
            const active = isActive(pathname, item.href, item.match);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition ${
                  active
                    ? "bg-brand text-white"
                    : "text-foreground/80 hover:bg-field hover:text-foreground"
                }`}
              >
                <Icon className="shrink-0 opacity-90" />
                {item.label}
              </Link>
            );
          })}

          <span
            title="Coming soon"
            className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap text-muted/70"
          >
            <IconPlayers className="shrink-0" />
            Players
          </span>
        </nav>

        <div className="mt-auto space-y-3 border-t border-border p-3">
          <Link
            href="/dashboard/settings"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              settingsActive
                ? "bg-brand text-white"
                : "text-foreground/80 hover:bg-field hover:text-foreground"
            }`}
          >
            <IconSettings className="shrink-0 opacity-90" />
            Settings
          </Link>

          <div className="flex items-center gap-3 rounded-xl bg-field px-3 py-2.5">
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white"
            >
              {initials || "PG"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {displayName}
              </p>
              <p className="truncate text-xs text-muted">{roleLabel}</p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg px-2 py-1 text-xs font-medium text-muted transition hover:text-brand"
                title={`Sign out (${email})`}
              >
                Out
              </button>
            </form>
          </div>
          {clubName ? (
            <p className="px-1 text-[11px] text-muted lg:hidden">{clubName}</p>
          ) : null}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-border bg-panel px-4 py-3 sm:px-6 lg:px-8">
          <label className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
              <IconSearch />
            </span>
            <input
              type="search"
              disabled
              placeholder="Search players or bookings..."
              className="w-full rounded-xl border-0 bg-field py-2.5 pr-3 pl-10 text-sm text-foreground outline-none placeholder:text-muted disabled:cursor-not-allowed"
              aria-label="Search (coming soon)"
            />
          </label>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              disabled
              className="rounded-xl p-2.5 text-muted transition hover:bg-field disabled:opacity-60"
              aria-label="Notifications (coming soon)"
            >
              <IconBell />
            </button>
            <button
              type="button"
              disabled
              className="rounded-xl p-2.5 text-muted transition hover:bg-field disabled:opacity-60"
              aria-label="Help (coming soon)"
            >
              <IconHelp />
            </button>
            <button
              type="button"
              disabled
              className="ml-1 rounded-xl bg-brand px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap text-white opacity-70 sm:ml-2"
              title="Coming soon"
            >
              + New Booking
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
