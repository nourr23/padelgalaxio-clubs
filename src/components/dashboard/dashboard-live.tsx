"use client";

import { DashboardHome } from "@/src/components/dashboard/dashboard-home";
import type { DashboardData } from "@/src/features/dashboard/queries";
import { useDashboardRealtime } from "@/src/features/dashboard/use-dashboard-realtime";
import type { WeatherInfo } from "@/src/features/dashboard/weather";

type DashboardLiveProps = {
  clubId: string | null;
  initialData: DashboardData;
  displayName: string;
  clubName: string | null;
  clubCity: string | null;
  weather: WeatherInfo;
};

export function DashboardLive({
  clubId,
  initialData,
  displayName,
  clubName,
  clubCity,
  weather,
}: DashboardLiveProps) {
  const live = useDashboardRealtime(clubId, initialData);

  return (
    <DashboardHome
      displayName={displayName}
      clubName={clubName}
      clubCity={clubCity}
      stats={live.stats}
      upcomingSessions={live.upcomingSessions}
      weather={weather}
      recentActivity={live.recentActivity}
      inactiveCourtCount={live.inactiveCourtCount}
      isLive={live.isLive}
    />
  );
}
