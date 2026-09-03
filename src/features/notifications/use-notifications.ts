"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type {
  RealtimeChannel,
  RealtimePostgresInsertPayload,
} from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import {
  fetchClubNotifications,
  fetchUnreadNotificationCount,
  INBOX_NOTIFICATION_LIMIT,
  type ClubNotification,
} from "@/src/features/notifications/queries";

const REFETCH_DEBOUNCE_MS = 300;
const POLL_INTERVAL_MS = 20_000;

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  actor_user_id: string | null;
  read_at: string | null;
  created_at: string;
};

function mapNotificationRow(row: NotificationRow): ClubNotification | null {
  if (!row.id || !row.created_at) return null;

  const data =
    row.data && typeof row.data === "object" && !Array.isArray(row.data)
      ? (row.data as Record<string, unknown>)
      : {};

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    data,
    actorUserId: row.actor_user_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

type UseNotificationsResult = {
  notifications: ClubNotification[];
  unreadCount: number;
  isLoading: boolean;
  isLive: boolean;
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
  const [isLive, setIsLive] = useState(false);
  const subscriptionId = useId();
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const refresh = useCallback(async () => {
    const activeUserId = userIdRef.current;
    setIsLoading(true);
    try {
      const supabase = createClient();
      const [nextNotifications, nextUnreadCount] = await Promise.all([
        fetchClubNotifications(supabase, activeUserId),
        fetchUnreadNotificationCount(supabase, activeUserId),
      ]);
      setNotifications(nextNotifications);
      setUnreadCount(nextUnreadCount);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setNotifications(initialNotifications);
    setUnreadCount(initialUnreadCount);
  }, [initialNotifications, initialUnreadCount]);

  useEffect(() => {
    const supabase = createClient();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    const scheduleRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void refresh();
      }, REFETCH_DEBOUNCE_MS);
    };

    const handleInsert = (
      payload: RealtimePostgresInsertPayload<NotificationRow>,
    ) => {
      if (payload.errors?.length) {
        scheduleRefresh();
        return;
      }

      const next = mapNotificationRow(payload.new);
      if (!next) {
        scheduleRefresh();
        return;
      }

      setNotifications((current) => {
        if (current.some((item) => item.id === next.id)) {
          return current;
        }
        return [next, ...current].slice(0, INBOX_NOTIFICATION_LIMIT);
      });

      if (!next.readAt) {
        setUnreadCount((count) => count + 1);
      }
    };

    const removeChannel = () => {
      if (!channel) return;
      const current = channel;
      channel = null;
      void supabase.removeChannel(current);
    };

    const bindChannel = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session) {
        setIsLive(false);
        return;
      }

      removeChannel();

      const activeUserId = userIdRef.current;
      const nextChannel = supabase.channel(
        `club-notifications:${activeUserId}:${subscriptionId}`,
      );

      nextChannel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${activeUserId}`,
          },
          handleInsert,
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${activeUserId}`,
          },
          scheduleRefresh,
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${activeUserId}`,
          },
          scheduleRefresh,
        )
        .subscribe((status) => {
          if (cancelled) return;
          setIsLive(status === "SUBSCRIBED");
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            scheduleRefresh();
          }
        });

      channel = nextChannel;
    };

    void bindChannel();

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "INITIAL_SESSION"
      ) {
        void bindChannel();
      }
      if (event === "SIGNED_OUT") {
        removeChannel();
        setIsLive(false);
      }
    });

    pollTimer = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    const handleFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      if (pollTimer) clearInterval(pollTimer);
      window.removeEventListener("focus", handleFocus);
      authSubscription.unsubscribe();
      removeChannel();
    };
  }, [refresh, subscriptionId, userId]);

  return { notifications, unreadCount, isLoading, isLive, refresh };
}
