"use server";

import { revalidatePath } from "next/cache";

import { assertClubsAppAccess } from "@/lib/auth/assert-clubs-access";
import { createClient } from "@/lib/supabase/server";

type ActionResult =
  | { ok: true; requestId: string }
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

export async function requestGameDeletion(
  clubId: string,
  gameId: string,
  reason?: string,
): Promise<ActionResult> {
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
