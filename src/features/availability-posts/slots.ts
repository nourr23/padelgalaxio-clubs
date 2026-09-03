import type { Club } from "@/src/types/database";
import { getDaySlotStartsForClub, type SlotDef } from "@/src/features/schedule/slots";

export const BLOCKING_GAME_STATUSES = ["open", "full", "completed"] as const;

export type CourtRow = {
  id: string;
  name: string;
  sort_order: number | null;
  environment: string | null;
};

export type GameRow = {
  court_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
};

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export function parseYmdToLocalDate(ymd: string): Date | null {
  const parts = ymd.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, mo, d] = parts;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return null;
  }
  return dt;
}

export function startOfLocalDay(d: Date = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function isSlotStartInPast(ymd: string, start: string, now: Date = new Date()) {
  const startsAt = new Date(`${ymd}T${start}:00`);
  if (Number.isNaN(startsAt.getTime())) return true;
  return startsAt.getTime() <= now.getTime();
}

export function slotKey(ymd: string, start: string) {
  return `${ymd}-${start}`;
}

export function rangesOverlap(a0: Date, a1: Date, b0: Date, b1: Date) {
  return a0 < b1 && b0 < a1;
}

export function getClubDaySlots(club: Club): SlotDef[] {
  return getDaySlotStartsForClub(club);
}

export function filterFutureSlots(
  ymd: string,
  slots: SlotDef[],
  now: Date = new Date(),
): SlotDef[] {
  return slots.filter((slot) => !isSlotStartInPast(ymd, slot.start, now));
}

export function computeFullSlotKeys(
  ymd: string,
  slots: SlotDef[],
  courts: CourtRow[],
  games: GameRow[],
): Set<string> {
  const full = new Set<string>();
  const n = courts.length;
  if (n === 0) {
    for (const slot of slots) full.add(slotKey(ymd, slot.start));
    return full;
  }

  const blocking = games.filter((game) =>
    BLOCKING_GAME_STATUSES.includes(
      game.status as (typeof BLOCKING_GAME_STATUSES)[number],
    ),
  );

  for (const slot of slots) {
    const slotStart = new Date(`${ymd}T${slot.start}:00`);
    const slotEnd = new Date(`${ymd}T${slot.end}:00`);
    if (Number.isNaN(slotStart.getTime()) || Number.isNaN(slotEnd.getTime())) {
      continue;
    }

    const busyCourts = new Set<string>();
    for (const game of blocking) {
      const gameStart = new Date(game.starts_at);
      const gameEnd = new Date(game.ends_at);
      if (Number.isNaN(gameStart.getTime()) || Number.isNaN(gameEnd.getTime())) {
        continue;
      }
      if (rangesOverlap(slotStart, slotEnd, gameStart, gameEnd)) {
        busyCourts.add(game.court_id);
      }
    }

    if (busyCourts.size >= n) {
      full.add(slotKey(ymd, slot.start));
    }
  }

  return full;
}

export function listFreeSlotStarts(
  ymd: string,
  club: Club,
  courts: CourtRow[],
  games: GameRow[],
  now: Date = new Date(),
): string[] {
  const slots = getClubDaySlots(club);
  const futureSlots = filterFutureSlots(ymd, slots, now);
  const fullKeys = computeFullSlotKeys(ymd, futureSlots, courts, games);

  return futureSlots
    .filter((slot) => !fullKeys.has(slotKey(ymd, slot.start)))
    .map((slot) => slot.start);
}

export function isValidSlotTime(value: string, club: Club): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const allowed = new Set(getClubDaySlots(club).map((slot) => slot.start));
  return allowed.has(value);
}

export function formatSlotLabelFr(start: string) {
  const [h, m] = start.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return start;
  return `${h}h${pad2(m)}`;
}

export function maxSelectableDateYmd(daysAhead = 7, now = new Date()) {
  const end = new Date(now);
  end.setDate(end.getDate() + daysAhead);
  return `${end.getFullYear()}-${pad2(end.getMonth() + 1)}-${pad2(end.getDate())}`;
}
