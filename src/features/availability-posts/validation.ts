import { z } from "zod";

const slotPattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const publishAvailabilitySchema = z.object({
  validForDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slots: z.array(z.string().regex(slotPattern)).min(1, "Select at least one slot"),
  description: z.string().max(500).optional().nullable(),
  price: z.number().positive().max(99999).optional().nullable(),
  currency: z.string().min(3).max(3).optional().nullable(),
  removeImage: z.boolean().optional(),
});

export type PublishAvailabilityInput = z.infer<typeof publishAvailabilitySchema>;
