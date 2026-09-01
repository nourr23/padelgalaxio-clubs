"use client";

import { useCallback, useEffect, useId, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import {
  fetchClubNotifications,
  fetchUnreadNotificationCount,
  type ClubNotification,
} from "@/src/features/notifications/queries";

const REFETCH_DEBOUNCE_MS = 300;

type UseNotificationsResult = {
  notifications: ClubNotification[];
  unreadCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

export function useNotifications(
  userId: string,
  initialNotifications: ClubNotification[],
  initialUnreadCount: number,
): UseNotificationsResult {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isLoading, setIsLoading] = useState(false);
  const subscriptionId = useId();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const [nextNotifications, nextUnreadCount] = await Promise.all([
        fetchClubNotifications(supabase, userId),
        fetchUnreadNotificationCount(supabase, userId),
      ]);
      setNotifications(nextNotifications);
      setUnreadCount(nextUnreadCount);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setNotifications(initialNotifications);
    setUnreadCount(initialUnreadCount);
  }, [initialNotifications, initialUnreadCount]);

  useEffect(() => {
    const supabase = createClient();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void refresh();
      }, REFETCH_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(`club-notifications:${userId}:${subscriptionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      void supabase.removeChannel(channel);
    };
  }, [refresh, subscriptionId, userId]);

  return { notifications, unreadCount, isLoading, refresh };
}
