import { redirect } from "next/navigation";

import { assertClubsAppAccess } from "@/lib/auth/assert-clubs-access";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/src/components/dashboard/dashboard-shell";
import {
  fetchClubNotifications,
  fetchUnreadNotificationCount,
} from "@/src/features/notifications/queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const access = await assertClubsAppAccess(supabase);

  if (!access.ok) {
    redirect("/login");
  }

  const metaName =
    typeof access.user.user_metadata?.full_name === "string"
      ? access.user.user_metadata.full_name
      : typeof access.user.user_metadata?.name === "string"
        ? access.user.user_metadata.name
        : null;

  const displayName =
    metaName?.trim() ||
    access.user.email?.split("@")[0] ||
    "Club manager";

  const roleLabel = access.role === "admin" ? "Admin" : "Manager";

  const [initialNotifications, initialUnreadCount] = await Promise.all([
    fetchClubNotifications(supabase, access.user.id),
    fetchUnreadNotificationCount(supabase, access.user.id),
  ]);

  return (
    <DashboardShell
      userId={access.user.id}
      displayName={displayName}
      roleLabel={roleLabel}
      clubName={access.club?.name ?? null}
      email={access.user.email ?? ""}
      initialNotifications={initialNotifications}
      initialUnreadCount={initialUnreadCount}
    >
      {children}
    </DashboardShell>
  );
}
