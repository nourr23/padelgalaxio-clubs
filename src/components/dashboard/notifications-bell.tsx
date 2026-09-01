"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { IconBell } from "@/src/components/dashboard/icons";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/src/features/notifications/actions";
import {
  formatNotificationTime,
  type ClubNotification,
} from "@/src/features/notifications/queries";
import { resolveNotificationHref } from "@/src/features/notifications/resolve-href";
import { useNotifications } from "@/src/features/notifications/use-notifications";

type NotificationsBellProps = {
  userId: string;
  initialNotifications: ClubNotification[];
  initialUnreadCount: number;
};

function notificationMeta(type: string) {
  switch (type) {
    case "club_game_deleted":
    case "club_deletion_approved":
      return { label: "Removed", tone: "bg-red-50 text-red-700" };
    case "club_game_cancelled":
      return { label: "Cancelled", tone: "bg-amber-50 text-amber-800" };
    case "club_deletion_rejected":
      return { label: "Declined", tone: "bg-field text-muted" };
    default:
      return { label: "Booking", tone: "bg-accent/20 text-brand-soft" };
  }
}

export function NotificationsBell({
  userId,
  initialNotifications,
  initialUnreadCount,
}: NotificationsBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, isLoading, refresh } = useNotifications(
    userId,
    initialNotifications,
    initialUnreadCount,
  );

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleNotificationClick(notification: ClubNotification) {
    startTransition(async () => {
      if (!notification.readAt) {
        await markNotificationRead(notification.id);
        await refresh();
      }

      const href = resolveNotificationHref(notification.type, notification.data);
      setOpen(false);
      if (href) {
        router.push(href);
      }
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead();
      await refresh();
    });
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`relative rounded-xl p-2.5 transition hover:bg-field ${
          open ? "bg-field text-brand" : "text-muted hover:text-foreground"
        }`}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
      >
        <IconBell />
        {unreadCount > 0 ? (
          <span
            aria-hidden
            className="absolute top-2 right-2 size-2 rounded-full bg-brand ring-2 ring-panel"
          />
        ) : null}
      </button>

      {open ? (
        <div className="absolute top-full right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-panel shadow-lg">
          <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              Notifications
              {unreadCount > 0 ? (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-field px-1.5 text-[11px] font-bold text-brand">
                  {unreadCount}
                </span>
              ) : null}
            </p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={pending}
                className="shrink-0 whitespace-nowrap text-xs font-semibold text-brand transition hover:text-brand-deep disabled:opacity-60"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              <ul>
                {notifications.map((notification) => {
                  const isUnread = !notification.readAt;
                  const meta = notificationMeta(notification.type);
                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                        disabled={pending}
                        className={`block w-full border-b border-border px-4 py-3.5 text-left transition last:border-b-0 hover:bg-field disabled:opacity-60 ${
                          isUnread ? "bg-field/50" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${meta.tone}`}
                              >
                                {meta.label}
                              </span>
                              {isUnread ? (
                                <span className="size-1.5 rounded-full bg-brand" />
                              ) : null}
                            </div>
                            <p
                              className={`mt-1.5 text-sm leading-snug ${
                                isUnread
                                  ? "font-semibold text-foreground"
                                  : "font-medium text-foreground/85"
                              }`}
                            >
                              {notification.title}
                            </p>
                          </div>
                          <span className="shrink-0 text-[11px] text-muted">
                            {formatNotificationTime(notification.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-muted">
                          {notification.body}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-4 py-10 text-center text-sm text-muted">
                {isLoading ? "Loading…" : "No notifications yet."}
              </p>
            )}
          </div>

          <div className="border-t border-border px-4 py-3">
            <Link
              href="/dashboard/schedule"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-brand transition hover:text-brand-deep"
            >
              Open calendar
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
