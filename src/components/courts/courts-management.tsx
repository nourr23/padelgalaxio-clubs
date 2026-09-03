"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  createCourt,
  setCourtActive,
  updateCourt,
} from "@/src/features/courts/actions";
import type { CourtListItem } from "@/src/features/courts/queries";
import {
  courtFormSchema,
  type CourtFormInput,
} from "@/src/features/courts/validation";

type CourtsManagementProps = {
  clubId: string;
  courts: CourtListItem[];
};

type CourtFormModalProps = {
  clubId: string;
  court: CourtListItem | null;
  nextSortOrder: number;
  open: boolean;
  onClose: () => void;
};

const inputClassName =
  "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-brand-soft";

export function CourtsManagement({ clubId, courts }: CourtsManagementProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<CourtListItem | null>(null);

  const nextSortOrder =
    courts.reduce((max, court) => Math.max(max, court.sortOrder ?? 0), 0) + 1;

  function openCreate() {
    setEditingCourt(null);
    setFormOpen(true);
  }

  function openEdit(court: CourtListItem) {
    setEditingCourt(court);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingCourt(null);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
            <span>Dashboard</span>
            <span className="mx-2 text-muted/50">&gt;</span>
            <span className="text-foreground/70">Courts</span>
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-brand sm:text-4xl">
            Court Management
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] text-muted">
            Manage your club&apos;s courts, environments, and availability status.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-deep"
        >
          + Add New Court
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {courts.map((court) => (
          <CourtCard
            key={court.id}
            clubId={clubId}
            court={court}
            onEdit={() => openEdit(court)}
          />
        ))}

        <button
          type="button"
          onClick={openCreate}
          className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-panel px-6 py-10 text-center transition hover:border-brand/40 hover:bg-field/60"
        >
          <span className="flex size-12 items-center justify-center rounded-full border border-border bg-field text-xl text-muted">
            +
          </span>
          <span className="mt-4 text-base font-semibold text-brand">Add Court</span>
          <span className="mt-1 text-sm text-muted">
            Configure a new playing surface.
          </span>
        </button>
      </div>

      <CourtFormModal
        clubId={clubId}
        court={editingCourt}
        nextSortOrder={nextSortOrder}
        open={formOpen}
        onClose={closeForm}
      />
    </div>
  );
}

function CourtCard({
  clubId,
  court,
  onEdit,
}: {
  clubId: string;
  court: CourtListItem;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmMaintenanceOpen, setConfirmMaintenanceOpen] = useState(false);

  function applyMaintenanceChange(isActive: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setCourtActive(clubId, court.id, isActive);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirmMaintenanceOpen(false);
      router.refresh();
    });
  }

  function handleSettingsClick() {
    if (court.isActive) {
      setConfirmMaintenanceOpen(true);
      return;
    }
    applyMaintenanceChange(true);
  }

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border border-border bg-panel p-5 shadow-sm ${
        !court.isActive ? "bg-[repeating-linear-gradient(-45deg,transparent,transparent_10px,rgba(0,0,0,0.02)_10px,rgba(0,0,0,0.02)_20px)]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold text-brand">
            {court.name}
          </h2>
          <p className="mt-1 text-xs text-muted">ID: {court.displayCode}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg p-2 text-muted transition hover:bg-field hover:text-foreground"
            aria-label={`Edit ${court.name}`}
          >
            <IconEdit />
          </button>
          <button
            type="button"
            onClick={handleSettingsClick}
            disabled={pending}
            className="rounded-lg p-2 text-muted transition hover:bg-field hover:text-foreground disabled:opacity-60"
            aria-label={
              court.isActive
                ? `Mark ${court.name} as maintenance`
                : `Mark ${court.name} as active`
            }
            title={court.isActive ? "Mark as maintenance" : "Mark as active"}
          >
            <IconSettings />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <EnvironmentPill environment={court.environment} />
      </div>

      <div className="mt-5 border-t border-border pt-4">
        {court.isActive ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="size-2 rounded-full bg-accent" />
            <span className="font-semibold text-foreground">Active</span>
            <span className="text-muted">
              {court.upcomingBookings} upcoming booking
              {court.upcomingBookings !== 1 ? "s" : ""}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <IconWrench />
            <span className="font-semibold text-amber-700">Maintenance</span>
            <span className="text-muted">Court marked inactive</span>
          </div>
        )}
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      </div>

      <ConfirmMaintenanceModal
        courtName={court.name}
        upcomingBookings={court.upcomingBookings}
        open={confirmMaintenanceOpen}
        pending={pending}
        onClose={() => setConfirmMaintenanceOpen(false)}
        onConfirm={() => applyMaintenanceChange(false)}
      />
    </article>
  );
}

function EnvironmentPill({
  environment,
}: {
  environment: CourtListItem["environment"];
}) {
  if (!environment) return null;

  const isIndoor = environment === "indoor";

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-field px-2.5 py-1 text-[10px] font-bold tracking-wider text-foreground/70 uppercase">
      {isIndoor ? <IconIndoor /> : <IconOutdoor />}
      {isIndoor ? "Indoor" : "Outdoor"}
    </span>
  );
}

function ConfirmMaintenanceModal({
  courtName,
  upcomingBookings,
  open,
  pending,
  onClose,
  onConfirm,
}: {
  courtName: string;
  upcomingBookings: number;
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-panel p-6 shadow-xl">
        <h2 className="font-display text-xl font-semibold text-brand">
          Mark as maintenance?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          <span className="font-medium text-foreground">{courtName}</span> will
          be taken offline and won&apos;t accept new bookings.
        </p>
        {upcomingBookings > 0 ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            This court has {upcomingBookings} upcoming booking
            {upcomingBookings !== 1 ? "s" : ""}. Existing sessions are not
            cancelled automatically.
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
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
            {pending ? "Updating…" : "Mark as maintenance"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CourtFormModal({
  clubId,
  court,
  nextSortOrder,
  open,
  onClose,
}: CourtFormModalProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = court != null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CourtFormInput>({
    resolver: zodResolver(courtFormSchema),
    defaultValues: {
      name: "",
      environment: "indoor",
      sort_order: nextSortOrder,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: court?.name ?? "",
      environment: court?.environment ?? "indoor",
      sort_order: court?.sortOrder ?? nextSortOrder,
    });
    setServerError(null);
  }, [court, nextSortOrder, open, reset]);

  function onSubmit(values: CourtFormInput) {
    setServerError(null);
    startTransition(async () => {
      const result = isEditing
        ? await updateCourt(clubId, court.id, values)
        : await createCourt(clubId, values);

      if (!result.ok) {
        setServerError(result.error);
        return;
      }

      onClose();
      router.refresh();
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-panel p-6 shadow-xl">
        <h2 className="font-display text-xl font-semibold text-brand">
          {isEditing ? "Edit court" : "Add new court"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {isEditing
            ? "Update court details and display order."
            : "Create a new court for your club."}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
          <Field label="Court name" htmlFor="court-name" error={errors.name?.message}>
            <input
              id="court-name"
              type="text"
              className={inputClassName}
              placeholder="Court 1 - Panoramic Glass"
              {...register("name")}
            />
          </Field>

          <Field
            label="Environment"
            htmlFor="court-environment"
            error={errors.environment?.message}
          >
            <select
              id="court-environment"
              className={inputClassName}
              {...register("environment")}
            >
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
            </select>
          </Field>

          <Field
            label="Sort order"
            htmlFor="court-sort-order"
            error={errors.sort_order?.message}
          >
            <input
              id="court-sort-order"
              type="number"
              min={1}
              className={inputClassName}
              {...register("sort_order", { valueAsNumber: true })}
            />
          </Field>

          {serverError ? (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              {serverError}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-field hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-deep disabled:opacity-60"
            >
              {pending ? "Saving…" : isEditing ? "Save changes" : "Add court"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-[11px] font-semibold tracking-[0.14em] text-muted uppercase"
      >
        {label}
      </label>
      {children}
      {error ? <p className="mt-1.5 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m13.5 6.5 3 3" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
    </svg>
  );
}

function IconWrench() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-amber-600" aria-hidden>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-3.3-3.3 2.1-2.1Z" />
    </svg>
  );
}

function IconIndoor() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 20V10l8-6 8 6v10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function IconOutdoor() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2" />
    </svg>
  );
}
