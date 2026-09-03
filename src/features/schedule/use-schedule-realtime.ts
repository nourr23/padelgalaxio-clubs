"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

const REFETCH_DEBOUNCE_MS = 400;
const POLL_INTERVAL_MS = 30_000;

export function useScheduleRealtime(clubId: string, courtIds: string[]) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const courtIdsKey = courtIds.slice().sort().join(",");

  const bump = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;
    const supabase = createClient();

    const scheduleBump = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(bump, REFETCH_DEBOUNCE_MS);
    };

    const channel = supabase.channel(`club-schedule:${clubId}`);

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "courts",
        filter: `club_id=eq.${clubId}`,
      },
      scheduleBump,
    );

    for (const courtId of courtIds) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
          filter: `court_id=eq.${courtId}`,
        },
        scheduleBump,
      );
    }

    channel.subscribe((status) => {
      if (!isMounted) return;
      setIsLive(status === "SUBSCRIBED");
    });

    const pollTimer = setInterval(bump, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      clearInterval(pollTimer);
      void supabase.removeChannel(channel);
    };
  }, [bump, clubId, courtIdsKey, courtIds]);

  return { refreshKey, isLive };
}
