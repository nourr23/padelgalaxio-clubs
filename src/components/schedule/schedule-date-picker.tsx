"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { createClient } from "@/lib/supabase/client";
import { getMonthBookingCounts } from "@/src/features/schedule/queries";
import {
  addMonths,
  formatMonthYear,
  getMonthGrid,
  getMonthParts,
  isToday,
  parseYmd,
} from "@/src/features/schedule/slots";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type ScheduleDatePickerProps = {
  clubId: string;
  selectedYmd: string;
  open: boolean;
  refreshKey?: number;
  onClose: () => void;
  onSelect: (ymd: string) => void;
};

export function ScheduleDatePicker({
  clubId,
  selectedYmd,
  open,
  refreshKey = 0,
  onClose,
  onSelect,
}: ScheduleDatePickerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const initial = getMonthParts(selectedYmd);
  const [visibleYear, setVisibleYear] = useState(initial.year);
  const [visibleMonth, setVisibleMonth] = useState(initial.month);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>(
    {},
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const parts = getMonthParts(selectedYmd);
    setVisibleYear(parts.year);
    setVisibleMonth(parts.month);
  }, [open, selectedYmd]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    startTransition(async () => {
      const supabase = createClient();
      const counts = await getMonthBookingCounts(
        supabase,
        clubId,
        visibleYear,
        visibleMonth,
      );
      setBookingCounts(counts);
    });
  }, [clubId, open, refreshKey, visibleMonth, visibleYear]);

  if (!open) return null;

  const days = getMonthGrid(visibleYear, visibleMonth);

  function shiftMonth(delta: number) {
    const next = addMonths(visibleYear, visibleMonth, delta);
    setVisibleYear(next.year);
    setVisibleMonth(next.month);
  }

  function handleSelect(ymd: string) {
    onSelect(ymd);
    onClose();
  }

  return (
    <div
      ref={panelRef}
      className="absolute top-full left-1/2 z-50 mt-2 w-[min(100vw-2rem,320px)] -translate-x-1/2 rounded-2xl border border-border bg-panel p-4 shadow-xl"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded-lg p-2 text-muted transition hover:bg-field hover:text-foreground"
          aria-label="Previous month"
        >
          <IconChevron direction="left" />
        </button>
        <p className="text-sm font-semibold text-brand">
          {formatMonthYear(visibleYear, visibleMonth)}
        </p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="rounded-lg p-2 text-muted transition hover:bg-field hover:text-foreground"
          aria-label="Next month"
        >
          <IconChevron direction="right" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <span
            key={label}
            className="py-1 text-[10px] font-bold tracking-wider text-muted uppercase"
          >
            {label}
          </span>
        ))}

        {days.map((day) => {
          const date = parseYmd(day.ymd);
          const dayNumber = date?.getDate() ?? "";
          const selected = day.ymd === selectedYmd;
          const today = isToday(day.ymd);
          const bookings = bookingCounts[day.ymd] ?? 0;

          return (
            <button
              key={day.ymd}
              type="button"
              onClick={() => handleSelect(day.ymd)}
              className={`relative flex min-h-10 flex-col items-center justify-center rounded-xl text-sm transition ${
                selected
                  ? "bg-brand font-semibold text-white"
                  : day.inMonth
                    ? "text-foreground hover:bg-field"
                    : "text-muted/50 hover:bg-field/60"
              } ${today && !selected ? "ring-1 ring-brand/30" : ""}`}
            >
              <span>{dayNumber}</span>
              {bookings > 0 ? (
                <span
                  className={`mt-0.5 size-1.5 rounded-full ${
                    selected ? "bg-white" : "bg-accent"
                  }`}
                />
              ) : (
                <span className="mt-0.5 size-1.5" />
              )}
            </button>
          );
        })}
      </div>

      {pending ? (
        <p className="mt-3 text-center text-xs text-muted">Loading bookings…</p>
      ) : null}
    </div>
  );
}

function IconChevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      {direction === "left" ? (
        <path d="m15 6-6 6 6 6" />
      ) : (
        <path d="m9 6 6 6-6 6" />
      )}
    </svg>
  );
}
