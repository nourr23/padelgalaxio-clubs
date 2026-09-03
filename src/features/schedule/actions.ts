"use server";

import { revalidatePath } from "next/cache";

import { assertClubsAppAccess } from "@/lib/auth/assert-clubs-access";
import { createClient } from "@/lib/supabase/server";

type RequestDeletionResult =
  | { ok: true; requestId: string }
  | { ok: false; error: string };

type MutationResult =
  | { ok: true; gameId?: string }
  | { ok: false; error: string };

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

export async function createClubBooking(
  clubId: string,
  input: {
    courtId: string;
    startsAtIso: string;
    endsAtIso: string;
    notes?: string;
  },
): Promise<MutationResult> {
  const auth = await assertClubOwner(clubId);
  if (!auth.ok) return auth;

  const { data, error } = await auth.supabase.rpc(
    "create_club_booking" as never,
    {
      p_court_id: input.courtId,
      p_starts_at: input.startsAtIso,
      p_ends_at: input.endsAtIso,
      p_notes: input.notes?.trim() || null,
    } as never,
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/schedule");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");

  return { ok: true, gameId: String(data) };
}

export async function cancelClubBooking(
  clubId: string,
  gameId: string,
): Promise<MutationResult> {
  const auth = await assertClubOwner(clubId);
  if (!auth.ok) return auth;

  const { error } = await auth.supabase.rpc(
    "cancel_club_booking" as never,
    { p_game_id: gameId } as never,
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/schedule");
  revalidatePath(`/dashboard/schedule/${gameId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/history");

  return { ok: true };
}

export async function requestGameDeletion(
  clubId: string,
  gameId: string,
  reason?: string,
): Promise<RequestDeletionResult> {
  const auth = await assertClubOwner(clubId);
  if (!auth.ok) return auth;

  const trimmedReason = reason?.trim() || null;

  const { data, error } = await auth.supabase.rpc(
    "request_game_deletion" as never,
    {
      p_game_id: gameId,
      p_reason: trimmedReason,
    } as never,
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/schedule");
  revalidatePath(`/dashboard/schedule/${gameId}`);

  return { ok: true, requestId: String(data) };
}
