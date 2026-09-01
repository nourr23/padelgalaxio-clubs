"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { requestGameDeletion } from "@/src/features/schedule/actions";
import {
  canRequestGameDeletion,
  type GameDeletionRequest,
} from "@/src/features/schedule/game-detail";
import type { GameStatus } from "@/src/types/database";

type GameDeletionRequestPanelProps = {
  clubId: string;
  gameId: string;
  gameStatus: GameStatus | null;
  deletionRequest: GameDeletionRequest | null;
};

export function GameDeletionRequestPanel({
  clubId,
  gameId,
  gameStatus,
  deletionRequest,
}: GameDeletionRequestPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canRequest = canRequestGameDeletion(gameStatus, deletionRequest);

  function submitRequest() {
    setError(null);
    startTransition(async () => {
      const result = await requestGameDeletion(clubId, gameId, reason);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirmOpen(false);
      setSuccess(true);
      router.refresh();
    });
  }

  if (deletionRequest?.status === "pending") {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <p className="text-sm font-semibold text-amber-900">
          Cancellation requested
        </p>
        <p className="mt-1 text-sm text-amber-800">
          Your request is pending admin review. The booking stays on the calendar
          until an admin approves the cancellation.
        </p>
        {deletionRequest.reason ? (
          <p className="mt-3 text-xs text-amber-800/90">
            Reason: {deletionRequest.reason}
          </p>
        ) : null}
      </section>
    );
  }

  if (deletionRequest?.status === "rejected") {
    return (
      <section className="space-y-3">
        <div className="rounded-2xl border border-border bg-field p-5">
          <p className="text-sm font-semibold text-foreground">
            Previous request declined
          </p>
          <p className="mt-1 text-sm text-muted">
            An admin declined your last cancellation request. You can submit a
            new one if needed.
          </p>
        </div>
        {canRequest ? (
          <RequestButton
            pending={pending}
            onClick={() => setConfirmOpen(true)}
          />
        ) : null}
        {confirmOpen ? (
          <ConfirmDialog
            reason={reason}
            pending={pending}
            error={error}
            onReasonChange={setReason}
            onCancel={() => setConfirmOpen(false)}
            onConfirm={submitRequest}
          />
        ) : null}
      </section>
    );
  }

  if (!canRequest) return null;

  return (
    <section className="space-y-3">
      {success ? (
        <p className="text-sm font-medium text-brand-soft">
          Request sent. An admin will review it shortly.
        </p>
      ) : null}
      <RequestButton pending={pending} onClick={() => setConfirmOpen(true)} />
      {confirmOpen ? (
        <ConfirmDialog
          reason={reason}
          pending={pending}
          error={error}
          onReasonChange={setReason}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={submitRequest}
        />
      ) : null}
    </section>
  );
}

function RequestButton({
  pending,
  onClick,
}: {
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60 sm:w-auto"
    >
      Request cancellation
    </button>
  );
}

function ConfirmDialog({
  reason,
  pending,
  error,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  reason: string;
  pending: boolean;
  error: string | null;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close dialog"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-panel p-6 shadow-xl">
        <h2 className="font-display text-xl font-semibold text-brand">
          Request cancellation?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          This sends a cancellation request to an admin. The booking stays active
          until approved — players are not notified automatically.
        </p>

        <label className="mt-5 block">
          <span className="mb-2 block text-[11px] font-semibold tracking-wider text-muted uppercase">
            Reason (optional)
          </span>
          <textarea
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            rows={3}
            placeholder="e.g. Court maintenance, double booking…"
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
            onClick={onCancel}
            disabled={pending}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-field hover:text-foreground disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-deep disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send request"}
          </button>
        </div>
      </div>
    </div>
  );
}
