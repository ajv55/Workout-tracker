import { z } from "zod";

export const createExerciseSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Exercise name is required")
      .max(100),

    category: z
      .string()
      .trim()
      .min(1, "Category is required")
      .max(50),

    description: z
      .string()
      .trim()
      .max(1000)
      .optional(),
  })
  .strict();

export type CreateExerciseInput = z.infer<
  typeof createExerciseSchema
>;