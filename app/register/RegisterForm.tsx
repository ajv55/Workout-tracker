"use client";

import Link from "next/link";
import { useActionState } from "react";

type RegistrationState = {
  error: string | null;
  success: boolean;
};

const initialState: RegistrationState = {
  error: null,
  success: false,
};

async function register(
  previousState: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  void previousState;

  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmPassword") ?? "");

  if (password !== confirmation) {
    return { error: "Passwords do not match.", success: false };
  }

  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(formData.get("email") ?? ""),
        password,
      }),
    });

    if (response.status === 201) {
      return { error: null, success: true };
    }

    if (response.status === 429) {
      return {
        error: "Too many registration attempts. Please try again later",
        success: false,
      };
    }

    if (response.status === 503) {
      return {
        error: "Registration is temporarily unavailable. Please try again shortly.",
        success: false,
      };
    }

    if (response.status === 409) {
      return {
        error: "An account with this email already exists. Try signing in.",
        success: false,
      };
    }

    return {
      error:
        response.status === 400
          ? "Enter a valid email and a password between 12 and 128 characters."
          : "Unable to create your account. Please try again.",
      success: false,
    };
  } catch {
    return {
      error: "Unable to connect. Check your connection and try again.",
      success: false,
    };
  }
}

const inputClass =
  "w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-text-primary outline-none focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan/25";

export default function RegisterForm() {
  const [state, formAction, pending] = useActionState(register, initialState);

  if (state.success) {
    return (
      <div className="mt-8 space-y-4">
        <p role="status" className="text-sm text-accent-cyan">
          Account created successfully. You can now sign in.
        </p>
        <Link
          href="/signin"
          className="inline-block font-semibold text-accent-cyan underline"
        >
          Continue to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <fieldset disabled={pending} className="space-y-5 disabled:opacity-70">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={254}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            aria-describedby="password-help"
            required
            className={inputClass}
          />
          <p id="password-help" className="mt-2 text-xs text-text-muted">
            Use between 12 and 128 characters.
          </p>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-2 block text-sm font-medium"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-accent-cyan px-4 py-3 font-semibold text-app-bg transition hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-cyan disabled:cursor-wait"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </fieldset>

      <div aria-live="polite" aria-atomic="true">
        {state.error && (
          <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}