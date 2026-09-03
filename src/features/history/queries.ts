import type { SupabaseClient } from "@supabase/supabase-js";

import {
  addMonths,
  formatMonthYear,
  getDaySlotStartsForClub,
  rangesOverlap,
  slotBounds,
  toMonthKey,
  toYmd,
  type SlotDef,
} from "@/src/features/schedule/slots";
import type { Club, Database, GameStatus } from "@/src/types/database";

export type HistoryStats = {
  avgOccupancyPercent: number;
  prevAvgOccupancyPercent: number | null;
  occupancyChangePoints: number | null;
  topCourtName: string | null;
  topCourtSubtitle: string | null;
  totalBookings: number;
};

export type OccupancyTrendPoint = {
  ymd: string;
  label: string;
  percent: number;
};

export type BookingHistoryRow = {
  id: string;
  startsAt: string;
  courtName: string;
  playerName: string;
  durationMinutes: number;
  statusLabel: string;
  statusTone: "success" | "danger" | "neutral" | "info";
};

export type HistoryData = {
  monthKey: string;
  monthLabel: string;
  prevMonthKey: string | null;
  nextMonthKey: string | null;
  stats: HistoryStats;
  occupancyTrend: OccupancyTrendPoint[];
  bookings: BookingHistoryRow[];
};

type RawCourt = {
  id: string;
  name: string;
  is_active: boolean;
  environment: string | null;
};

type RawGame = {
  id: string;
  court_id: string | null;
  created_by_user_id: string | null;
  starts_at: string;
  ends_at: string;
  status: GameStatus | null;
};

type RawGamePlayer = {
  game_id: string;
  user_id: string;
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function parseMonthKey(monthKey: string | undefined) {
  if (!monthKey) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 0 || month > 11) {
    return null;
  }
  return { year, month };
}

function resolveSelectedMonth(monthKey?: string) {
  const now = new Date();
  const parsed = parseMonthKey(monthKey);
  if (!parsed) {
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
    };
  }
  return parsed;
}

function monthNavigationKeys(year: number, month: number) {
  const now = new Date();
  const currentKey = toMonthKey(now.getFullYear(), now.getMonth());
  const selectedKey = toMonthKey(year, month);
  const prev = addMonths(year, month, -1);
  const next = addMonths(year, month, 1);
  const nextKey = toMonthKey(next.year, next.month);

  return {
    monthKey: selectedKey,
    monthLabel: formatMonthYear(year, month),
    prevMonthKey: toMonthKey(prev.year, prev.month),
    nextMonthKey: nextKey <= currentKey ? nextKey : null,
  };
}

function daysInMonth(year: number, month: number) {
  const days: string[] = [];
  const cursor = new Date(year, month, 1);
  const end = endOfMonth(cursor);
  while (cursor <= end) {
    days.push(toYmd(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function getChartLabelIndexes(dayCount: number) {
  if (dayCount <= 1) return [0];
  const indexes = new Set([0, dayCount - 1]);
  const step = Math.max(1, Math.round(dayCount / 5));
  for (let index = step; index < dayCount - 1; index += step) {
    indexes.add(index);
  }
  return [...indexes].sort((a, b) => a - b);
}

function computeDayOccupancy(
  games: RawGame[],
  courts: RawCourt[],
  slots: SlotDef[],
  ymd: string,
) {
  const activeCourts = courts.filter((court) => court.is_active);
  if (!activeCourts.length || !slots.length) return 0;

  let bookedCells = 0;
  let totalCells = 0;

  for (const court of activeCourts) {
    const courtGames = games.filter((game) => game.court_id === court.id);
    for (const slot of slots) {
      totalCells += 1;
      const { start, end } = slotBounds(ymd, slot);
      const hasGame = courtGames.some((game) => {
        const gameStart = new Date(game.starts_at);
        const gameEnd = new Date(game.ends_at);
        return rangesOverlap(gameStart, gameEnd, start, end);
      });
      if (hasGame) bookedCells += 1;
    }
  }

  return totalCells > 0 ? Math.round((bookedCells / totalCells) * 100) : 0;
}

function formatChartLabel(ymd: string) {
  const date = new Date(`${ymd}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function durationMinutes(startsAt: string, endsAt: string) {
  const diff = new Date(endsAt).getTime() - new Date(startsAt).getTime();
  return Math.max(0, Math.round(diff / 60_000));
}

function resolveBookingStatus(
  status: GameStatus | null,
  startsAt: string,
  endsAt: string,
  now: Date,
): { label: string; tone: BookingHistoryRow["statusTone"] } {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const nowMs = now.getTime();

  if (status === "cancelled") {
    return { label: "Cancelled", tone: "danger" };
  }
  if (status === "completed" || end <= nowMs) {
    return { label: "Completed", tone: "success" };
  }
  if (start <= nowMs && end > nowMs) {
    return { label: "In progress", tone: "info" };
  }
  if (status === "full") {
    return { label: "Full", tone: "neutral" };
  }
  return { label: "Upcoming", tone: "neutral" };
}

function resolveBookingPlayerName(
  game: RawGame,
  players: RawGamePlayer[],
  profileNames: Map<string, string>,
) {
  if (game.created_by_user_id) {
    const hostName = profileNames.get(game.created_by_user_id)?.trim();
    if (hostName) return hostName;
  }

  for (const player of players) {
    const name = profileNames.get(player.user_id)?.trim();
    if (name) return name;
  }

  return "Booked";
}

export async function getHistoryData(
  supabase: SupabaseClient<Database>,
  club: Club,
  monthKey?: string,
): Promise<HistoryData> {
  const now = new Date();
  const { year, month } = resolveSelectedMonth(monthKey);
  const navigation = monthNavigationKeys(year, month);
  const empty: HistoryData = {
    ...navigation,
    stats: {
      avgOccupancyPercent: 0,
      prevAvgOccupancyPercent: null,
      occupancyChangePoints: null,
      topCourtName: null,
      topCourtSubtitle: null,
      totalBookings: 0,
    },
    occupancyTrend: [],
    bookings: [],
  };

  const { data: courtsData } = await supabase
    .from("courts")
    .select("id, name, is_active, environment")
    .eq("club_id", club.id)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  const courts = (courtsData ?? []) as RawCourt[];
  if (!courts.length) return empty;

  const courtIds = courts.map((court) => court.id);
  const courtMap = new Map(courts.map((court) => [court.id, court]));
  const slots = getDaySlotStartsForClub(club);
  const monthStart = startOfMonth(new Date(year, month, 1));
  const monthEnd = endOfMonth(new Date(year, month, 1));
  const prevMonthDate = addMonths(year, month, -1);
  const prevMonthStart = startOfMonth(
    new Date(prevMonthDate.year, prevMonthDate.month, 1),
  );
  const prevMonthEnd = endOfMonth(
    new Date(prevMonthDate.year, prevMonthDate.month, 1),
  );

  const [monthGamesRes, prevMonthGamesRes, monthBookingsRes] =
    await Promise.all([
      supabase
        .from("games")
        .select("id, court_id, starts_at, ends_at, status")
        .in("court_id", courtIds)
        .gte("starts_at", monthStart.toISOString())
        .lte("starts_at", monthEnd.toISOString())
        .not("status", "eq", "cancelled"),
      supabase
        .from("games")
        .select("id, court_id, starts_at, ends_at, status")
        .in("court_id", courtIds)
        .gte("starts_at", prevMonthStart.toISOString())
        .lte("starts_at", prevMonthEnd.toISOString())
        .not("status", "eq", "cancelled"),
      supabase
        .from("games")
        .select("id, court_id, created_by_user_id, starts_at, ends_at, status")
        .in("court_id", courtIds)
        .gte("starts_at", monthStart.toISOString())
        .lte("starts_at", monthEnd.toISOString())
        .order("starts_at", { ascending: false })
        .limit(20),
    ]);

  const monthGames = (monthGamesRes.data ?? []) as RawGame[];
  const prevMonthGames = (prevMonthGamesRes.data ?? []) as RawGame[];
  const monthBookings = (monthBookingsRes.data ?? []) as unknown as RawGame[];

  const monthBookingIds = monthBookings.map((game) => game.id);
  const playersRes = monthBookingIds.length
    ? await supabase
        .from("game_players" as never)
        .select("game_id, user_id")
        .in("game_id", monthBookingIds)
    : { data: [] as RawGamePlayer[] };

  const playersByGame = new Map<string, RawGamePlayer[]>();
  for (const row of (playersRes.data ?? []) as RawGamePlayer[]) {
    const list = playersByGame.get(row.game_id) ?? [];
    list.push(row);
    playersByGame.set(row.game_id, list);
  }

  const profileUserIds = new Set<string>();
  for (const game of monthBookings) {
    if (game.created_by_user_id) {
      profileUserIds.add(game.created_by_user_id);
    }
    for (const player of playersByGame.get(game.id) ?? []) {
      profileUserIds.add(player.user_id);
    }
  }

  const profileNames = new Map<string, string>();
  if (profileUserIds.size > 0) {
    const { data: profileRows } = await supabase
      .from("profiles" as never)
      .select("id, full_name")
      .in("id", [...profileUserIds]);

    for (const row of (profileRows ?? []) as Array<{
      id: string;
      full_name: string | null;
    }>) {
      if (row.full_name?.trim()) {
        profileNames.set(row.id, row.full_name.trim());
      }
    }
  }

  const monthDays = daysInMonth(year, month);

  const monthOccupancies = monthDays.map((ymd) =>
    computeDayOccupancy(monthGames, courts, slots, ymd),
  );
  const avgOccupancyPercent =
    monthOccupancies.length > 0
      ? Math.round(
          monthOccupancies.reduce((sum, value) => sum + value, 0) /
            monthOccupancies.length,
        )
      : 0;

  const prevMonthDays = daysInMonth(prevMonthDate.year, prevMonthDate.month);

  const prevMonthOccupancies = prevMonthDays.map((ymd) =>
    computeDayOccupancy(prevMonthGames, courts, slots, ymd),
  );
  const prevAvgOccupancyPercent =
    prevMonthOccupancies.length > 0
      ? Math.round(
          prevMonthOccupancies.reduce((sum, value) => sum + value, 0) /
            prevMonthOccupancies.length,
        )
      : null;

  const occupancyChangePoints =
    prevAvgOccupancyPercent != null
      ? avgOccupancyPercent - prevAvgOccupancyPercent
      : null;

  const courtBookingCounts = new Map<string, number>();
  for (const game of monthGames) {
    if (!game.court_id) continue;
    courtBookingCounts.set(
      game.court_id,
      (courtBookingCounts.get(game.court_id) ?? 0) + 1,
    );
  }

  let topCourtId: string | null = null;
  let topCount = 0;
  for (const [courtId, count] of courtBookingCounts) {
    if (count > topCount) {
      topCourtId = courtId;
      topCount = count;
    }
  }

  const topCourt = topCourtId ? courtMap.get(topCourtId) : null;

  const trendDays = monthDays;
  const occupancyTrendPoints: OccupancyTrendPoint[] = trendDays.map((ymd) => ({
    ymd,
    label: formatChartLabel(ymd),
    percent: computeDayOccupancy(monthGames, courts, slots, ymd),
  }));

  const bookings: BookingHistoryRow[] = monthBookings
    .filter((game): game is RawGame & { court_id: string } =>
      Boolean(game.court_id),
    )
    .map((game) => {
      const court = courtMap.get(game.court_id);
      const status = resolveBookingStatus(
        game.status,
        game.starts_at,
        game.ends_at,
        now,
      );
      return {
        id: game.id,
        startsAt: game.starts_at,
        courtName: court?.name ?? "Court",
        playerName: resolveBookingPlayerName(
          game,
          playersByGame.get(game.id) ?? [],
          profileNames,
        ),
        durationMinutes: durationMinutes(game.starts_at, game.ends_at),
        statusLabel: status.label,
        statusTone: status.tone,
      };
    });

  return {
    ...navigation,
    stats: {
      avgOccupancyPercent,
      prevAvgOccupancyPercent,
      occupancyChangePoints,
      topCourtName: topCourt?.name ?? null,
      topCourtSubtitle: topCourt?.environment
        ? topCourt.environment.charAt(0).toUpperCase() +
          topCourt.environment.slice(1)
        : null,
      totalBookings: monthGames.length,
    },
    occupancyTrend: occupancyTrendPoints,
    bookings,
  };
}
