"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import {
  getDashboardData,
  type DashboardData,
} from "@/src/features/dashboard/queries";

const REFETCH_DEBOUNCE_MS = 400;
const POLL_INTERVAL_MS = 30_000;

type UseDashboardRealtimeResult = DashboardData & {
  isLive: boolean;
};

export function useDashboardRealtime(
  clubId: string | null,
  initialData: DashboardData,
): UseDashboardRealtimeResult {
  const [data, setData] = useState(initialData);
  const [isLive, setIsLive] = useState(false);
  const courtIdsKey = data.courtIds.slice().sort().join(",");

  const refetch = useCallback(async () => {
    if (!clubId) return;
    const supabase = createClient();
    const next = await getDashboardData(supabase, clubId);
    setData(next);
  }, [clubId]);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  useEffect(() => {
    if (!clubId) return;

    const supabase = createClient();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;

    const scheduleRefetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void refetch();
      }, REFETCH_DEBOUNCE_MS);
    };

    const channel = supabase.channel(`club-dashboard:${clubId}`);

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "courts",
        filter: `club_id=eq.${clubId}`,
      },
      scheduleRefetch,
    );

    for (const courtId of data.courtIds) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
          filter: `court_id=eq.${courtId}`,
        },
        scheduleRefetch,
      );
    }

    channel.subscribe((status) => {
      if (!isMounted) return;
      setIsLive(status === "SUBSCRIBED");
    });

    const pollTimer = setInterval(() => {
      void refetch();
    }, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      clearInterval(pollTimer);
      void supabase.removeChannel(channel);
    };
  }, [clubId, courtIdsKey, data.courtIds, refetch]);

  return { ...data, isLive };
}
