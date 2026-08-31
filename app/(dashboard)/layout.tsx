import { redirect } from "next/navigation";

import { assertClubsAppAccess } from "@/lib/auth/assert-clubs-access";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/src/components/dashboard/dashboard-shell";

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

  return (
    <DashboardShell
      displayName={displayName}
      roleLabel={roleLabel}
      clubName={access.club?.name ?? null}
      email={access.user.email ?? ""}
    >
      {children}
    </DashboardShell>
  );
}
