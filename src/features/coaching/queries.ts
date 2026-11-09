import type { SupabaseClient } from "@supabase/supabase-js";

import type { CoachingPackageFormItem } from "@/src/features/coaching/validation";
import type {
  CoachingPackageKind,
  CoachingPriceBasis,
  CoachingRequestStatus,
  Database,
} from "@/src/types/database";

export type ClubCoachingPackage = CoachingPackageFormItem & {
  id: string;
  sortOrder: number;
  currency: string;
  updatedAt: string;
};

export type ClubCoachingRequest = {
  id: string;
  packageId: string;
  participants: number;
  note: string | null;
  status: CoachingRequestStatus;
  clubNote: string | null;
  createdAt: string;
  updatedAt: string;
  player: { id: string; name: string; phone: string | null };
  package: {
    kind: CoachingPackageKind;
    title: string | null;
    groupSize: number;
    sessionsPerMonth: number | null;
    price: number;
    priceBasis: CoachingPriceBasis;
    currency: string;
  } | null;
};

const KIND_ORDER: Record<CoachingPackageKind, number> = {
  monthly: 0,
  per_session: 1,
};

export async function getClubCoachingPackages(
  supabase: SupabaseClient<Database>,
  clubId: string,
): Promise<{ packages: ClubCoachingPackage[]; error: string | null }> {
  const { data, error } = await supabase
    .from("coaching_packages")
    .select(
      "id, kind, title, group_size, sessions_per_month, session_minutes, price, price_basis, currency, description, is_active, sort_order, updated_at",
    )
    .eq("club_id", clubId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { packages: [], error: error.message };

  const packages = (data ?? [])
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title ?? "",
      groupSize: row.group_size,
      sessionsPerMonth: row.sessions_per_month,
      sessionMinutes: row.session_minutes,
      price: Number(row.price),
      priceBasis: row.price_basis,
      currency: row.currency || "TND",
      description: row.description ?? "",
      isActive: row.is_active,
      sortOrder: row.sort_order ?? 0,
      updatedAt: row.updated_at,
    }))
    // Stable sort keeps sort_order within each kind.
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);

  return { packages, error: null };
}

export async function getClubCoachingRequests(
  supabase: SupabaseClient<Database>,
  clubId: string,
  options: { status?: CoachingRequestStatus[] } = {},
): Promise<{ requests: ClubCoachingRequest[]; error: string | null }> {
  let query = supabase
    .from("coaching_requests")
    .select(
      "id, package_id, participants, note, status, club_note, created_at, updated_at, player_user_id, coaching_packages(kind, title, group_size, sessions_per_month, price, price_basis, currency), profiles(full_name, phone)",
    )
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });

  if (options.status?.length) {
    query = query.in("status", options.status);
  }

  const { data, error } = await query;
  if (error) return { requests: [], error: error.message };

  const requests = (data ?? []).map((row) => {
    const pkg = row.coaching_packages;
    const profile = row.profiles;
    return {
      id: row.id,
      packageId: row.package_id,
      participants: row.participants,
      note: row.note,
      status: row.status,
      clubNote: row.club_note,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      player: {
        id: row.player_user_id,
        name: profile?.full_name?.trim() || "Unknown player",
        phone: profile?.phone?.trim() || null,
      },
      package: pkg
        ? {
            kind: pkg.kind,
            title: pkg.title,
            groupSize: pkg.group_size,
            sessionsPerMonth: pkg.sessions_per_month,
            price: Number(pkg.price),
            priceBasis: pkg.price_basis,
            currency: pkg.currency || "TND",
          }
        : null,
    };
  });

  return { requests, error: null };
}

/** 0 when the table is missing or the query fails, so the nav never breaks. */
export async function countPendingCoachingRequests(
  supabase: SupabaseClient<Database>,
  clubId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("coaching_requests")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId)
    .eq("status", "pending");

  if (error) return 0;
  return count ?? 0;
}
