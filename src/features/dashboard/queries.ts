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
  };

  if (!clubId) return empty;

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const yesterdayStart = startOfDay(
    new Date(now.getTime() - 24 * 60 * 60 * 1000),
  );
  const yesterdayEnd = endOfDay(
    new Date(now.getTime() - 24 * 60 * 60 * 1000),
  );

  const { data: courts, error: courtsError } = await supabase
    .from("courts")
    .select("id, name")
    .eq("club_id", clubId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (courtsError || !courts?.length) return empty;

  const courtIds = courts.map((c) => c.id);
  const courtMap = new Map(courts.map((c) => [c.id, c.name]));
  const totalCourts = courts.length;

  const [todayGamesRes, yesterdayGamesRes, upcomingGamesRes, activeGamesRes] =
    await Promise.all([
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
    ]);

  const todayGames = todayGamesRes.data ?? [];
  const totalBookingsToday = todayGames.length;
  const yesterdayCount = yesterdayGamesRes.count ?? 0;

  const activeCourtIds = new Set(
    (activeGamesRes.data ?? []).map((g) => g.court_id).filter(Boolean),
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
  };
}
