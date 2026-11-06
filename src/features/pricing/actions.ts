"use server";

import { revalidatePath } from "next/cache";

import { assertClubsAppAccess } from "@/lib/auth/assert-clubs-access";
import { createClient } from "@/lib/supabase/server";
import { toDisplayTime } from "@/src/features/clubs/validation";
import {
  buildPricingFormSchema,
  resolveTargetCourtIds,
  type PricingGroupInput,
} from "@/src/features/pricing/validation";

type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

async function assertClubOwner(clubId: string) {
  const supabase = await createClient();
  const access = await assertClubsAppAccess(supabase);
  if (!access.ok) {
    return { ok: false as const, error: "You must be signed in." };
  }
  if (!access.club || access.club.id !== clubId) {
    return { ok: false as const, error: "You can only manage your own club." };
  }
  return { ok: true as const, supabase, club: access.club };
}

export async function saveClubPricing(
  clubId: string,
  groups: PricingGroupInput[],
): Promise<ActionResult> {
  const auth = await assertClubOwner(clubId);
  if (!auth.ok) return auth;
  const { supabase, club } = auth;

  const { data: clubCourts, error: courtsError } = await supabase
    .from("courts")
    .select("id, name, environment, is_active")
    .eq("club_id", clubId);

  if (courtsError) return { ok: false, error: courtsError.message };

  const activeCourts = (clubCourts ?? []).filter((court) => court.is_active);
  const schema = buildPricingFormSchema({
    open: toDisplayTime(club.first_slot_start) || "00:00",
    close: toDisplayTime(club.last_session_end) || "23:59",
    courts: activeCourts,
  });

  const parsed = schema.safeParse({ groups });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return {
      ok: false,
      error: "Please fix the highlighted rules.",
      fieldErrors,
    };
  }

  const courtIds = (clubCourts ?? []).map((court) => court.id);

  const { data: existing, error: existingError } = courtIds.length
    ? await supabase
        .from("court_session_prices")
        .select("id")
        .in("court_id", courtIds)
    : { data: [], error: null };

  if (existingError) return { ok: false, error: existingError.message };

  const rows = parsed.data.groups.flatMap((group) =>
    resolveTargetCourtIds(group.target, activeCourts).map((courtId) => ({
      court_id: courtId,
      from_time: group.from,
      to_time: group.to,
      days_of_week: group.days.length
        ? [...group.days].sort((a, b) => a - b)
        : null,
      price: group.price,
    })),
  );

  // Insert the new rules first so a failed insert leaves the old prices intact.
  if (rows.length) {
    const { error } = await supabase.from("court_session_prices").insert(rows);
    if (error) return { ok: false, error: error.message };
  }

  const oldIds = (existing ?? []).map((row) => row.id);
  if (oldIds.length) {
    const { error } = await supabase
      .from("court_session_prices")
      .delete()
      .in("id", oldIds);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/pricing");
  revalidatePath("/dashboard");
  return { ok: true };
}
