import type { Metadata } from "next";

import { assertClubsAppAccess } from "@/lib/auth/assert-clubs-access";
import { createClient } from "@/lib/supabase/server";
import { DashboardHome } from "@/src/components/dashboard/dashboard-home";
import { getDashboardData } from "@/src/features/dashboard/queries";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const access = await assertClubsAppAccess(supabase);

  if (!access.ok) {
    return null;
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

  const dashboardData = await getDashboardData(
    supabase,
    access.club?.id ?? null,
  );

  return (
    <DashboardHome
      displayName={displayName}
      clubName={access.club?.name ?? null}
      stats={dashboardData.stats}
      upcomingSessions={dashboardData.upcomingSessions}
    />
  );
}
