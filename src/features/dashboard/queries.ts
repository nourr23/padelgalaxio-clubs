import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/src/types/database";

export type UpcomingSession = {
  id: string;
  time: string;
  courtName: string;
  playersLabel: string;
  type: string;
  typeVariant: "default" | "training" | "tournament";
  status: "ready" | "pending";
};

export type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  timeLabel: string;
  variant: "success" | "warning" | "info" | "muted";
  timestamp: number;
};

export type DashboardStats = {
  occupancyPercent: number;
  occupancyTrend: number | null;
  openCourts: number;
  totalCourts: number;
  bookedCourts: number;
  totalBookingsToday: number;
  bookingsTrend: number | null;
};

export type DashboardData = {
  stats: DashboardStats;
  upcomingSessions: UpcomingSession[];
  recentActivity: ActivityItem[];
  inactiveCourtCount: number;
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatSessionTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function mapGameStatus(
  status: string | null,
  startsAt: string,
): "ready" | "pending" {
  const now = Date.now();
  const start = new Date(startsAt).getTime();
  if (status === "full" || status === "open") {
    return start <= now + 15 * 60 * 1000 ? "ready" : "pending";
  }
  return "pending";
}

function formatRelativeTime(iso: string, now = Date.now()) {
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const absDiff = Math.abs(diffMs);
  const future = diffMs < 0;

  const minutes = Math.round(absDiff / 60_000);
  if (minutes < 1) return future ? "Soon" : "Just now";
  if (minutes < 60) {
    return future
      ? `In ${minutes} min${minutes !== 1 ? "s" : ""}`
      : `${minutes} min${minutes !== 1 ? "s" : ""} ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return future
      ? `In ${hours} hr${hours !== 1 ? "s" : ""}`
      : `${hours} hr${hours !== 1 ? "s" : ""} ago`;
  }

  const days = Math.round(hours / 24);
  return future
    ? `In ${days} day${days !== 1 ? "s" : ""}`
    : `${days} day${days !== 1 ? "s" : ""} ago`;
}

function buildRecentActivity(
  games: Array<{
    id: string;
    court_id: string | null;
    starts_at: string;
    ends_at: string;
    status: string | null;
  }>,
  courts: Array<{
    id: string;
    name: string;
    is_active: boolean;
    updated_at: string;
  }>,
  courtMap: Map<string, string>,
  now: Date,
): ActivityItem[] {
  const items: ActivityItem[] = [];
  const nowMs = now.getTime();
  const lookbackMs = 7 * 24 * 60 * 60 * 1000;

  for (const game of games) {
    const courtName = courtMap.get(game.court_id ?? "") ?? "Court";
    const startsAt = new Date(game.starts_at).getTime();
    const endsAt = new Date(game.ends_at).getTime();

    if (game.status === "cancelled" && nowMs - startsAt < lookbackMs) {
      items.push({
        id: `cancelled-${game.id}`,
        title: "Booking cancelled",
        detail: `Session on ${courtName}`,
        timeLabel: formatRelativeTime(game.starts_at, nowMs),
        variant: "warning",
        timestamp: startsAt,
      });
      continue;
    }

    if (game.status === "completed" && nowMs - endsAt < lookbackMs) {
      items.push({
        id: `completed-${game.id}`,
        title: "Session completed",
        detail: `${courtName} · ${formatSessionTime(game.starts_at)}`,
        timeLabel: formatRelativeTime(game.ends_at, nowMs),
        variant: "success",
        timestamp: endsAt,
      });
      continue;
    }

    if (
      (game.status === "open" || game.status === "full") &&
      startsAt > nowMs &&
      startsAt - nowMs < 24 * 60 * 60 * 1000
    ) {
      items.push({
        id: `scheduled-${game.id}`,
        title: game.status === "full" ? "Booking confirmed" : "New booking",
        detail: `${courtName} · ${formatSessionTime(game.starts_at)}`,
        timeLabel: formatRelativeTime(game.starts_at, nowMs),
        variant: "success",
        timestamp: startsAt,
      });
      continue;
    }

    if (
      (game.status === "open" || game.status === "full") &&
      startsAt <= nowMs &&
      endsAt > nowMs
    ) {
      items.push({
        id: `active-${game.id}`,
        title: "Session in progress",
        detail: `${courtName} until ${formatSessionTime(game.ends_at)}`,
        timeLabel: "Now",
        variant: "info",
        timestamp: startsAt,
      });
    }
  }

  for (const court of courts) {
    if (court.is_active) continue;
    const updatedAt = new Date(court.updated_at).getTime();
    if (nowMs - updatedAt > lookbackMs) continue;

    items.push({
      id: `court-${court.id}`,
      title: "Court unavailable",
      detail: `${court.name} is marked inactive`,
      timeLabel: formatRelativeTime(court.updated_at, nowMs),
      variant: "warning",
      timestamp: updatedAt,
    });
  }

  return items
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);
}

export async function getDashboardData(
  supabase: SupabaseClient<Database>,
  clubId: string | null,
): Promise<DashboardData> {
  const empty: DashboardData = {
    stats: {
      occupancyPercent: 0,
      occupancyTrend: null,
      openCourts: 0,
      totalCourts: 0,
      bookedCourts: 0,
      totalBookingsToday: 0,
      bookingsTrend: null,
    },
    upcomingSessions: [],
    recentActivity: [],
    inactiveCourtCount: 0,
  };

  if (!clubId) return empty;

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const activitySince = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const activityUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const yesterdayStart = startOfDay(
    new Date(now.getTime() - 24 * 60 * 60 * 1000),
  );
  const yesterdayEnd = endOfDay(
    new Date(now.getTime() - 24 * 60 * 60 * 1000),
  );

  const { data: allCourts, error: courtsError } = await supabase
    .from("courts")
    .select("id, name, is_active, updated_at")
    .eq("club_id", clubId)
    .order("sort_order", { ascending: true });

  if (courtsError || !allCourts?.length) return empty;

  const activeCourts = allCourts.filter((c) => c.is_active);
  const inactiveCourtCount = allCourts.length - activeCourts.length;
  const courtIds = allCourts.map((c) => c.id);
  const courtMap = new Map(allCourts.map((c) => [c.id, c.name]));
  const totalCourts = activeCourts.length;

  const [
    todayGamesRes,
    yesterdayGamesRes,
    upcomingGamesRes,
    activeGamesRes,
    activityGamesRes,
  ] = await Promise.all([
      supabase
        .from("games")
        .select("id, court_id, starts_at, ends_at, status")
        .in("court_id", courtIds)
        .gte("starts_at", todayStart.toISOString())
        .lte("starts_at", todayEnd.toISOString())
        .not("status", "eq", "cancelled"),
      supabase
        .from("games")
        .select("id", { count: "exact", head: true })
        .in("court_id", courtIds)
        .gte("starts_at", yesterdayStart.toISOString())
        .lte("starts_at", yesterdayEnd.toISOString())
        .not("status", "eq", "cancelled"),
      supabase
        .from("games")
        .select("id, court_id, starts_at, ends_at, status")
        .in("court_id", courtIds)
        .gte("starts_at", now.toISOString())
        .lte("starts_at", twoHoursLater.toISOString())
        .not("status", "eq", "cancelled")
        .order("starts_at", { ascending: true })
        .limit(5),
      supabase
        .from("games")
        .select("id, court_id")
        .in("court_id", courtIds)
        .lte("starts_at", now.toISOString())
        .gte("ends_at", now.toISOString())
        .not("status", "eq", "cancelled"),
      supabase
        .from("games")
        .select("id, court_id, starts_at, ends_at, status")
        .in("court_id", courtIds)
        .gte("starts_at", activitySince.toISOString())
        .lte("starts_at", activityUntil.toISOString()),
    ]);

  const todayGames = todayGamesRes.data ?? [];
  const totalBookingsToday = todayGames.length;
  const yesterdayCount = yesterdayGamesRes.count ?? 0;

  const activeCourtIdSet = new Set(activeCourts.map((c) => c.id));
  const activeCourtIds = new Set(
    (activeGamesRes.data ?? [])
      .map((g) => g.court_id)
      .filter((id): id is string => id != null && activeCourtIdSet.has(id)),
  );
  const bookedCourts = activeCourtIds.size;
  const openCourts = Math.max(0, totalCourts - bookedCourts);
  const occupancyPercent =
    totalCourts > 0 ? Math.round((bookedCourts / totalCourts) * 100) : 0;

  const occupancyTrend =
    yesterdayCount > 0
      ? Math.round(
          ((totalBookingsToday - yesterdayCount) / yesterdayCount) * 100,
        )
      : null;

  const bookingsTrend = occupancyTrend;

  const upcomingSessions: UpcomingSession[] = (upcomingGamesRes.data ?? []).map(
    (game) => ({
      id: game.id,
      time: formatSessionTime(game.starts_at),
      courtName: courtMap.get(game.court_id ?? "") ?? "Court",
      playersLabel: "—",
      type: "Doubles",
      typeVariant: "default",
      status: mapGameStatus(game.status, game.starts_at),
    }),
  );

  const recentActivity = buildRecentActivity(
    activityGamesRes.data ?? [],
    allCourts,
    courtMap,
    now,
  );

  return {
    stats: {
      occupancyPercent,
      occupancyTrend,
      openCourts,
      totalCourts,
      bookedCourts,
      totalBookingsToday,
      bookingsTrend,
    },
    upcomingSessions,
    recentActivity,
    inactiveCourtCount,
  };
}
