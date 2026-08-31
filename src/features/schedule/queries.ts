import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getDaySlotStartsForClub,
  rangesOverlap,
  slotBounds,
  type SlotDef,
} from "@/src/features/schedule/slots";
import type { Club, Database, GameStatus } from "@/src/types/database";

export type ScheduleCourt = {
  id: string;
  name: string;
  isActive: boolean;
  environment: string | null;
};

export type ScheduleGame = {
  id: string;
  courtId: string;
  startsAt: string;
  endsAt: string;
  status: GameStatus | null;
  hostName: string;
  playersLabel: string;
  subtitle: string;
  isEvent: boolean;
};

export type ScheduleCell =
  | { type: "maintenance" }
  | { type: "empty" }
  | { type: "booked"; game: ScheduleGame };

export type ScheduleDayData = {
  courts: ScheduleCourt[];
  slots: SlotDef[];
  cells: Record<string, Record<string, ScheduleCell>>;
  stats: {
    occupancyPercent: number;
    bookingsToday: number;
    uniquePlayers: number;
    maintenanceSlots: number;
  };
};

type RawGame = {
  id: string;
  court_id: string | null;
  starts_at: string;
  ends_at: string;
  status: GameStatus | null;
};

type RawGamePlayer = {
  game_id: string;
  user_id: string;
  profiles?: { full_name: string | null } | null;
};

function dayRangeIso(ymd: string) {
  const start = new Date(`${ymd}T00:00:00`);
  const end = new Date(`${ymd}T23:59:59.999`);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function firstName(fullName: string | null | undefined) {
  const trimmed = fullName?.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function formatInitial(name: string) {
  return `${name.charAt(0).toUpperCase()}.`;
}

function gameSubtitle(status: GameStatus | null) {
  if (status === "full") return "Full session";
  if (status === "open") return "Open session";
  if (status === "completed") return "Completed";
  if (status === "draft") return "Draft";
  return "Booked session";
}

export async function getScheduleForDate(
  supabase: SupabaseClient<Database>,
  club: Club,
  ymd: string,
): Promise<ScheduleDayData> {
  const empty: ScheduleDayData = {
    courts: [],
    slots: getDaySlotStartsForClub(club),
    cells: {},
    stats: {
      occupancyPercent: 0,
      bookingsToday: 0,
      uniquePlayers: 0,
      maintenanceSlots: 0,
    },
  };

  const { data: courts, error: courtsError } = await supabase
    .from("courts")
    .select("id, name, is_active, environment")
    .eq("club_id", club.id)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (courtsError || !courts?.length) return empty;

  const scheduleCourts: ScheduleCourt[] = courts.map((court) => ({
    id: court.id,
    name: court.name,
    isActive: court.is_active,
    environment: court.environment,
  }));

  const slots = getDaySlotStartsForClub(club);
  const courtIds = courts.map((court) => court.id);
  const { startIso, endIso } = dayRangeIso(ymd);

  const { data: gamesData } = await supabase
    .from("games")
    .select("id, court_id, starts_at, ends_at, status")
    .in("court_id", courtIds)
    .gte("starts_at", startIso)
    .lte("starts_at", endIso)
    .not("status", "eq", "cancelled");

  const games = gamesData ?? [];
  const gameIds = games.map((game) => game.id);

  const playersRes = gameIds.length
    ? await supabase
        .from("game_players" as never)
        .select("game_id, user_id, profiles(full_name)")
        .in("game_id", gameIds)
    : { data: [] as RawGamePlayer[] };

  const playersByGame = new Map<string, RawGamePlayer[]>();
  for (const row of (playersRes.data ?? []) as RawGamePlayer[]) {
    const list = playersByGame.get(row.game_id) ?? [];
    list.push(row);
    playersByGame.set(row.game_id, list);
  }

  const scheduleGames: ScheduleGame[] = games
    .filter(
      (game): game is RawGame & { court_id: string } => Boolean(game.court_id),
    )
    .map((game) => {
      const players = playersByGame.get(game.id) ?? [];
      const playerNames = players
        .map((player) => firstName(player.profiles?.full_name))
        .filter((name): name is string => Boolean(name));

      const host =
        (playerNames[0] ? formatInitial(playerNames[0]) : null) || "Booked";

      return {
        id: game.id,
        courtId: game.court_id,
        startsAt: game.starts_at,
        endsAt: game.ends_at,
        status: game.status,
        hostName: host,
        playersLabel:
          playerNames.length > 1
            ? `${formatInitial(playerNames[0])} +${playerNames.length - 1}`
            : playerNames[0]
              ? formatInitial(playerNames[0])
              : "Players TBD",
        subtitle: gameSubtitle(game.status),
        isEvent: game.status === "full",
      };
    });

  const gamesByCourt = new Map<string, ScheduleGame[]>();
  for (const game of scheduleGames) {
    const list = gamesByCourt.get(game.courtId) ?? [];
    list.push(game);
    gamesByCourt.set(game.courtId, list);
  }

  const cells: Record<string, Record<string, ScheduleCell>> = {};
  let bookedCells = 0;
  let totalActiveCells = 0;
  let maintenanceSlots = 0;

  for (const court of scheduleCourts) {
    cells[court.id] = {};

    if (!court.isActive) {
      for (const slot of slots) {
        cells[court.id][slot.start] = { type: "maintenance" };
        maintenanceSlots += 1;
      }
      continue;
    }

    const courtGames = gamesByCourt.get(court.id) ?? [];

    for (const slot of slots) {
      totalActiveCells += 1;
      const { start, end } = slotBounds(ymd, slot);

      const matchingGame = courtGames.find((game) => {
        const gameStart = new Date(game.startsAt);
        const gameEnd = new Date(game.endsAt);
        return rangesOverlap(gameStart, gameEnd, start, end);
      });

      if (matchingGame) {
        cells[court.id][slot.start] = {
          type: "booked",
          game: matchingGame,
        };
        bookedCells += 1;
        continue;
      }

      cells[court.id][slot.start] = { type: "empty" };
    }
  }

  const uniquePlayers = new Set<string>();
  for (const row of (playersRes.data ?? []) as RawGamePlayer[]) {
    uniquePlayers.add(row.user_id);
  }

  return {
    courts: scheduleCourts,
    slots,
    cells,
    stats: {
      occupancyPercent:
        totalActiveCells > 0
          ? Math.round((bookedCells / totalActiveCells) * 100)
          : 0,
      bookingsToday: scheduleGames.length,
      uniquePlayers: uniquePlayers.size,
      maintenanceSlots,
    },
  };
}

export async function getWeekSummaries(
  supabase: SupabaseClient<Database>,
  club: Club,
  weekDates: string[],
) {
  const summaries: Record<string, number> = {};
  await Promise.all(
    weekDates.map(async (ymd) => {
      const day = await getScheduleForDate(supabase, club, ymd);
      summaries[ymd] = day.stats.bookingsToday;
    }),
  );
  return summaries;
}
