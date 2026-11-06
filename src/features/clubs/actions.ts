"use server";

import { revalidatePath } from "next/cache";

import { assertClubsAppAccess } from "@/lib/auth/assert-clubs-access";
import { createClient } from "@/lib/supabase/server";
import {
  bookingWindowSchema,
  clubSettingsSchema,
  type BookingWindowInput,
  type ClubSettingsInput,
} from "@/src/features/clubs/validation";

export type UpdateClubSettingsResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function updateClubSettings(
  clubId: string,
  input: ClubSettingsInput,
): Promise<UpdateClubSettingsResult> {
  const parsed = clubSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const access = await assertClubsAppAccess(supabase);
  if (!access.ok) {
    return { ok: false, error: "You must be signed in." };
  }

  if (!access.club || access.club.id !== clubId) {
    return { ok: false, error: "You can only edit your own club." };
  }

  const data = parsed.data;
  const { error } = await supabase
    .from("clubs")
    .update({
      name: data.name,
      city: data.city.trim() ? data.city.trim() : null,
      timezone: data.timezone,
      slot_duration_minutes: data.slot_duration_minutes,
      first_slot_start: data.first_slot_start,
      last_session_end: data.last_session_end,
      booking_window_days: data.booking_window_days,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clubId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/pricing");
  return { ok: true };
}

export async function updateBookingWindow(
  clubId: string,
  input: BookingWindowInput,
): Promise<UpdateClubSettingsResult> {
  const parsed = bookingWindowSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const access = await assertClubsAppAccess(supabase);
  if (!access.ok) {
    return { ok: false, error: "You must be signed in." };
  }

  if (!access.club || access.club.id !== clubId) {
    return { ok: false, error: "You can only edit your own club." };
  }

  const { error } = await supabase
    .from("clubs")
    .update({
      booking_window_days: parsed.data.booking_window_days,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clubId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/pricing");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}
