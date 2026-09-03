const CLUB_NOTIFICATION_TYPES = new Set([
  "club_new_booking",
  "club_game_cancelled",
  "club_game_deleted",
  "club_deletion_approved",
  "club_deletion_rejected",
  "game_cancelled",
]);

export function isClubRelevantNotification(type: string) {
  return CLUB_NOTIFICATION_TYPES.has(type);
}

export function resolveNotificationHref(
  type: string,
  data: Record<string, unknown>,
): string | null {
  const gameId = data.gameId;
  if (typeof gameId === "string" && gameId.length > 0) {
    const from = data.from;
    const query =
      typeof from === "string" && from.length > 0 ? `?from=${from}` : "";
    return `/dashboard/schedule/${gameId}${query}`;
  }

  if (
    type === "club_deletion_approved" ||
    type === "club_deletion_rejected" ||
    type === "club_game_deleted"
  ) {
    const from = data.from;
    if (typeof from === "string" && from.length > 0) {
      return `/dashboard/schedule?date=${from}`;
    }
    return "/dashboard/history";
  }

  if (type === "club_new_booking" || type === "club_game_cancelled") {
    return "/dashboard/schedule";
  }

  return null;
}
