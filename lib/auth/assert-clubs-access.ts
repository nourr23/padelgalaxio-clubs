import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { AppRole, Club, Database } from "@/src/types/database";

export const CLUBS_APP_ACCESS_DENIED = "clubs_app_access_denied";

const ALLOWED_ROLES: readonly AppRole[] = ["club", "admin"];

export type ClubsAccess =
  | {
      ok: true;
      user: User;
      role: AppRole;
      club: Club | null;
    }
  | {
      ok: false;
      reason: "unauthenticated" | "forbidden" | string;
    };

export function isAllowedClubsRole(role: AppRole | null | undefined): boolean {
  return role != null && ALLOWED_ROLES.includes(role);
}

/**
 * After auth: allow only club/admin. Admins always pass.
 * Club owners pass when they own a club (or when role is club — empty club is ok for MVP).
 */
export async function assertClubsAppAccess(
  supabase: SupabaseClient<Database>,
): Promise<ClubsAccess> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return { ok: false, reason: userError.message };
  }
  if (!user) {
    return { ok: false, reason: "unauthenticated" };
  }

  const { data: roleRow, error: roleError } = await supabase
    .from("roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleError) {
    return { ok: false, reason: roleError.message };
  }

  if (!isAllowedClubsRole(roleRow?.role)) {
    await supabase.auth.signOut();
    return { ok: false, reason: CLUBS_APP_ACCESS_DENIED };
  }

  const role = roleRow!.role;

  if (role === "admin") {
    return { ok: true, user, role, club: null };
  }

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("*")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (clubError) {
    return { ok: false, reason: clubError.message };
  }

  return { ok: true, user, role, club };
}
