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



export const updateWorkoutSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(100).optional(),
    durationMinutes: z.number().int().positive().optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field must be provided" }
  );

export type UpdateWorkoutInput = z.infer<
  typeof updateWorkoutSchema
>;
