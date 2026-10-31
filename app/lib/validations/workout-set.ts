import { z } from "zod";

const repsSchema = z
  .number()
  .int("Reps must be a whole number")
  .positive("Reps must be greater than zero")
  .nullable();

const weightKgSchema = z
  .number()
  .finite()
  .nonnegative("Weight cannot be negative")
  .nullable();

const plannedRestSecondsSchema = z
  .number()
  .int("Rest duration must use whole seconds")
  .min(1, "Rest duration must be at least one second")
  .max(3600, "Rest duration cannot exceed one hour")
  .nullable();

// Create blank rows. The server assigns their set numbers.
export const createWorkoutSetsSchema = z
  .object({
    count: z.number().int().min(1).max(20),
  })
  .strict();

// Edit one existing row.
export const updateWorkoutSetSchema = z
  .object({
    reps: repsSchema.optional(),
    weightKg: weightKgSchema.optional(),
    completed: z.boolean().optional(),
    plannedRestSeconds: plannedRestSecondsSchema.optional(),
  })
  .strict()
  .refine(
    (data) =>
      Object.values(data).some((value) => value !== undefined),
    {
      message: "At least one set field must be provided",
    },
  );

// Validate the complete saved state after merging a PATCH.
// A partial PATCH alone cannot determine whether completion is valid.
export const workoutSetStateSchema = z
  .object({
    reps: repsSchema,
    weightKg: weightKgSchema,
    completed: z.boolean(),
    plannedRestSeconds: plannedRestSecondsSchema,
  })
  .strict()
  .superRefine((data, context) => {
    if (data.completed && data.reps === null) {
      context.addIssue({
        code: "custom",
        path: ["reps"],
        message: "Record reps before completing this set",
      });
    }
  });

// The server sets restStartedAt and restEndedAt.
export const workoutSetRestActionSchema = z
  .object({
    action: z.enum(["START_REST", "END_REST"]),
  })
  .strict();

export type CreateWorkoutSetsInput = z.infer<
  typeof createWorkoutSetsSchema
>;

export type UpdateWorkoutSetInput = z.infer<
  typeof updateWorkoutSetSchema
>;

export type WorkoutSetState = z.infer<
  typeof workoutSetStateSchema
>;

export type WorkoutSetRestActionInput = z.infer<
  typeof workoutSetRestActionSchema
>;