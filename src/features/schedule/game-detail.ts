import type { SupabaseClient } from "@supabase/supabase-js";

import type { ClubEnvironment, GameStatus } from "@/src/types/database";

export type ClubGamePlayer = {
  id: string;
  name: string;
  status: string;
  isHost: boolean;
};

export type ClubGameDetail = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: GameStatus | null;
  levelMin: number | null;
  levelMax: number | null;
  genderCategory: string | null;
  notes: string | null;
  courtName: string;
  courtEnvironment: ClubEnvironment | null;
  clubName: string;
  clubCity: string | null;
  hostName: string | null;
  players: ClubGamePlayer[];
};

type RawGameDetail = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: GameStatus | null;
  level_min: number | null;
  level_max: number | null;
  gender_category: string | null;
  notes: string | null;
  created_by_user_id: string | null;
  court: {
    id: string;
    name: string;
    environment: ClubEnvironment | null;
    club_id: string;
    club: { name: string; city: string | null } | null;
  } | null;
};

type RawGamePlayer = {
  user_id: string;
  status: string;
  profiles: { full_name: string | null } | null;
};

export function formatGameDateTime(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(start);
  const startTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(start);
  const endTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(end);
  return { date, timeRange: `${startTime} – ${endTime}` };
}

export function formatStatusLabel(status: GameStatus | null) {
  switch (status) {
    case "open":
      return "Open";
    case "full":
      return "Full";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "draft":
      return "Draft";
    default:
      return "Booked";
  }
}

export function formatLevelRange(min: number | null, max: number | null) {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `Level ${min} – ${max}`;
  if (min != null) return `Level ${min}+`;
  return `Up to level ${max}`;
}

export async function getClubGameDetail(
  supabase: SupabaseClient,
  clubId: string,
  gameId: string,
): Promise<ClubGameDetail | null> {
  const { data, error } = await supabase
    .from("games")
    .select(
      `
      id,
      starts_at,
      ends_at,
      status,
      level_min,
      level_max,
      gender_category,
      notes,
      created_by_user_id,
      court:courts!inner(
        id,
        name,
        environment,
        club_id,
        club:clubs(name, city)
      )
    ` as never,
    )
    .eq("id", gameId)
    .maybeSingle();

  if (error || !data) return null;

  const game = data as unknown as RawGameDetail;
  if (!game.court || game.court.club_id !== clubId) return null;

  const { data: playerRows } = await supabase
    .from("game_players" as never)
    .select("user_id, status, profiles(full_name)")
    .eq("game_id", gameId);

  const hostId = game.created_by_user_id;
  let hostName: string | null = null;

  if (hostId) {
    const { data: hostProfile } = await supabase
      .from("profiles" as never)
      .select("full_name")
      .eq("id", hostId)
      .maybeSingle();
    hostName =
      (hostProfile as { full_name: string | null } | null)?.full_name?.trim() ||
      null;
  }

  const players: ClubGamePlayer[] = ((playerRows ?? []) as RawGamePlayer[])
    .filter((row) => row.status !== "declined" && row.status !== "left")
    .map((row) => ({
      id: row.user_id,
      name: row.profiles?.full_name?.trim() || "Unknown player",
      status: row.status,
      isHost: row.user_id === hostId,
    }))
    .sort((a, b) => {
      if (a.isHost !== b.isHost) return a.isHost ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  if (hostId && !players.some((player) => player.id === hostId)) {
    players.unshift({
      id: hostId,
      name: hostName || "Host",
      status: "hosting",
      isHost: true,
    });
  }

  return {
    id: game.id,
    startsAt: game.starts_at,
    endsAt: game.ends_at,
    status: game.status,
    levelMin: game.level_min,
    levelMax: game.level_max,
    genderCategory: game.gender_category,
    notes: game.notes,
    courtName: game.court.name,
    courtEnvironment: game.court.environment,
    clubName: game.court.club?.name ?? "Club",
    clubCity: game.court.club?.city ?? null,
    hostName,
    players,
  };
}
