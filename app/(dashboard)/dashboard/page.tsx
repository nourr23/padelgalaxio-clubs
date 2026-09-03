import type { Metadata } from "next";

import { assertClubsAppAccess } from "@/lib/auth/assert-clubs-access";
import { createClient } from "@/lib/supabase/server";
import { DashboardLive } from "@/src/components/dashboard/dashboard-live";
import { getDashboardData } from "@/src/features/dashboard/queries";
import { getWeatherForCity } from "@/src/features/dashboard/weather";

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

  const clubCity = access.club?.city ?? null;

  const [dashboardData, weather] = await Promise.all([
    getDashboardData(supabase, access.club?.id ?? null),
    getWeatherForCity(clubCity),
  ]);

  return (
    <DashboardLive
      clubId={access.club?.id ?? null}
      initialData={dashboardData}
      displayName={displayName}
      clubName={access.club?.name ?? null}
      clubCity={clubCity}
      weather={weather}
    />
  );
}
