import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),

    email: z
      .string()
      .trim()
      .email("Enter a valid email address")
      .max(254)
      .transform((email) => email.toLowerCase()),

    password: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .max(128, "Password must be 128 characters or fewer"),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;



export const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email("Enter a valid email address")
      .max(254)
      .transform((email) => email.toLowerCase()),

    password: z.string().min(1).max(128),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;