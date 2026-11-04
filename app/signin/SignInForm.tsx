"use client";

import { useActionState } from "react";
import { authenticate } from "./actions";

export default function SignInForm() {
  const [error, formAction, pending] = useActionState(authenticate, null);

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
            required
            className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-text-primary outline-none focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan/25"
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
            autoComplete="current-password"
            required
            className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-text-primary outline-none focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan/25"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-accent-cyan px-4 py-3 font-semibold text-app-bg transition hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-cyan disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </fieldset>

      <div aria-live="polite" aria-atomic="true">
        {error && (
          <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
