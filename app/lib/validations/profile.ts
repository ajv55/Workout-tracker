import { z } from "zod";

export const updateProfileSchema = z
  .object({
    age: z.number().int().positive().nullable().optional(),

    metabolicSex: z
      .enum(["MALE", "FEMALE"])
      .nullable()
      .optional(),

    heightCm: z.number().finite().positive().nullable().optional(),

    weightKg: z.number().finite().positive().nullable().optional(),

    activityLevel: z
      .enum([
        "SEDENTARY",
        "LIGHTLY_ACTIVE",
        "MODERATELY_ACTIVE",
        "VERY_ACTIVE",
        "EXTRA_ACTIVE",
      ])
      .nullable()
      .optional(),

    goal: z
      .enum([
        "LOSE_WEIGHT",
        "MAINTAIN_WEIGHT",
        "GAIN_WEIGHT",
      ])
      .nullable()
      .optional(),
  })
  .strict()
  .refine(
    (data) =>
      Object.values(data).some((value) => value !== undefined),
    {
      message: "At least one profile field must be provided",
    },
  );

export type UpdateProfileInput = z.infer<
  typeof updateProfileSchema
>;