import { z } from "zod";

import { timeHmm } from "@/src/features/clubs/validation";
import type { ClubEnvironment } from "@/src/types/database";

/** 0=Sun, 1=Mon … 6=Sat (same as JS `Date#getDay` and `court_session_prices.days_of_week`). */
export const WEEK_DAYS = [
  { value: 1, short: "Mon" },
  { value: 2, short: "Tue" },
  { value: 3, short: "Wed" },
  { value: 4, short: "Thu" },
  { value: 5, short: "Fri" },
  { value: 6, short: "Sat" },
  { value: 0, short: "Sun" },
] as const;

export const WEEKDAYS = [1, 2, 3, 4, 5];
export const WEEKEND = [0, 6];

export const pricingTargetSchema = z.union([
  z.enum(["all", "indoor", "outdoor"]),
  z.object({
    courtIds: z.array(z.string()).min(1, "Pick at least one court"),
  }),
]);

export type PricingTarget = z.infer<typeof pricingTargetSchema>;

export const pricingGroupSchema = z
  .object({
    /** Empty = every day. */
    days: z.array(z.number().int().min(0).max(6)),
    from: timeHmm,
    to: timeHmm,
    price: z
      .number({ message: "Enter a price" })
      .min(0, "Price can't be negative")
      .max(99999999, "Price is too high"),
    target: pricingTargetSchema,
  })
  .refine((group) => group.from < group.to, {
    message: "End must be after start",
    path: ["to"],
  });

export type PricingGroupInput = z.infer<typeof pricingGroupSchema>;

export type PricingCourt = {
  id: string;
  name: string;
  environment: ClubEnvironment | null;
};

export type PricingContext = {
  /** Club opening bounds as HH:MM. */
  open: string;
  close: string;
  /** Active courts only. */
  courts: PricingCourt[];
};

export function resolveTargetCourtIds(
  target: PricingTarget,
  courts: PricingCourt[],
): string[] {
  if (target === "all") return courts.map((court) => court.id);
  if (target === "indoor" || target === "outdoor") {
    return courts
      .filter((court) => court.environment === target)
      .map((court) => court.id);
  }
  const active = new Set(courts.map((court) => court.id));
  return target.courtIds.filter((id) => active.has(id));
}

function sharesDay(a: number[], b: number[]) {
  if (!a.length || !b.length) return true;
  return a.some((day) => b.includes(day));
}

export function buildPricingFormSchema(context: PricingContext) {
  return z
    .object({ groups: z.array(pricingGroupSchema) })
    .superRefine(({ groups }, ctx) => {
      const resolved = groups.map((group) =>
        resolveTargetCourtIds(group.target, context.courts),
      );

      groups.forEach((group, index) => {
        if (group.from < context.open) {
          ctx.addIssue({
            code: "custom",
            message: `Club opens at ${context.open}`,
            path: ["groups", index, "from"],
          });
        }
        if (group.to > context.close) {
          ctx.addIssue({
            code: "custom",
            message: `Club closes at ${context.close}`,
            path: ["groups", index, "to"],
          });
        }
        if (!resolved[index].length) {
          ctx.addIssue({
            code: "custom",
            message: "No active court matches this target",
            path: ["groups", index, "target"],
          });
        }
      });

      // Every-day and specific-day groups may overlap (specific days win),
      // but two groups of the same kind can't price the same court/day/time twice.
      for (let j = 1; j < groups.length; j++) {
        for (let i = 0; i < j; i++) {
          const a = groups[i];
          const b = groups[j];
          if ((a.days.length === 0) !== (b.days.length === 0)) continue;
          if (!sharesDay(a.days, b.days)) continue;
          if (!(a.from < b.to && b.from < a.to)) continue;
          if (!resolved[i].some((id) => resolved[j].includes(id))) continue;
          ctx.addIssue({
            code: "custom",
            message: `Overlaps rule ${i + 1} on the same court and day`,
            path: ["groups", j, "from"],
          });
          break;
        }
      }
    });
}

export type PricingFormInput = { groups: PricingGroupInput[] };
