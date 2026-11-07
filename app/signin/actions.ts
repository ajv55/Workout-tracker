"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn, signOut } from "@/auth";

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
    if (error instanceof CredentialsSignin) {
    if (error.code === "rate_limited") {
        return "Too many sign-in attempts. Please try again later.";
    }

    if (error.code === "temporarily_unavailable") {
        return "Sign-in is temporarily unavailable. Please try again shortly.";
    }

    return "Email or password is incorrect.";
    }
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

export async function authenticateWithProvider(
  _previousError: string | null,
  formData: FormData,
): Promise<string | null> {
  const provider = formData.get("provider");
  if (provider !== "google" && provider !== "github") {
    return "Choose Google or GitHub to continue.";
  }

  try {
    await signIn(provider, { redirectTo: "/" });
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      return "Unable to start sign-in. Please try again.";
    }
    throw error;
  }
}

export async function endSession(
  _previousError: string | null,
): Promise<string | null> {
    void _previousError
  try {
    await signOut({ redirectTo: "/signin" });
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      return "Unable to sign out. Please try again.";
    }
    throw error;
  }
}
