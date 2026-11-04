"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function authenticate(
  _previousError: string | null,
  formData: FormData,
): Promise<string | null> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return "Email or password is incorrect.";
      }
      return "Unable to sign in right now. Please try again.";
    }

    // Next.js uses a thrown redirect after successful authentication.
    // Let the framework handle it instead of turning it into a form error.
    throw error;
  }
}
