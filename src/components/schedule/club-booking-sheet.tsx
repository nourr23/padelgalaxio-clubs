"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createClubBooking } from "@/src/features/schedule/actions";
import type { ScheduleCourt } from "@/src/features/schedule/queries";
import type { SlotDef } from "@/src/features/schedule/slots";
import { formatDisplayDate } from "@/src/features/schedule/slots";

type ClubBookingSheetProps = {
  clubId: string;
  ymd: string;
  court: ScheduleCourt | null;
  slot: SlotDef | null;
  open: boolean;
  onClose: () => void;
};

export function ClubBookingSheet({
  clubId,
  ymd,
  court,
  slot,
  open,
  onClose,
}: ClubBookingSheetProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open || !court || !slot) return null;

  function handleClose() {
    if (pending) return;
    setError(null);
    setNotes("");
    onClose();
  }

  function handleSubmit() {
    if (!court || !slot) return;
    setError(null);
    const startsAt = new Date(`${ymd}T${slot.start}:00`);
    const endsAt = new Date(`${ymd}T${slot.end}:00`);

    startTransition(async () => {
      const result = await createClubBooking(clubId, {
        courtId: court.id,
        startsAtIso: startsAt.toISOString(),
        endsAtIso: endsAt.toISOString(),
        notes,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setNotes("");
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close dialog"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-panel p-6 shadow-xl">
        <h2 className="font-display text-xl font-semibold text-brand">
          Book court
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Reserve {court.name} on {formatDisplayDate(ymd)} · {slot.label}. This
          blocks the slot for players in the app.
        </p>

        <label className="mt-5 block">
          <span className="mb-2 block text-[11px] font-semibold tracking-wider text-muted uppercase">
            Notes (optional)
          </span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="e.g. Walk-in, maintenance buffer, member name…"
            className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-brand-soft"
          />
        </label>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={pending}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-field hover:text-foreground disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-deep disabled:opacity-60"
          >
            {pending ? "Booking…" : "Confirm booking"}
          </button>
        </div>
      </div>
    </div>
  );
}
