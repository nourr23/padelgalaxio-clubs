import type { Club } from "@/src/types/database";

export type SlotDef = {
  label: string;
  start: string;
  end: string;
};

const DEFAULT_START = { h: 8, m: 0 };
const DEFAULT_END = { h: 22, m: 0 };
const DEFAULT_DURATION = 90;

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function parseTimeParts(
  value: string | null | undefined,
  fallbackH: number,
  fallbackM: number,
) {
  if (!value) return { h: fallbackH, m: fallbackM };
  const parts = value.split(":");
  const h = parseInt(parts[0] ?? "", 10);
  const m = parseInt(parts[1] ?? "", 10);
  return {
    h: Number.isFinite(h) ? h : fallbackH,
    m: Number.isFinite(m) ? m : fallbackM,
  };
}

export function getDaySlotStartsForClub(club: Club | null): SlotDef[] {
  const duration = club?.slot_duration_minutes ?? DEFAULT_DURATION;
  const start = parseTimeParts(club?.first_slot_start, DEFAULT_START.h, DEFAULT_START.m);
  const endLimit = parseTimeParts(club?.last_session_end, DEFAULT_END.h, DEFAULT_END.m);
  const slots: SlotDef[] = [];

  let h = start.h;
  let m = start.m;

  while (true) {
    const startMin = h * 60 + m;
    const endMin = startMin + duration;
    const endH = Math.floor(endMin / 60);
    const endM = endMin % 60;

    if (endH > endLimit.h || (endH === endLimit.h && endM > endLimit.m)) break;

    slots.push({
      label: `${h}:${pad2(m)} – ${endH}:${pad2(endM)}`,
      start: `${pad2(h)}:${pad2(m)}`,
      end: `${pad2(endH)}:${pad2(endM)}`,
    });

    const next = startMin + duration;
    h = Math.floor(next / 60);
    m = next % 60;
  }

  return slots;
}

export function toYmd(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseYmd(ymd: string) {
  const [y, mo, d] = ymd.split("-").map(Number);
  if (!y || !mo || !d) return null;
  const date = new Date(y, mo - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== mo - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

export function addDays(ymd: string, days: number) {
  const date = parseYmd(ymd);
  if (!date) return ymd;
  date.setDate(date.getDate() + days);
  return toYmd(date);
}

export function slotBounds(ymd: string, slot: SlotDef) {
  const start = new Date(`${ymd}T${slot.start}:00`);
  const end = new Date(`${ymd}T${slot.end}:00`);
  return { start, end };
}

export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
) {
  return aStart < bEnd && aEnd > bStart;
}

export function formatDisplayDate(ymd: string) {
  const date = parseYmd(ymd);
  if (!date) return ymd;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatShortWeekday(ymd: string) {
  const date = parseYmd(ymd);
  if (!date) return ymd;
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

export function formatShortDay(ymd: string) {
  const date = parseYmd(ymd);
  if (!date) return ymd;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function getWeekDates(ymd: string) {
  const date = parseYmd(ymd);
  if (!date) return [ymd];
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(monday);
    next.setDate(monday.getDate() + index);
    return toYmd(next);
  });
}

export type MonthDay = {
  ymd: string;
  inMonth: boolean;
};

export function getMonthParts(ymd: string) {
  const date = parseYmd(ymd);
  if (!date) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function toMonthKey(year: number, month: number) {
  return `${year}-${pad2(month + 1)}`;
}

export function addMonths(year: number, month: number, delta: number) {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function getMonthGrid(year: number, month: number): MonthDay[] {
  const firstOfMonth = new Date(year, month, 1);
  const day = firstOfMonth.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() + mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      ymd: toYmd(date),
      inMonth: date.getMonth() === month,
    };
  });
}

export function formatMonthYear(year: number, month: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));
}

export function isToday(ymd: string) {
  return ymd === toYmd(new Date());
}

export function monthRangeIso(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}
