import type { SupabaseClient } from "@supabase/supabase-js";

import {
  listFreeSlotStarts,
  type CourtRow,
  type GameRow,
} from "@/src/features/availability-posts/slots";
import type { Club, Database } from "@/src/types/database";

export type AvailabilityPostImage = {
  id: string;
  publicUrl: string;
  storagePath: string;
};

export type AvailabilityPost = {
  id: string;
  clubId: string;
  validForDate: string;
  title: string;
  description: string | null;
  availabilitySlots: string[];
  price: number | null;
  currency: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  image: AvailabilityPostImage | null;
};

type RawPost = {
  id: string;
  club_id: string;
  valid_for_date: string;
  title: string;
  description: string | null;
  availability_slots: string[] | null;
  price: number | string | null;
  currency: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  post_images:
    | {
        id: string;
        public_url: string | null;
        storage_path: string | null;
        is_primary: boolean | null;
        sort_order: number | null;
      }[]
    | null;
};

function mapPost(row: RawPost): AvailabilityPost {
  const images = [...(row.post_images ?? [])].sort((a, b) => {
    if (Boolean(a.is_primary) !== Boolean(b.is_primary)) {
      return a.is_primary ? -1 : 1;
    }
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  const primary = images.find((img) => img.public_url) ?? images[0];

  return {
    id: row.id,
    clubId: row.club_id,
    validForDate: row.valid_for_date,
    title: row.title,
    description: row.description,
    availabilitySlots: row.availability_slots ?? [],
    price: row.price != null ? Number(row.price) : null,
    currency: row.currency,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    image: primary?.public_url
      ? {
          id: primary.id,
          publicUrl: primary.public_url,
          storagePath: primary.storage_path ?? "",
        }
      : null,
  };
}

const POST_SELECT = `
  id,
  club_id,
  valid_for_date,
  title,
  description,
  availability_slots,
  price,
  currency,
  status,
  created_at,
  updated_at,
  post_images(id, public_url, storage_path, is_primary, sort_order)
`;

export async function fetchMyClub(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Club | null> {
  const { data, error } = await supabase
    .from("clubs")
    .select("*")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function dayRangeIso(ymd: string) {
  const start = new Date(`${ymd}T00:00:00`);
  const end = new Date(`${ymd}T23:59:59.999`);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export async function fetchCourtsForClub(
  supabase: SupabaseClient,
  clubId: string,
): Promise<CourtRow[]> {
  const { data, error } = await supabase
    .from("courts")
    .select("id, name, sort_order, environment")
    .eq("club_id", clubId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as CourtRow[];
}

export async function fetchBlockingGamesForDate(
  supabase: SupabaseClient,
  courtIds: string[],
  ymd: string,
): Promise<GameRow[]> {
  if (!courtIds.length) return [];

  const { startIso, endIso } = dayRangeIso(ymd);
  const { data, error } = await supabase
    .from("games")
    .select("court_id, starts_at, ends_at, status")
    .in("court_id", courtIds)
    .gte("starts_at", startIso)
    .lte("starts_at", endIso)
    .in("status", ["open", "full", "completed"]);

  if (error) throw error;
  return (data ?? []) as GameRow[];
}

export async function fetchFreeSlotsForDate(
  supabase: SupabaseClient,
  club: Club,
  ymd: string,
): Promise<string[]> {
  const courts = await fetchCourtsForClub(supabase, club.id);
  const games = await fetchBlockingGamesForDate(
    supabase,
    courts.map((court) => court.id),
    ymd,
  );
  return listFreeSlotStarts(ymd, club, courts, games);
}

export async function fetchAvailabilityPostForDate(
  supabase: SupabaseClient,
  clubId: string,
  ymd: string,
): Promise<AvailabilityPost | null> {
  const { data, error } = await supabase
    .from("posts" as never)
    .select(POST_SELECT as never)
    .eq("club_id", clubId)
    .eq("type", "club_availability")
    .eq("status", "active")
    .eq("valid_for_date", ymd)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapPost(data as unknown as RawPost);
}

export async function fetchRecentAvailabilityPosts(
  supabase: SupabaseClient,
  clubId: string,
  limit = 7,
): Promise<AvailabilityPost[]> {
  const { data, error } = await supabase
    .from("posts" as never)
    .select(POST_SELECT as never)
    .eq("club_id", clubId)
    .eq("type", "club_availability")
    .in("status", ["active", "archived"])
    .order("valid_for_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as unknown as RawPost[]).map(mapPost);
}

export type PublishAvailabilityInput = {
  clubId: string;
  userId: string;
  validForDate: string;
  slots: string[];
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  title: string;
};

export async function publishAvailabilityPost(
  supabase: SupabaseClient,
  input: PublishAvailabilityInput,
): Promise<{ postId: string }> {
  const existing = await fetchAvailabilityPostForDate(
    supabase,
    input.clubId,
    input.validForDate,
  );

  const payload = {
    author_user_id: input.userId,
    type: "club_availability",
    status: "active",
    club_id: input.clubId,
    valid_for_date: input.validForDate,
    availability_slots: input.slots,
    title: input.title,
    description: input.description?.trim() || null,
    price: input.price ?? null,
    currency: input.price != null ? input.currency?.trim() || "TND" : null,
    game_id: null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase
      .from("posts" as never)
      .update(payload as never)
      .eq("id", existing.id)
      .eq("author_user_id", input.userId);

    if (error) throw error;
    return { postId: existing.id };
  }

  const { data, error } = await supabase
    .from("posts" as never)
    .insert(payload as never)
    .select("id")
    .single();

  if (error) throw error;
  return { postId: (data as { id: string }).id };
}

export async function archiveAvailabilityPost(
  supabase: SupabaseClient,
  postId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("posts" as never)
    .update({
      status: "archived",
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", postId)
    .eq("author_user_id", userId)
    .eq("type", "club_availability");

  if (error) throw error;
}
