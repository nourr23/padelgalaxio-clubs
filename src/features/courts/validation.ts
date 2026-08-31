import { z } from "zod";

export const courtFormSchema = z.object({
  name: z.string().trim().min(1, "Court name is required").max(120),
  environment: z.enum(["indoor", "outdoor"], {
    message: "Choose indoor or outdoor",
  }),
  sort_order: z
    .number()
    .int("Sort order must be a whole number")
    .min(1, "Sort order must be at least 1")
    .max(999, "Sort order must be 999 or less"),
});

export type CourtFormInput = z.infer<typeof courtFormSchema>;
