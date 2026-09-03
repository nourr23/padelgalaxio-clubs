import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/src/types/database";

export const INBOX_NOTIFICATION_LIMIT = 50;

export type ClubNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  actorUserId: string | null;
  readAt: string | null;
  createdAt: string;
};

function asData(value: Json | null): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

type RawNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Json | null;
  actor_user_id: string | null;
  read_at: string | null;
  created_at: string;
};

export async function fetchClubNotifications(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ClubNotification[]> {
  const { data, error } = await supabase
    .from("notifications" as never)
    .select(
      "id, type, title, body, data, actor_user_id, read_at, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(INBOX_NOTIFICATION_LIMIT);

  if (error) {
    throw error;
  }

  return ((data ?? []) as RawNotification[]).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: asData(row.data),
    actorUserId: row.actor_user_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

export async function fetchUnreadNotificationCount(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications" as never)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export function formatNotificationTime(iso: string, now = Date.now()) {
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const minutes = Math.round(diffMs / 60_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}
