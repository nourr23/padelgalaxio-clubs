import type { SupabaseClient } from "@supabase/supabase-js";

import type { ClubEnvironment, Database } from "@/src/types/database";

export type CourtListItem = {
  id: string;
  name: string;
  sortOrder: number | null;
  environment: ClubEnvironment | null;
  isActive: boolean;
  updatedAt: string;
  displayCode: string;
  upcomingBookings: number;
};

export async function getCourtsForClub(
  supabase: SupabaseClient<Database>,
  clubId: string,
): Promise<CourtListItem[]> {
  const { data: courts, error } = await supabase
    .from("courts")
    .select("id, name, sort_order, environment, is_active, updated_at")
    .eq("club_id", clubId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error || !courts?.length) return [];

  const courtIds = courts.map((court) => court.id);
  const now = new Date().toISOString();

  const { data: upcomingGames } = await supabase
    .from("games")
    .select("court_id")
    .in("court_id", courtIds)
    .gte("starts_at", now)
    .not("status", "eq", "cancelled");

  const bookingCounts = new Map<string, number>();
  for (const game of upcomingGames ?? []) {
    if (!game.court_id) continue;
    bookingCounts.set(
      game.court_id,
      (bookingCounts.get(game.court_id) ?? 0) + 1,
    );
  }

  return courts.map((court, index) => ({
    id: court.id,
    name: court.name,
    sortOrder: court.sort_order,
    environment: court.environment,
    isActive: court.is_active,
    updatedAt: court.updated_at,
    displayCode: formatCourtCode(court.sort_order, index),
    upcomingBookings: bookingCounts.get(court.id) ?? 0,
  }));
}

function formatCourtCode(sortOrder: number | null, index: number) {
  const order = sortOrder ?? index + 1;
  return `CRT-${String(order).padStart(3, "0")}`;
}
