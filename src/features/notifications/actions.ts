"use server";

import { revalidatePath } from "next/cache";

import { assertClubsAppAccess } from "@/lib/auth/assert-clubs-access";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

async function assertSignedIn() {
  const supabase = await createClient();
  const access = await assertClubsAppAccess(supabase);
  if (!access.ok) {
    return { ok: false as const, error: "You must be signed in." };
  }
  return { ok: true as const, supabase, userId: access.user.id };
}

export async function markNotificationRead(
  notificationId: string,
): Promise<ActionResult> {
  const auth = await assertSignedIn();
  if (!auth.ok) return auth;

  const { error } = await auth.supabase
    .from("notifications" as never)
    .update({ read_at: new Date().toISOString() } as never)
    .eq("id", notificationId)
    .eq("user_id", auth.userId)
    .is("read_at", null);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const auth = await assertSignedIn();
  if (!auth.ok) return auth;

  const { error } = await auth.supabase
    .from("notifications" as never)
    .update({ read_at: new Date().toISOString() } as never)
    .eq("user_id", auth.userId)
    .is("read_at", null);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
