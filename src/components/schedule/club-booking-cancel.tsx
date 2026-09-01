"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cancelClubBooking } from "@/src/features/schedule/actions";
import type { GameStatus } from "@/src/types/database";

type ClubBookingCancelPanelProps = {
  clubId: string;
  gameId: string;
  gameStatus: GameStatus | null;
  bookedByClub: boolean;
};

export function ClubBookingCancelPanel({
  clubId,
  gameId,
  gameStatus,
  bookedByClub,
}: ClubBookingCancelPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!bookedByClub || gameStatus === "cancelled" || gameStatus === "completed") {
    return null;
  }

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelClubBooking(clubId, gameId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60 sm:w-auto"
      >
        Cancel club booking
      </button>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close dialog"
            onClick={() => setConfirmOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-panel p-6 shadow-xl">
            <h2 className="font-display text-xl font-semibold text-brand">
              Cancel this booking?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              The court slot will become available again in the player app.
            </p>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {error}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={pending}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-field hover:text-foreground disabled:opacity-60"
              >
                Keep booking
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={pending}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {pending ? "Cancelling…" : "Cancel booking"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
