import { z } from "zod";

export const addWorkoutExerciseSchema = z
  .object({
    exerciseId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, "Invalid exercise ID")
      .transform((value) => value.toLowerCase()),
  })
  .strict();

export type AddWorkoutExerciseInput = z.infer<
  typeof addWorkoutExerciseSchema
>;