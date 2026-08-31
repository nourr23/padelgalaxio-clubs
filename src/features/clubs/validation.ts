import { z } from "zod";

const timeHmm = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24-hour)");

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
