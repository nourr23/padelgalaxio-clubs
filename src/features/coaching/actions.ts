"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { assertClubsAppAccess } from "@/lib/auth/assert-clubs-access";
import { createClient } from "@/lib/supabase/server";
import {
  coachingPackageSchema,
  coachingPackagesFormSchema,
  requestStatusSchema,
  toPackageRow,
  type CoachingPackageFormItem,
  type CoachingPackageInput,
  type RequestStatusInput,
} from "@/src/features/coaching/validation";
import type { CoachingPackageKind } from "@/src/types/database";

type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

type DeleteResult =
  | { ok: true }
  | { ok: false; error: string; requestCount?: number };

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

function revalidateCoaching() {
  revalidatePath("/dashboard/coaching");
  revalidatePath("/dashboard");
}

function toFieldErrors(error: z.ZodError, prefix = "") {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = [prefix, ...issue.path.map(String)].filter(Boolean).join(".");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

async function nextSortOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clubId: string,
  kind: CoachingPackageKind,
) {
  const { data, error } = await supabase
    .from("coaching_packages")
    .select("sort_order")
    .eq("club_id", clubId)
    .eq("kind", kind)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { error: error.message };
  return { value: (data?.sort_order ?? -1) + 1 };
}

export async function createCoachingPackage(
  clubId: string,
  input: CoachingPackageInput,
): Promise<ActionResult> {
  const auth = await assertClubOwner(clubId);
  if (!auth.ok) return auth;

  const parsed = coachingPackageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const order = await nextSortOrder(auth.supabase, clubId, parsed.data.kind);
  if ("error" in order) return { ok: false, error: order.error ?? "" };

  const { error } = await auth.supabase.from("coaching_packages").insert({
    ...toPackageRow(parsed.data),
    club_id: clubId,
    sort_order: order.value,
  });
  if (error) return { ok: false, error: error.message };

  revalidateCoaching();
  return { ok: true };
}

export async function updateCoachingPackage(
  clubId: string,
  packageId: string,
  input: CoachingPackageInput,
): Promise<ActionResult> {
  const auth = await assertClubOwner(clubId);
  if (!auth.ok) return auth;

  const parsed = coachingPackageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const { data, error } = await auth.supabase
    .from("coaching_packages")
    .update(toPackageRow(parsed.data))
    .eq("id", packageId)
    .eq("club_id", clubId)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "Package not found." };

  revalidateCoaching();
  return { ok: true };
}

/**
 * Saves the whole editor in one go: drafts are inserted, changed packages are
 * updated, and sort_order follows the on-screen order within each kind.
 */
export async function saveCoachingPackages(
  clubId: string,
  packages: CoachingPackageFormItem[],
  changedIds: string[],
): Promise<ActionResult> {
  const auth = await assertClubOwner(clubId);
  if (!auth.ok) return auth;
  const { supabase } = auth;

  const parsed = coachingPackagesFormSchema.safeParse({ packages });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted packages.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const changed = new Set(changedIds);
  const position: Record<CoachingPackageKind, number> = {
    monthly: 0,
    per_session: 0,
  };

  const inserts = [];
  for (const item of parsed.data.packages) {
    const sortOrder = position[item.kind]++;
    const row = { ...toPackageRow(item), sort_order: sortOrder };
    if (!item.id) {
      inserts.push({ ...row, club_id: clubId });
      continue;
    }
    if (!changed.has(item.id)) continue;
    const { data, error } = await supabase
      .from("coaching_packages")
      .update(row)
      .eq("id", item.id)
      .eq("club_id", clubId)
      .select("id");
    if (error) return { ok: false, error: error.message };
    if (!data?.length) {
      return { ok: false, error: "A package was removed elsewhere. Reload the page." };
    }
  }

  if (inserts.length) {
    const { error } = await supabase.from("coaching_packages").insert(inserts);
    if (error) return { ok: false, error: error.message };
  }

  revalidateCoaching();
  return { ok: true };
}

export async function setCoachingPackageActive(
  clubId: string,
  packageId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const auth = await assertClubOwner(clubId);
  if (!auth.ok) return auth;

  const { data, error } = await auth.supabase
    .from("coaching_packages")
    .update({ is_active: isActive })
    .eq("id", packageId)
    .eq("club_id", clubId)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "Package not found." };

  revalidateCoaching();
  return { ok: true };
}

export async function reorderCoachingPackages(
  clubId: string,
  kind: CoachingPackageKind,
  ids: string[],
): Promise<ActionResult> {
  const auth = await assertClubOwner(clubId);
  if (!auth.ok) return auth;

  for (const [index, id] of ids.entries()) {
    const { error } = await auth.supabase
      .from("coaching_packages")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("club_id", clubId)
      .eq("kind", kind);
    if (error) return { ok: false, error: error.message };
  }

  revalidateCoaching();
  return { ok: true };
}

/** Deleting cascades to the package's requests, so it needs `force` when any exist. */
export async function deleteCoachingPackage(
  clubId: string,
  packageId: string,
  options: { force?: boolean } = {},
): Promise<DeleteResult> {
  const auth = await assertClubOwner(clubId);
  if (!auth.ok) return auth;
  const { supabase } = auth;

  const { count, error: countError } = await supabase
    .from("coaching_requests")
    .select("id", { count: "exact", head: true })
    .eq("package_id", packageId);
  if (countError) return { ok: false, error: countError.message };

  const requestCount = count ?? 0;
  if (requestCount > 0 && !options.force) {
    return {
      ok: false,
      error: `This package has ${requestCount} request${requestCount === 1 ? "" : "s"}. Deactivate it instead, or confirm to delete them too.`,
      requestCount,
    };
  }

  const { data, error } = await supabase
    .from("coaching_packages")
    .delete()
    .eq("id", packageId)
    .eq("club_id", clubId)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "Package not found." };

  revalidateCoaching();
  return { ok: true };
}

export async function updateCoachingRequest(
  clubId: string,
  requestId: string,
  input: RequestStatusInput,
): Promise<ActionResult> {
  const auth = await assertClubOwner(clubId);
  if (!auth.ok) return auth;

  const parsed = requestStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  // Only status and club_note: the coaching_requests_before_update trigger rejects anything else.
  const { data, error } = await auth.supabase
    .from("coaching_requests")
    .update({
      status: parsed.data.status,
      club_note: parsed.data.clubNote || null,
    })
    .eq("id", requestId)
    .eq("club_id", clubId)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "Request not found." };

  revalidateCoaching();
  return { ok: true };
}
