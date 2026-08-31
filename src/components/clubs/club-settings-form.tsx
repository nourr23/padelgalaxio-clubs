"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { updateClubSettings } from "@/src/features/clubs/actions";
import {
  CLUB_TIMEZONES,
  SLOT_DURATION_OPTIONS,
} from "@/src/features/clubs/constants";
import {
  clubSettingsSchema,
  type ClubSettingsInput,
} from "@/src/features/clubs/validation";
import { IconSave } from "@/src/components/dashboard/icons";
import type { Club } from "@/src/types/database";

type ClubSettingsFormProps = {
  club: Club;
};

export function ClubSettingsForm({ club }: ClubSettingsFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ClubSettingsInput>({
    resolver: zodResolver(clubSettingsSchema),
    defaultValues: {
      name: club.name,
      city: club.city ?? "",
      timezone: club.timezone || "UTC",
      slot_duration_minutes: club.slot_duration_minutes || 90,
      first_slot_start: (club.first_slot_start ?? "09:00").slice(0, 5),
      last_session_end: (club.last_session_end ?? "21:00").slice(0, 5),
    },
  });

  function onSubmit(values: ClubSettingsInput) {
    setServerError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateClubSettings(club.id, values);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="space-y-5">
        <Field label="Club name" htmlFor="name" error={errors.name?.message}>
          <input
            id="name"
            type="text"
            autoComplete="organization"
            className={inputClassName}
            {...register("name")}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="City" htmlFor="city" error={errors.city?.message}>
            <input
              id="city"
              type="text"
              autoComplete="address-level2"
              className={inputClassName}
              {...register("city")}
            />
          </Field>

          <Field
            label="Timezone"
            htmlFor="timezone"
            error={errors.timezone?.message}
          >
            <select
              id="timezone"
              className={inputClassName}
              {...register("timezone")}
            >
              {!CLUB_TIMEZONES.includes(
                club.timezone as (typeof CLUB_TIMEZONES)[number],
              ) && club.timezone ? (
                <option value={club.timezone}>{club.timezone}</option>
              ) : null}
              {CLUB_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <hr className="border-border" />

      <div className="grid gap-5 sm:grid-cols-3">
        <Field
          label="Slot duration"
          htmlFor="slot_duration_minutes"
          error={errors.slot_duration_minutes?.message}
        >
          <select
            id="slot_duration_minutes"
            className={inputClassName}
            {...register("slot_duration_minutes", { valueAsNumber: true })}
          >
            {SLOT_DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="First slot start"
          htmlFor="first_slot_start"
          error={errors.first_slot_start?.message}
        >
          <input
            id="first_slot_start"
            type="time"
            step={60}
            className={inputClassName}
            {...register("first_slot_start")}
          />
        </Field>

        <Field
          label="Last session end"
          htmlFor="last_session_end"
          error={errors.last_session_end?.message}
        >
          <input
            id="last_session_end"
            type="time"
            step={60}
            className={inputClassName}
            {...register("last_session_end")}
          />
        </Field>
      </div>

      {serverError ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          {serverError}
        </p>
      ) : null}

      {saved && !isDirty ? (
        <p className="text-sm font-medium text-brand-soft">Settings saved.</p>
      ) : null}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={pending || !isDirty}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          <IconSave />
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

const inputClassName =
  "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-brand-soft";

function Field({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
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
