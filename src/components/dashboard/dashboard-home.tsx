import Image from "next/image";
import Link from "next/link";

import type {
  ActivityItem,
  DashboardStats,
  UpcomingSession,
} from "@/src/features/dashboard/queries";
import type { WeatherInfo } from "@/src/features/dashboard/weather";

type DashboardHomeProps = {
  displayName: string;
  clubName: string | null;
  clubCity: string | null;
  stats: DashboardStats;
  upcomingSessions: UpcomingSession[];
  weather: WeatherInfo;
  recentActivity: ActivityItem[];
  inactiveCourtCount: number;
  isLive?: boolean;
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

function firstName(name: string) {
  return name.split(/\s+/)[0] ?? name;
}

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "live" | "active" | "trending";
}) {
  const styles = {
    default: "bg-field text-muted",
    live: "bg-accent/20 text-brand-soft",
    active: "bg-field text-muted",
    trending: "bg-accent/20 text-brand-soft",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${styles[variant]}`}
    >
      {children}
    </span>
  );
}

function MetricCard({
  badge,
  badgeVariant,
  label,
  value,
  subtext,
  children,
}: {
  badge: string;
  badgeVariant?: "default" | "live" | "active" | "trending";
  label: string;
  value: string;
  subtext?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Badge variant={badgeVariant}>{badge}</Badge>
      </div>
      <p className="mt-4 text-[11px] font-semibold tracking-wider text-muted uppercase">
        {label}
      </p>
      <p className="mt-1 font-display text-4xl font-semibold tracking-tight text-brand">
        {value}
      </p>
      {subtext ? <div className="mt-1 text-sm">{subtext}</div> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

function OccupancyBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-field">
      <div
        className="h-full rounded-full bg-accent transition-all"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

function CourtDots({ total, booked }: { total: number; booked: number }) {
  const dots = Math.min(total, 12);
  const filled = Math.min(booked, dots);
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: dots }).map((_, i) => (
        <span
          key={i}
          className={`size-2.5 rounded-full ${i < filled ? "bg-brand" : "bg-border"}`}
        />
      ))}
    </div>
  );
}

function MiniBarChart() {
  const heights = [40, 55, 45, 70, 85];
  return (
    <div className="flex items-end gap-1.5">
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-2 rounded-sm bg-accent"
          style={{ height: `${h}%`, minHeight: 8, maxHeight: 32 }}
        />
      ))}
    </div>
  );
}

function TypePill({
  type,
  variant,
}: {
  type: string;
  variant: UpcomingSession["typeVariant"];
}) {
  const styles = {
    default: "bg-field text-foreground/70",
    training: "bg-brand-soft/15 text-brand-soft",
    tournament: "bg-accent/30 text-brand",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}
    >
      {type}
    </span>
  );
}

function StatusDot({ status }: { status: "ready" | "pending" }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/80">
      <span
        className={`size-2 rounded-full ${status === "ready" ? "bg-accent" : "bg-border"}`}
      />
      {status === "ready" ? "Ready" : "Pending"}
    </span>
  );
}

export function DashboardHome({
  displayName,
  clubName,
  clubCity,
  stats,
  upcomingSessions,
  weather,
  recentActivity,
  inactiveCourtCount,
  isLive = false,
}: DashboardHomeProps) {
  const greeting = getGreeting();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero */}
      <section className="relative min-h-[160px] overflow-hidden rounded-3xl sm:min-h-[200px]">
        <Image
          src="/login-bg.png"
          alt=""
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 1152px"
        />
        <div className="absolute inset-0 bg-linear-to-r from-brand-deep/90 via-brand/75 to-brand/40" />
        <div className="relative px-6 py-10 sm:px-8 sm:py-14">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {greeting} Overview
          </h1>
          <p className="mt-2 max-w-lg text-[15px] text-white/85">
            Welcome back, {firstName(displayName)}.
            {clubName
              ? ` ${clubName} is running smoothly today.`
              : " Your club dashboard is ready."}
          </p>
        </div>
      </section>

      {/* Metrics */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          badge={isLive ? "Live" : "Syncing"}
          badgeVariant="live"
          label="Today's Occupancy"
          value={`${stats.occupancyPercent}%`}
          subtext={
            stats.occupancyTrend != null ? (
              <span
                className={
                  stats.occupancyTrend >= 0 ? "text-accent" : "text-muted"
                }
              >
                {stats.occupancyTrend >= 0 ? "+" : ""}
                {stats.occupancyTrend}% from yesterday
              </span>
            ) : (
              <span className="text-muted">No comparison data yet</span>
            )
          }
        >
          <OccupancyBar percent={stats.occupancyPercent} />
        </MetricCard>

        <MetricCard
          badge="Active now"
          badgeVariant="active"
          label="Open Courts"
          value={
            stats.totalCourts > 0
              ? `${stats.openCourts}/${stats.totalCourts}`
              : "—"
          }
          subtext={
            <span className="text-muted">
              {stats.bookedCourts} court{stats.bookedCourts !== 1 ? "s" : ""}{" "}
              booked
            </span>
          }
        >
          {stats.totalCourts > 0 ? (
            <CourtDots total={stats.totalCourts} booked={stats.bookedCourts} />
          ) : null}
        </MetricCard>

        <MetricCard
          badge="Trending up"
          badgeVariant="trending"
          label="Total Bookings"
          value={String(stats.totalBookingsToday)}
          subtext={
            stats.bookingsTrend != null ? (
              <span className="text-accent">
                {stats.bookingsTrend >= 0 ? "+" : ""}
                {stats.bookingsTrend}% trend
              </span>
            ) : (
              <span className="text-muted">Today&apos;s sessions</span>
            )
          }
        >
          <MiniBarChart />
        </MetricCard>
      </section>

      {/* Sessions + sidebar widgets */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Upcoming sessions */}
        <div className="rounded-2xl border border-border bg-panel shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-brand">
                Next 5 Sessions
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                Upcoming court activity for the next 2 hours
              </p>
            </div>
            <Link
              href="/dashboard/schedule"
              className="shrink-0 text-sm font-semibold text-brand transition hover:text-brand-soft"
            >
              View All
            </Link>
          </div>

          {upcomingSessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] font-semibold tracking-wider text-muted uppercase">
                    <th className="px-5 py-3 font-semibold">Time</th>
                    <th className="px-3 py-3 font-semibold">Court</th>
                    <th className="px-3 py-3 font-semibold">Players</th>
                    <th className="px-3 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingSessions.map((session) => (
                    <tr
                      key={session.id}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="px-5 py-3.5 font-medium text-foreground">
                        {session.time}
                      </td>
                      <td className="px-3 py-3.5 text-foreground/80">
                        {session.courtName}
                      </td>
                      <td className="px-3 py-3.5 text-muted">
                        {session.playersLabel}
                      </td>
                      <td className="px-3 py-3.5">
                        <TypePill
                          type={session.type}
                          variant={session.typeVariant}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusDot status={session.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-medium text-foreground/80">
                No upcoming sessions
              </p>
              <p className="mt-1 text-sm text-muted">
                Sessions in the next 2 hours will appear here.
              </p>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
            <h2 className="font-display text-lg font-semibold text-brand">
              Quick Actions
            </h2>
            <div className="mt-4 space-y-2.5">
              <Link
                href="/dashboard/schedule"
                className="flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-deep"
              >
                + New Booking
              </Link>
              <button
                type="button"
                disabled
                title="Coming soon"
                className="w-full rounded-xl bg-field px-4 py-3 text-sm font-semibold text-foreground/80 opacity-70"
              >
                Block Court
              </button>
              <Link
                href="/dashboard/promote"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-panel px-4 py-3 text-sm font-semibold text-brand transition hover:bg-field"
              >
                <MailIcon />
                Promote availability
              </Link>
            </div>
          </div>

          {/* Weather & maintenance */}
          <div className="rounded-2xl bg-brand p-5 text-white shadow-sm">
            {weather ? (
              <>
                <div className="flex items-center gap-2">
                  <WeatherIcon condition={weather.condition} />
                  <span className="text-2xl font-semibold">
                    {weather.temperatureC}°C
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-white/90">
                  {weather.description}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <SunIcon />
                  <span className="text-lg font-semibold">Weather unavailable</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-white/90">
                  {clubCity
                    ? "Could not load weather for your club location right now."
                    : "Add your club city in Settings to see local weather."}
                </p>
              </>
            )}
            {inactiveCourtCount > 0 ? (
              <Link
                href="/dashboard/courts"
                className="mt-3 inline-block text-sm font-medium text-white/90 underline underline-offset-2 transition hover:text-white"
              >
                {inactiveCourtCount} court{inactiveCourtCount !== 1 ? "s" : ""}{" "}
                need attention
              </Link>
            ) : (
              <Link
                href="/dashboard/courts"
                className="mt-3 inline-block text-sm font-medium text-white/80 underline underline-offset-2 transition hover:text-white"
              >
                Manage courts
              </Link>
            )}
          </div>

          {/* Latest activity */}
          <div className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
            <h2 className="text-[11px] font-bold tracking-wider text-muted uppercase">
              Latest Activity
            </h2>
            {recentActivity.length > 0 ? (
              <ul className="mt-4 space-y-4">
                {recentActivity.map((item) => (
                  <ActivityItem key={item.id} item={item} />
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted">
                No recent bookings or court updates yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function ActivityItem({ item }: { item: ActivityItem }) {
  const dotColor = {
    success: "bg-accent",
    warning: "bg-amber-400",
    info: "bg-sky-400",
    muted: "bg-border",
  }[item.variant];

  return (
    <li className="flex gap-3">
      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${dotColor}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{item.title}</p>
        <p className="text-xs text-muted">{item.detail}</p>
      </div>
      <span className="shrink-0 text-[10px] font-semibold tracking-wider text-muted uppercase">
        {item.timeLabel}
      </span>
    </li>
  );
}

function WeatherIcon({
  condition,
}: {
  condition: NonNullable<WeatherInfo>["condition"];
}) {
  if (condition === "rain" || condition === "storm") {
    return <RainIcon />;
  }
  if (condition === "cloudy" || condition === "fog") {
    return <CloudIcon />;
  }
  return <SunIcon />;
}

function SunIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M7 18h10a4 4 0 0 0 0-8 5 5 0 0 0-9.5-1.5A3.5 3.5 0 0 0 7 18Z" />
    </svg>
  );
}

function RainIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M7 15h10a4 4 0 0 0 0-8 5 5 0 0 0-9.5-1.5A3.5 3.5 0 0 0 7 15Z" />
      <path d="M9 19v2M12 18v3M15 19v2" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
