"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { IconSave } from "@/src/components/dashboard/icons";
import { updateBookingWindow } from "@/src/features/clubs/actions";
import {
  bookingWindowSchema,
  type BookingWindowInput,
} from "@/src/features/clubs/validation";

type BookingWindowFormProps = {
  clubId: string;
  bookingWindowDays: number | null;
};

const inputClassName =
  "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-brand-soft";

export function BookingWindowForm({
  clubId,
  bookingWindowDays,
}: BookingWindowFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<BookingWindowInput>({
    resolver: zodResolver(bookingWindowSchema),
    defaultValues: { booking_window_days: bookingWindowDays },
  });

  function onSubmit(values: BookingWindowInput) {
    setServerError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateBookingWindow(clubId, values);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      reset(values);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="rounded-2xl border border-border bg-panel p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-full sm:w-56">
          <label
            htmlFor="pricing_booking_window_days"
            className="mb-2 block text-[11px] font-semibold tracking-[0.14em] text-muted uppercase"
          >
            Booking window (days)
          </label>
          <input
            id="pricing_booking_window_days"
            type="number"
            min={1}
            max={365}
            step={1}
            inputMode="numeric"
            placeholder="No limit"
            className={inputClassName}
            {...register("booking_window_days", {
              setValueAs: (value) =>
                value === "" || value === null || value === undefined
                  ? null
                  : Number(value),
            })}
          />
        </div>
        <p className="flex-1 pb-2.5 text-sm text-muted">
          Players can book up to N days ahead. Leave empty for no limit.
        </p>
        <button
          type="submit"
          disabled={pending || !isDirty}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          <IconSave />
          {pending ? "Saving…" : "Save"}
        </button>
      </div>

      {errors.booking_window_days?.message ? (
        <p className="mt-1.5 text-sm text-red-600">
          {errors.booking_window_days.message}
        </p>
      ) : null}

      {serverError ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          {serverError}
        </p>
      ) : null}

      {saved && !isDirty ? (
        <p className="mt-3 text-sm font-medium text-brand-soft">
          Booking window saved.
        </p>
      ) : null}
    </form>
  );
}
