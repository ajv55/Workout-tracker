import { z } from "zod";

const workoutDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .superRefine((value, context) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      context.addIssue({
        code: "custom",
        message: "Enter a valid calendar date",
      });
      return;
    }

    const todayUtc = new Date().toISOString().slice(0, 10);

    if (value > todayUtc) {
      context.addIssue({
        code: "custom",
        message: "Training date cannot be after today in UTC",
      });
    }
  })
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

export const createWorkoutSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(100),
    date: workoutDateSchema.optional(),
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
    (data) =>
      Object.values(data).some((value) => value !== undefined),
    { message: "At least one field must be provided" },
  );

export type UpdateWorkoutInput = z.infer<
  typeof updateWorkoutSchema
>;