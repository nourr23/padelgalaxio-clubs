"use server";

import { revalidatePath } from "next/cache";

import { assertClubsAppAccess } from "@/lib/auth/assert-clubs-access";
import { createClient } from "@/lib/supabase/server";
import {
  courtFormSchema,
  type CourtFormInput,
} from "@/src/features/courts/validation";

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
  return { ok: true as const, supabase, clubId };
}

export async function createCourt(
  clubId: string,
  input: CourtFormInput,
): Promise<ActionResult> {
  const auth = await assertClubOwner(clubId);
  if (!auth.ok) return auth;

  const parsed = courtFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { error } = await auth.supabase.from("courts").insert({
    club_id: clubId,
    name: parsed.data.name,
    environment: parsed.data.environment,
    sort_order: parsed.data.sort_order,
    is_active: true,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/courts");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateCourt(
  clubId: string,
  courtId: string,
  input: CourtFormInput,
): Promise<ActionResult> {
  const auth = await assertClubOwner(clubId);
  if (!auth.ok) return auth;

  const parsed = courtFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { error } = await auth.supabase
    .from("courts")
    .update({
      name: parsed.data.name,
      environment: parsed.data.environment,
      sort_order: parsed.data.sort_order,
      updated_at: new Date().toISOString(),
    })
    .eq("id", courtId)
    .eq("club_id", clubId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/courts");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setCourtActive(
  clubId: string,
  courtId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const auth = await assertClubOwner(clubId);
  if (!auth.ok) return auth;

  const { error } = await auth.supabase
    .from("courts")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", courtId)
    .eq("club_id", clubId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/courts");
  revalidatePath("/dashboard");
  return { ok: true };
}
