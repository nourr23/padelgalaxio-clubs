import Link from "next/link";

import type {
  BookingHistoryRow,
  HistoryData,
  OccupancyTrendPoint,
} from "@/src/features/history/queries";

type HistoryViewProps = {
  data: HistoryData;
};

export function HistoryView({ data }: HistoryViewProps) {
  const { stats, occupancyTrend, bookings } = data;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
          <Link href="/dashboard" className="transition hover:text-brand">
            Dashboard
          </Link>
          <span className="mx-2 text-muted/50">&gt;</span>
          <span className="text-foreground/70">History &amp; Statistics</span>
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-brand sm:text-4xl">
          History &amp; Statistics
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Monthly Revenue"
          value="—"
          trend={null}
          subtext="Payments coming soon"
          icon={<RevenueIcon />}
        />
        <MetricCard
          label="Avg. Occupancy"
          value={`${stats.avgOccupancyPercent}%`}
          trend={stats.occupancyTrend}
          icon={<OccupancyIcon />}
        />
        <MetricCard
          label="Top Court"
          value={stats.topCourtName ?? "—"}
          subtext={stats.topCourtSubtitle ?? "No bookings yet"}
          icon={<TrophyIcon />}
        />
        <MetricCard
          label="Total Bookings"
          value={String(stats.totalBookingsThisMonth)}
          subtext="This month"
          icon={<BookingsIcon />}
        />
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-panel p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-brand">
            Occupancy Trends
          </h2>
          <span className="rounded-lg bg-field px-3 py-1.5 text-xs font-semibold text-muted">
            Last 30 Days
          </span>
        </div>
        <OccupancyChart points={occupancyTrend} />
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-panel p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-brand">
            Booking History
          </h2>
          <Link
            href="/dashboard/schedule"
            className="text-sm font-semibold text-brand transition hover:text-brand-deep"
          >
            View calendar
          </Link>
        </div>

        {bookings.length > 0 ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold tracking-wider text-muted uppercase">
                  <th className="pb-3 pr-4 font-semibold">Date &amp; Time</th>
                  <th className="pb-3 pr-4 font-semibold">Court</th>
                  <th className="pb-3 pr-4 font-semibold">Player</th>
                  <th className="pb-3 pr-4 font-semibold">Duration</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bookings.map((booking) => (
                  <BookingRow key={booking.id} booking={booking} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted">
            No bookings recorded yet for this club.
          </p>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  trend,
  subtext,
  icon,
}: {
  label: string;
  value: string;
  trend?: number | null;
  subtext?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-brand">
            {value}
          </p>
          {trend != null ? (
            <p
              className={`mt-1 text-xs font-semibold ${
                trend >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {trend >= 0 ? "+" : ""}
              {trend}%
            </p>
          ) : subtext ? (
            <p className="mt-1 text-xs text-muted">{subtext}</p>
          ) : null}
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-field text-brand">
          {icon}
        </div>
      </div>
    </div>
  );
}

function BookingRow({ booking }: { booking: BookingHistoryRow }) {
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(booking.startsAt));

  const toneStyles = {
    success: "bg-emerald-50 text-emerald-700",
    danger: "bg-red-50 text-red-700",
    neutral: "bg-field text-muted",
    info: "bg-brand/10 text-brand-soft",
  };

  return (
    <tr className="group">
      <td className="py-3.5 pr-4">
        <Link
          href={`/dashboard/schedule/${booking.id}`}
          className="font-medium text-foreground transition group-hover:text-brand"
        >
          {dateLabel}
        </Link>
      </td>
      <td className="py-3.5 pr-4 text-muted">{booking.courtName}</td>
      <td className="py-3.5 pr-4 font-medium text-foreground">
        {booking.playerName}
      </td>
      <td className="py-3.5 pr-4 text-muted">{booking.durationMinutes} min</td>
      <td className="py-3.5">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${toneStyles[booking.statusTone]}`}
        >
          {booking.statusLabel}
        </span>
      </td>
    </tr>
  );
}

function OccupancyChart({ points }: { points: OccupancyTrendPoint[] }) {
  if (!points.length) {
    return (
      <p className="mt-8 text-sm text-muted">No occupancy data for this period.</p>
    );
  }

  const width = 900;
  const height = 260;
  const padding = { top: 20, right: 16, bottom: 36, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const coords = points.map((point, index) => {
    const x =
      padding.left +
      (index / Math.max(points.length - 1, 1)) * chartWidth;
    const y =
      padding.top + chartHeight - (point.percent / 100) * chartHeight;
    return { x, y, point };
  });

  const linePath = coords
    .map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x} ${coord.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${coords[coords.length - 1]?.x ?? padding.left} ${
    padding.top + chartHeight
  } L ${coords[0]?.x ?? padding.left} ${padding.top + chartHeight} Z`;

  const yTicks = [0, 25, 50, 75, 100];
  const xLabelIndexes = [0, 6, 13, 20, 29].filter(
    (index) => index < points.length,
  );

  return (
    <div className="mt-6 overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[720px] w-full"
        role="img"
        aria-label="Occupancy trend over the last 30 days"
      >
        {yTicks.map((tick) => {
          const y = padding.top + chartHeight - (tick / 100) * chartHeight;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#e5e7eb"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-muted text-[11px]"
              >
                {tick}%
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="rgba(157, 207, 125, 0.18)" />
        <path
          d={linePath}
          fill="none"
          stroke="#05261b"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {coords.map(({ x, y, point }) => (
          <circle
            key={point.ymd}
            cx={x}
            cy={y}
            r="3"
            fill="#05261b"
            className="opacity-0 transition hover:opacity-100"
          />
        ))}

        {xLabelIndexes.map((index) => {
          const coord = coords[index];
          if (!coord) return null;
          return (
            <text
              key={points[index]?.ymd ?? index}
              x={coord.x}
              y={height - 10}
              textAnchor="middle"
              className="fill-muted text-[11px]"
            >
              {points[index]?.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function RevenueIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function OccupancyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 19V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 15l3-4 3 2 4-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 4H4v1a3 3 0 0 0 3 3M18 4h2v1a3 3 0 0 1-3 3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 11v3M9 20h6M10 14h4v3H10v-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function BookingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
