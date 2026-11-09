"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { updateCoachingRequest } from "@/src/features/coaching/actions";
import type { ClubCoachingRequest } from "@/src/features/coaching/queries";
import {
  OWNER_REQUEST_STATUSES,
  REQUEST_STATUS_LABELS,
  formatPrice,
  packageLabel,
  requestStatusSchema,
  type RequestStatusInput,
} from "@/src/features/coaching/validation";
import type { CoachingRequestStatus } from "@/src/types/database";

type Tab = "pending" | "contacted" | "confirmed" | "closed";

const TABS: { tab: Tab; label: string; statuses: CoachingRequestStatus[] }[] = [
  { tab: "pending", label: "Pending", statuses: ["pending"] },
  { tab: "contacted", label: "Contacted", statuses: ["contacted"] },
  { tab: "confirmed", label: "Confirmed", statuses: ["confirmed"] },
  { tab: "closed", label: "Closed", statuses: ["declined", "cancelled"] },
];

const STATUS_STYLES: Record<CoachingRequestStatus, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  contacted: "bg-sky-50 text-sky-800 border-sky-200",
  confirmed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  declined: "bg-field text-muted border-border",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

const inputClassName =
  "w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-sm text-foreground outline-none transition focus:border-brand-soft";

function tabOf(status: CoachingRequestStatus): Tab {
  return TABS.find((entry) => entry.statuses.includes(status))?.tab ?? "pending";
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function CoachingRequestsTable({
  clubId,
  requests,
  highlightId,
}: {
  clubId: string;
  requests: ClubCoachingRequest[];
  highlightId: string | null;
}) {
  const highlighted = requests.find((request) => request.id === highlightId);
  const [tab, setTab] = useState<Tab>(
    highlighted ? tabOf(highlighted.status) : "pending",
  );

  const counts = Object.fromEntries(
    TABS.map((entry) => [
      entry.tab,
      requests.filter((request) => entry.statuses.includes(request.status)).length,
    ]),
  ) as Record<Tab, number>;

  const statuses = TABS.find((entry) => entry.tab === tab)!.statuses;
  const visible = requests.filter((request) => statuses.includes(request.status));

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {TABS.map((entry) => (
          <button
            key={entry.tab}
            type="button"
            role="tab"
            aria-selected={tab === entry.tab}
            onClick={() => setTab(entry.tab)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
              tab === entry.tab
                ? "border-brand bg-brand text-white"
                : "border-border bg-white text-foreground/70 hover:border-brand-soft"
            }`}
          >
            {entry.label}
            <span
              className={`rounded-md px-1.5 text-xs ${
                tab === entry.tab ? "bg-white/20" : "bg-field"
              }`}
            >
              {counts[entry.tab]}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-panel px-6 py-10 text-center text-sm text-muted">
          {tab === "pending"
            ? "No new requests. Players request a package from the player app."
            : "Nothing here yet."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-panel shadow-sm">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Player</th>
                <th className="px-3 py-3">Package</th>
                <th className="px-3 py-3 text-center">Players</th>
                <th className="px-3 py-3">Player note</th>
                <th className="px-3 py-3">Status &amp; club note</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((request) => (
                <RequestRow
                  key={`${request.id}:${request.updatedAt}`}
                  clubId={clubId}
                  request={request}
                  highlighted={request.id === highlightId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RequestRow({
  clubId,
  request,
  highlighted,
}: {
  clubId: string;
  request: ClubCoachingRequest;
  highlighted: boolean;
}) {
  const router = useRouter();
  const rowRef = useRef<HTMLTableRowElement>(null);
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const readOnly = request.status === "cancelled";

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<RequestStatusInput>({
    resolver: zodResolver(requestStatusSchema),
    defaultValues: {
      status: readOnly ? "declined" : (request.status as RequestStatusInput["status"]),
      clubNote: request.clubNote ?? "",
    },
  });

  useEffect(() => {
    if (highlighted) rowRef.current?.scrollIntoView({ block: "center" });
  }, [highlighted]);

  function onSubmit(values: RequestStatusInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await updateCoachingRequest(clubId, request.id, values);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const pkg = request.package;
  const digits = request.player.phone?.replace(/\D/g, "") ?? "";
  const formId = `coaching-request-${request.id}`;

  return (
    <tr
      ref={rowRef}
      className={`border-t border-border align-top ${
        highlighted ? "bg-accent/15" : ""
      }`}
    >
      <td className="px-3 py-3 whitespace-nowrap text-foreground/80">
        {dateFormatter.format(new Date(request.createdAt))}
      </td>
      <td className="px-3 py-3">
        <p className="font-medium text-foreground">{request.player.name}</p>
        {request.player.phone ? (
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            <a
              href={`tel:${request.player.phone.replace(/[^\d+]/g, "")}`}
              className="font-medium text-brand underline-offset-2 hover:underline"
            >
              {request.player.phone}
            </a>
            {digits ? (
              <a
                href={`https://wa.me/${digits}`}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-emerald-700 underline-offset-2 hover:underline"
              >
                WhatsApp
              </a>
            ) : null}
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted">No phone on profile</p>
        )}
      </td>
      <td className="px-3 py-3">
        {pkg ? (
          <>
            <p className="font-medium text-foreground">
              {packageLabel({ title: pkg.title, groupSize: pkg.groupSize })}
            </p>
            <p className="text-xs text-muted">
              {pkg.kind === "monthly"
                ? `Monthly · ${pkg.sessionsPerMonth ?? "?"} sessions`
                : "Per session"}{" "}
              · {formatPrice(pkg.price)} {pkg.currency}{" "}
              {pkg.priceBasis === "per_person" ? "/ person" : "/ group"}
            </p>
          </>
        ) : (
          <p className="text-muted">Package removed</p>
        )}
      </td>
      <td className="px-3 py-3 text-center tabular-nums">
        {request.participants}
        {pkg ? <span className="text-muted"> / {pkg.groupSize}</span> : null}
      </td>
      <td className="max-w-[220px] px-3 py-3 whitespace-pre-line text-foreground/80">
        {request.note?.trim() || <span className="text-muted">—</span>}
      </td>
      <td className="w-[300px] px-3 py-3">
        {readOnly ? (
          <div className="space-y-1.5">
            <span
              className={`inline-block rounded-md border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES.cancelled}`}
            >
              {REQUEST_STATUS_LABELS.cancelled}
            </span>
            {request.clubNote ? (
              <p className="text-xs text-foreground/70">{request.clubNote}</p>
            ) : null}
          </div>
        ) : (
          <form
            id={formId}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-2"
            noValidate
          >
            <select
              aria-label="Status"
              className={`${inputClassName} font-semibold ${STATUS_STYLES[request.status]}`}
              {...register("status")}
            >
              {OWNER_REQUEST_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {REQUEST_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <textarea
              rows={2}
              maxLength={500}
              aria-label="Club note"
              placeholder="Note for the player (shown in their app)"
              className={inputClassName}
              {...register("clubNote")}
            />
            {errors.clubNote?.message ? (
              <p className="text-xs text-red-600">{errors.clubNote.message}</p>
            ) : null}
            {serverError ? (
              <p role="alert" className="text-xs text-red-700">
                {serverError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pending || !isDirty}
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Saving…" : "Update"}
            </button>
          </form>
        )}
      </td>
    </tr>
  );
}
