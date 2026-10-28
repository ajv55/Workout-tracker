import { z } from "zod";

export const createWorkoutSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(100),
    durationMinutes: z.number().int().positive().optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

export type CreateWorkoutInput = z.infer<
  typeof createWorkoutSchema
>;