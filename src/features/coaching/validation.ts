import { z } from "zod";

import type {
  CoachingPackageKind,
  CoachingPriceBasis,
  CoachingRequestStatus,
} from "@/src/types/database";

export const COACHING_KINDS = ["monthly", "per_session"] as const;
export const COACHING_PRICE_BASES = ["per_person", "per_group"] as const;
export const OWNER_REQUEST_STATUSES = [
  "pending",
  "contacted",
  "confirmed",
  "declined",
] as const;

const coachingPackageShape = z.object({
  kind: z.enum(COACHING_KINDS),
  title: z.string().trim().max(60, "Keep the title under 60 characters"),
  groupSize: z
    .number({ message: "Enter a group size" })
    .int("Whole players only")
    .min(1, "At least 1 player")
    .max(8, "At most 8 players"),
  /** Required for monthly, ignored (stored as null) for per-session. */
  sessionsPerMonth: z
    .number({ message: "Enter a number of sessions" })
    .int("Whole sessions only")
    .min(1, "At least 1 session")
    .max(31, "At most 31 sessions")
    .nullable(),
  sessionMinutes: z
    .number({ message: "Enter minutes" })
    .int("Whole minutes only")
    .min(15, "At least 15 minutes")
    .max(240, "At most 240 minutes")
    .nullable(),
  price: z
    .number({ message: "Enter a price" })
    .positive("Price must be above 0")
    .max(99999999, "Price is too high"),
  priceBasis: z.enum(COACHING_PRICE_BASES),
  description: z
    .string()
    .trim()
    .max(500, "Keep the description under 500 characters"),
  isActive: z.boolean(),
});

function requireMonthlySessions(
  value: { kind: CoachingPackageKind; sessionsPerMonth: number | null },
  ctx: z.RefinementCtx,
) {
  if (value.kind === "monthly" && value.sessionsPerMonth == null) {
    ctx.addIssue({
      code: "custom",
      message: "Monthly offers need a number of sessions per month",
      path: ["sessionsPerMonth"],
    });
  }
}

export const coachingPackageSchema =
  coachingPackageShape.superRefine(requireMonthlySessions);

export type CoachingPackageInput = z.infer<typeof coachingPackageSchema>;

/** Editor row: a saved package has an id, a draft has null. */
export const coachingPackageFormItemSchema = coachingPackageShape
  .extend({ id: z.string().nullable() })
  .superRefine(requireMonthlySessions);

export type CoachingPackageFormItem = z.infer<
  typeof coachingPackageFormItemSchema
>;

export const coachingPackagesFormSchema = z.object({
  packages: z.array(coachingPackageFormItemSchema),
});

export type CoachingPackagesFormInput = z.infer<
  typeof coachingPackagesFormSchema
>;

/** Owner-settable statuses; `cancelled` belongs to the player (the DB trigger rejects it). */
export const requestStatusSchema = z.object({
  status: z.enum(OWNER_REQUEST_STATUSES),
  clubNote: z
    .string()
    .trim()
    .max(500, "Keep the note under 500 characters"),
});

export type RequestStatusInput = z.infer<typeof requestStatusSchema>;

/** Row shape written to `coaching_packages` (sort_order and club_id added by the caller). */
export function toPackageRow(input: CoachingPackageInput) {
  return {
    kind: input.kind,
    title: input.title.trim() || null,
    group_size: input.groupSize,
    sessions_per_month:
      input.kind === "monthly" ? input.sessionsPerMonth : null,
    session_minutes: input.sessionMinutes,
    price: input.price,
    price_basis: input.priceBasis,
    description: input.description.trim() || null,
    is_active: input.isActive,
  };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

type PriceFields = {
  price: number;
  priceBasis: CoachingPriceBasis;
  groupSize: number;
};

export function perPersonPrice(pkg: PriceFields) {
  if (pkg.priceBasis === "per_person") return pkg.price;
  return round2(pkg.price / Math.max(1, pkg.groupSize));
}

export function perGroupPrice(pkg: PriceFields) {
  if (pkg.priceBasis === "per_group") return pkg.price;
  return round2(pkg.price * Math.max(1, pkg.groupSize));
}

/** Same fallback labels as the player app. */
export function groupSizeLabel(groupSize: number) {
  switch (groupSize) {
    case 1:
      return "Individual";
    case 2:
      return "Duo";
    case 3:
      return "Trio";
    case 4:
      return "Quadri";
    default:
      return `Group of ${groupSize}`;
  }
}

export function packageLabel(pkg: { title: string | null; groupSize: number }) {
  return pkg.title?.trim() || groupSizeLabel(pkg.groupSize);
}

export function formatPrice(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export const REQUEST_STATUS_LABELS: Record<CoachingRequestStatus, string> = {
  pending: "Pending",
  contacted: "Contacted",
  confirmed: "Confirmed",
  declined: "Declined",
  cancelled: "Cancelled by player",
};
