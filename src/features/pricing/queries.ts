import type { SupabaseClient } from "@supabase/supabase-js";

import { toDisplayTime } from "@/src/features/clubs/validation";
import type {
  PricingCourt,
  PricingGroupInput,
  PricingTarget,
} from "@/src/features/pricing/validation";
import type { Database } from "@/src/types/database";

export type ClubPricing = {
  courts: PricingCourt[];
  groups: PricingGroupInput[];
  error: string | null;
};

export async function getClubPricing(
  supabase: SupabaseClient<Database>,
  clubId: string,
): Promise<ClubPricing> {
  const { data: courts, error: courtsError } = await supabase
    .from("courts")
    .select("id, name, environment")
    .eq("club_id", clubId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (courtsError) return { courts: [], groups: [], error: courtsError.message };
  if (!courts?.length) return { courts: [], groups: [], error: null };

  const { data: rows, error } = await supabase
    .from("court_session_prices")
    .select("court_id, from_time, to_time, days_of_week, price")
    .in(
      "court_id",
      courts.map((court) => court.id),
    );

  if (error) return { courts, groups: [], error: error.message };

  const buckets = new Map<
    string,
    { days: number[]; from: string; to: string; price: number; courtIds: Set<string> }
  >();

  for (const row of rows ?? []) {
    const days = [...(row.days_of_week ?? [])].sort((a, b) => a - b);
    const from = toDisplayTime(row.from_time);
    const to = toDisplayTime(row.to_time);
    const price = Number(row.price);
    const key = `${days.join(",")}|${from}|${to}|${price}`;
    const bucket = buckets.get(key) ?? {
      days,
      from,
      to,
      price,
      courtIds: new Set<string>(),
    };
    bucket.courtIds.add(row.court_id);
    buckets.set(key, bucket);
  }

  const groups = [...buckets.values()]
    .map((bucket) => ({
      days: bucket.days,
      from: bucket.from,
      to: bucket.to,
      price: bucket.price,
      target: toTarget(bucket.courtIds, courts),
    }))
    .sort(
      (a, b) =>
        (a.days[0] ?? -1) - (b.days[0] ?? -1) ||
        a.days.length - b.days.length ||
        a.from.localeCompare(b.from),
    );

  return { courts, groups, error: null };
}

function toTarget(courtIds: Set<string>, courts: PricingCourt[]): PricingTarget {
  const matches = (subset: PricingCourt[]) =>
    subset.length > 0 &&
    subset.length === courtIds.size &&
    subset.every((court) => courtIds.has(court.id));

  if (matches(courts)) return "all";
  if (matches(courts.filter((court) => court.environment === "indoor"))) {
    return "indoor";
  }
  if (matches(courts.filter((court) => court.environment === "outdoor"))) {
    return "outdoor";
  }
  // Keep the court order stable for the picker.
  return { courtIds: courts.filter((court) => courtIds.has(court.id)).map((court) => court.id) };
}
