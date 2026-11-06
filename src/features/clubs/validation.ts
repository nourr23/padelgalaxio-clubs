import { z } from "zod";

export const timeHmm = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24-hour)");

/** `null` = no limit; N = today plus the next N-1 days. */
const bookingWindowDays = z
  .number({ message: "Enter a whole number of days" })
  .int("Enter a whole number of days")
  .min(1, "Must be at least 1 day")
  .max(365, "Must be 365 days or less")
  .nullable();

export const bookingWindowSchema = z.object({
  booking_window_days: bookingWindowDays,
});

export type BookingWindowInput = z.infer<typeof bookingWindowSchema>;

export const clubSettingsSchema = z
  .object({
    name: z.string().trim().min(1, "Club name is required").max(120),
    city: z.string().trim().max(80),
    timezone: z.string().trim().min(1, "Timezone is required"),
    slot_duration_minutes: z
      .number()
      .int()
      .refine((value) => [60, 90, 120].includes(value), {
        message: "Choose 60, 90, or 120 minutes",
      }),
    first_slot_start: timeHmm,
    last_session_end: timeHmm,
    booking_window_days: bookingWindowDays,
  })
  .refine(
    (data) => data.first_slot_start < data.last_session_end,
    {
      message: "Last session end must be after first slot start",
      path: ["last_session_end"],
    },
  );

export type ClubSettingsInput = z.infer<typeof clubSettingsSchema>;

/** Normalize Postgres `time` / `HH:MM:SS` to `HH:MM` for inputs. */
export function toDisplayTime(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 5);
}
