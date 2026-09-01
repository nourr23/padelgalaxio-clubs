"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logout } from "@/lib/auth/actions";
import { NotificationsBell } from "@/src/components/dashboard/notifications-bell";
import {
  IconCalendar,
  IconCourts,
  IconDashboard,
  IconHelp,
  IconHistory,
  IconSettings,
} from "@/src/components/dashboard/icons";
import type { ClubNotification } from "@/src/features/notifications/queries";

type DashboardShellProps = {
  children: React.ReactNode;
  userId: string;
  displayName: string;
  roleLabel: string;
  clubName: string | null;
  email: string;
  initialNotifications: ClubNotification[];
  initialUnreadCount: number;
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
  {
    href: "/dashboard/history",
    label: "History",
    icon: IconHistory,
    match: "prefix" as const,
  },
] as const;

function isActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({
  children,
  userId,
  displayName,
  roleLabel,
  clubName,
  email,
  initialNotifications,
  initialUnreadCount,
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
      <aside className="flex flex-col bg-brand text-white lg:sticky lg:top-0 lg:h-dvh">
        <div className="px-5 py-6">
          <p className="font-display text-lg font-semibold tracking-tight text-white">
            Padel Galaxio
          </p>
          <p className="mt-0.5 text-[10px] font-semibold tracking-[0.18em] text-white/55 uppercase">
            Club Management
          </p>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0">
          {primaryNav.map((item) => {
            const active = isActive(pathname, item.href, item.match);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition ${
                  active
                    ? "bg-white/12 text-white"
                    : "text-white/70 hover:bg-white/8 hover:text-white"
                }`}
              >
                <Icon className="shrink-0 opacity-90" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto shrink-0 space-y-2 border-t border-white/10 p-3">
          <Link
            href="/dashboard/settings"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              settingsActive
                ? "bg-white/12 text-white"
                : "text-white/70 hover:bg-white/8 hover:text-white"
            }`}
          >
            <IconSettings className="shrink-0 opacity-90" />
            Settings
          </Link>

          <Link
            href="/dashboard/schedule"
            className="flex w-full items-center justify-center rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-brand transition hover:bg-accent/90"
          >
            + New Booking
          </Link>

          <div className="flex items-center gap-3 rounded-xl bg-white/8 px-3 py-2.5">
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-brand"
            >
              {initials || "PG"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {displayName}
              </p>
              <p className="truncate text-xs text-white/55">{roleLabel}</p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg px-2 py-1 text-xs font-medium text-white/55 transition hover:text-white"
                title={`Sign out (${email})`}
              >
                Out
              </button>
            </form>
          </div>
          {clubName ? (
            <p className="px-1 text-[11px] text-white/45 lg:hidden">{clubName}</p>
          ) : null}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-end gap-1 border-b border-border bg-panel px-4 py-3 sm:gap-2 sm:px-6 lg:px-8">
          <NotificationsBell
            userId={userId}
            initialNotifications={initialNotifications}
            initialUnreadCount={initialUnreadCount}
          />
          <button
            type="button"
            disabled
            className="rounded-xl p-2.5 text-muted transition hover:bg-field disabled:opacity-60"
            aria-label="Help (coming soon)"
          >
            <IconHelp />
          </button>
          <span
            aria-hidden
            className="ml-1 flex size-9 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white sm:ml-2"
            title={displayName}
          >
            {initials || "PG"}
          </span>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
