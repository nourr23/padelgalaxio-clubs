"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { ClubBookingSheet } from "@/src/components/schedule/club-booking-sheet";
import { ScheduleDatePicker } from "@/src/components/schedule/schedule-date-picker";
import {
  getScheduleForDate,
  getWeekSummaries,
  type ScheduleDayData,
} from "@/src/features/schedule/queries";
import { useScheduleRealtime } from "@/src/features/schedule/use-schedule-realtime";
import {
  addDays,
  formatDisplayDate,
  formatShortDay,
  formatShortWeekday,
  getWeekDates,
  toYmd,
  type SlotDef,
} from "@/src/features/schedule/slots";
import type { ScheduleCourt } from "@/src/features/schedule/queries";
import type { Club } from "@/src/types/database";

type ScheduleCalendarProps = {
  club: Club;
  initialYmd: string;
  initialData: ScheduleDayData;
};

type ViewMode = "day" | "week";

export function ScheduleCalendar({
  club,
  initialYmd,
  initialData,
}: ScheduleCalendarProps) {
  const [view, setView] = useState<ViewMode>("day");
  const [ymd, setYmd] = useState(initialYmd);
  const [data, setData] = useState(initialData);
  const [weekSummaries, setWeekSummaries] = useState<Record<string, number>>(
    {},
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [bookingCourt, setBookingCourt] = useState<ScheduleCourt | null>(null);
  const [bookingSlot, setBookingSlot] = useState<SlotDef | null>(null);

  const courtIds = useMemo(
    () => data.courts.map((court) => court.id),
    [data.courts],
  );
  const { refreshKey, isLive } = useScheduleRealtime(club.id, courtIds);

  useEffect(() => {
    setYmd(initialYmd);
    setData(initialData);
  }, [initialYmd, initialData]);

  const weekDates = getWeekDates(ymd);
  const weekDatesKey = weekDates.join(",");
  const slotDuration = club.slot_duration_minutes ?? 90;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const supabase = createClient();
      const next = await getScheduleForDate(supabase, club, ymd);
      if (cancelled) return;
      setData(next);

      if (view === "week") {
        const summaries = await getWeekSummaries(
          supabase,
          club,
          getWeekDates(ymd),
        );
        if (cancelled) return;
        setWeekSummaries(summaries);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [club, view, ymd, weekDatesKey, refreshKey]);

  function shiftDate(days: number) {
    setYmd((current) => addDays(current, days));
  }

  function goToday() {
    setYmd(toYmd(new Date()));
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-brand sm:text-3xl">
            Booking Schedule
          </h1>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
              isLive
                ? "bg-accent/20 text-brand-soft"
                : "bg-field text-muted"
            }`}
          >
            {isLive ? "Live" : "Syncing"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-xl border border-border bg-panel p-1">
            <button
              type="button"
              onClick={() => setView("day")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                view === "day"
                  ? "bg-brand text-white"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => setView("week")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                view === "week"
                  ? "bg-brand text-white"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Week
            </button>
          </div>

          <button
            type="button"
            disabled
            title="Coming soon"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-panel px-3 py-2 text-sm font-semibold text-muted opacity-70"
          >
            <IconFilter />
            Filters
          </button>
        </div>
      </div>

      <div className="relative mb-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => shiftDate(view === "day" ? -1 : -7)}
          className="rounded-lg p-2 text-muted transition hover:bg-field hover:text-foreground"
          aria-label="Previous"
        >
          <IconChevron direction="left" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen((open) => !open)}
            className="min-w-[220px] rounded-xl bg-field px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-border/60"
            aria-expanded={pickerOpen}
            aria-haspopup="dialog"
          >
            {view === "day"
              ? formatDisplayDate(ymd)
              : `Week of ${formatShortDay(weekDates[0] ?? ymd)}`}
          </button>

          <ScheduleDatePicker
            clubId={club.id}
            selectedYmd={ymd}
            open={pickerOpen}
            refreshKey={refreshKey}
            onClose={() => setPickerOpen(false)}
            onSelect={(nextYmd) => {
              setYmd(nextYmd);
              if (view === "week") setView("day");
            }}
          />
        </div>

        <button
          type="button"
          onClick={goToday}
          className="rounded-xl border border-border bg-panel px-3 py-2 text-xs font-semibold text-brand transition hover:bg-field"
        >
          Today
        </button>

        <button
          type="button"
          onClick={() => shiftDate(view === "day" ? 1 : 7)}
          className="rounded-lg p-2 text-muted transition hover:bg-field hover:text-foreground"
          aria-label="Next"
        >
          <IconChevron direction="right" />
        </button>
      </div>

      {view === "day" ? (
        <DayGrid
          ymd={ymd}
          data={data}
          onBookSlot={(court, slot) => {
            setBookingCourt(court);
            setBookingSlot(slot);
          }}
        />
      ) : (
        <WeekGrid
          weekDates={weekDates}
          selectedYmd={ymd}
          courts={data.courts}
          summaries={weekSummaries}
          onSelectDay={setYmd}
          onOpenDay={() => setView("day")}
        />
      )}

      <ClubBookingSheet
        clubId={club.id}
        ymd={ymd}
        court={bookingCourt}
        slot={bookingSlot}
        open={bookingCourt != null && bookingSlot != null}
        onClose={() => {
          setBookingCourt(null);
          setBookingSlot(null);
        }}
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Daily Occupancy"
          value={`${data.stats.occupancyPercent}%`}
          icon={<IconChart />}
          accent
        />
        <StatCard
          label="Bookings Today"
          value={String(data.stats.bookingsToday)}
          icon={<IconCalendar />}
          accent
        />
        <StatCard
          label="Players Today"
          value={String(data.stats.uniquePlayers)}
          icon={<IconUsers />}
        />
        <StatCard
          label="Maintenance Slots"
          value={String(data.stats.maintenanceSlots)}
          subtitle={`${slotDuration} min slots`}
          icon={<IconWrench />}
        />
      </div>
    </div>
  );
}

function DayGrid({
  ymd,
  data,
  onBookSlot,
}: {
  ymd: string;
  data: ScheduleDayData;
  onBookSlot: (court: ScheduleCourt, slot: SlotDef) => void;
}) {
  if (!data.courts.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-panel px-6 py-16 text-center">
        <p className="font-medium text-foreground">No courts configured</p>
        <p className="mt-2 text-sm text-muted">
          Add courts first to see the booking schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-panel shadow-sm">
      <div
        className="grid min-w-[880px]"
        style={{
          gridTemplateColumns: `88px repeat(${data.courts.length}, minmax(180px, 1fr))`,
        }}
      >
        <div className="border-b border-r border-border bg-field/60 p-3" />
        {data.courts.map((court) => (
          <div
            key={court.id}
            className="border-b border-r border-border bg-field/60 px-3 py-3 last:border-r-0"
          >
            <p className="text-sm font-semibold text-brand">{court.name}</p>
            <p className="text-xs text-muted capitalize">
              {court.environment ?? "Court"}
            </p>
          </div>
        ))}

        {data.slots.map((slot) => (
          <SlotRow
            key={slot.start}
            ymd={ymd}
            slot={slot}
            courts={data.courts}
            cells={data.cells}
            onBookSlot={onBookSlot}
          />
        ))}
      </div>
    </div>
  );
}

function SlotRow({
  ymd,
  slot,
  courts,
  cells,
  onBookSlot,
}: {
  ymd: string;
  slot: ScheduleDayData["slots"][number];
  courts: ScheduleDayData["courts"];
  cells: ScheduleDayData["cells"];
  onBookSlot: (court: ScheduleCourt, slot: SlotDef) => void;
}) {
  return (
    <>
      <div className="border-b border-r border-border px-3 py-4 text-sm font-medium text-muted">
        {slot.start}
      </div>
      {courts.map((court) => {
        const cell = cells[court.id]?.[slot.start];
        if (!cell) return null;

        if (cell.type === "maintenance") {
          return (
            <div
              key={`${court.id}-${slot.start}`}
              className="border-b border-r border-border bg-[repeating-linear-gradient(-45deg,transparent,transparent_8px,rgba(0,0,0,0.03)_8px,rgba(0,0,0,0.03)_16px)] p-2 last:border-r-0"
            >
              <div className="flex h-full min-h-[72px] items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-field/80 text-xs font-semibold tracking-wider text-muted uppercase">
                <IconWrench />
                Maintenance
              </div>
            </div>
          );
        }

        if (cell.type === "booked") {
          return (
            <div
              key={`${court.id}-${slot.start}`}
              className="border-b border-r border-border p-2 last:border-r-0"
            >
              <Link
                href={`/dashboard/schedule/${cell.game.id}?from=${ymd}`}
                className={`flex h-full min-h-[72px] flex-col justify-between rounded-xl p-3 text-white shadow-sm transition ${
                  cell.game.bookedByClub
                    ? "bg-brand-soft hover:bg-brand"
                    : "bg-brand hover:bg-brand-deep"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{cell.game.hostName}</p>
                  {cell.game.bookedByClub ? (
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
                      Club
                    </span>
                  ) : cell.game.isEvent ? (
                    <span className="rounded-full bg-accent/25 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
                      Event
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-white/80">{cell.game.subtitle}</p>
                <p className="text-[11px] text-white/70">
                  {cell.game.playersLabel}
                </p>
              </Link>
            </div>
          );
        }

        return (
          <div
            key={`${court.id}-${slot.start}`}
            className="border-b border-r border-border p-2 last:border-r-0"
          >
            <button
              type="button"
              onClick={() => onBookSlot(court, slot)}
              className="flex h-full min-h-[72px] w-full items-center justify-center rounded-xl border border-dashed border-border bg-white text-xl text-muted/50 transition hover:border-brand-soft hover:bg-field hover:text-brand"
              aria-label={`Book ${court.name} at ${slot.start}`}
            >
              +
            </button>
          </div>
        );
      })}
    </>
  );
}

function WeekGrid({
  weekDates,
  selectedYmd,
  courts,
  summaries,
  onSelectDay,
  onOpenDay,
}: {
  weekDates: string[];
  selectedYmd: string;
  courts: ScheduleDayData["courts"];
  summaries: Record<string, number>;
  onSelectDay: (ymd: string) => void;
  onOpenDay: () => void;
}) {
  if (!courts.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-panel px-6 py-16 text-center text-sm text-muted">
        No courts configured.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-panel shadow-sm">
      <div
        className="grid min-w-[720px]"
        style={{
          gridTemplateColumns: `160px repeat(${weekDates.length}, minmax(100px, 1fr))`,
        }}
      >
        <div className="border-b border-r border-border bg-field/60 p-3 text-xs font-semibold tracking-wider text-muted uppercase">
          Court
        </div>
        {weekDates.map((date) => (
          <button
            key={date}
            type="button"
            onClick={() => {
              onSelectDay(date);
              onOpenDay();
            }}
            className={`border-b border-r border-border p-3 text-left transition last:border-r-0 ${
              date === selectedYmd ? "bg-brand/5" : "bg-field/60 hover:bg-field"
            }`}
          >
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">
              {formatShortWeekday(date)}
            </p>
            <p className="text-sm font-semibold text-brand">{formatShortDay(date)}</p>
          </button>
        ))}

        {courts.map((court) => (
          <WeekCourtRow
            key={court.id}
            court={court}
            weekDates={weekDates}
            summaries={summaries}
            onSelectDay={onSelectDay}
            onOpenDay={onOpenDay}
          />
        ))}
      </div>
    </div>
  );
}

function WeekCourtRow({
  court,
  weekDates,
  summaries,
  onSelectDay,
  onOpenDay,
}: {
  court: ScheduleDayData["courts"][number];
  weekDates: string[];
  summaries: Record<string, number>;
  onSelectDay: (ymd: string) => void;
  onOpenDay: () => void;
}) {
  return (
    <>
      <div className="border-b border-r border-border px-3 py-4">
        <p className="text-sm font-semibold text-brand">{court.name}</p>
        {!court.isActive ? (
          <p className="mt-1 text-xs text-amber-700">Maintenance</p>
        ) : null}
      </div>
      {weekDates.map((date) => (
        <button
          key={`${court.id}-${date}`}
          type="button"
          onClick={() => {
            onSelectDay(date);
            onOpenDay();
          }}
          className="border-b border-r border-border p-3 text-left transition last:border-r-0 hover:bg-field/70"
        >
          <p className="text-lg font-semibold text-brand">
            {summaries[date] ?? 0}
          </p>
          <p className="text-xs text-muted">bookings</p>
        </button>
      ))}
    </>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl font-semibold text-brand">
            {value}
          </p>
          {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
        </div>
        <span
          className={`rounded-xl p-2.5 ${
            accent ? "bg-brand/10 text-brand" : "bg-field text-muted"
          }`}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

function IconChevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      {direction === "left" ? <path d="m15 6-6 6 6 6" /> : <path d="m9 6 6 6-6 6" />}
    </svg>
  );
}

function IconFilter() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 20V10M10 20V4M16 20v-6M22 20V8" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 11h18" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 19c1.2-3.2 3.8-5 6.5-5s5.3 1.8 6.5 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M14.5 14.2c1.3-.7 2.9-1 4.5-.7 1.7.3 3.1 1.3 4 2.8" />
    </svg>
  );
}

function IconWrench() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-3.3-3.3 2.1-2.1Z" />
    </svg>
  );
}
