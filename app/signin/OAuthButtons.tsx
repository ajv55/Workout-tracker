"use client";

import { useActionState } from "react";
import { authenticateWithProvider } from "./actions";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";

export default function OAuthButtons() {
  const [error, formAction, pending] = useActionState(
    authenticateWithProvider,
    null,
  );

  return (
    <div className="mt-6">
      <div className="mb-5 flex items-center gap-3 text-xs text-text-muted">
        <span className="h-px flex-1 bg-app-border" />
        <span>Or continue with</span>
        <span className="h-px flex-1 bg-app-border" />
      </div>
      <form action={formAction} className="space-y-3">
        {(["google", "github"] as const).map((provider) => (
          <button
            key={provider}
            type="submit"
            name="provider"
            value={provider}
            disabled={pending}
            className="w-full rounded-xl border border-app-border bg-app-raised px-4 py-3 text-sm font-semibold transition hover:border-accent-cyan focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-cyan disabled:cursor-wait disabled:opacity-60"
          >
            {pending
              ? "Connecting…"
              : provider === "google"
                ? <span className="flex justify-center gap-2.5 items-center"><FcGoogle size={27}/> Continue with Google</span>
                : <span className="flex justify-center gap-2.5 items-center"><FaGithub size={27}/> Continue with Github</span>}
          </button>
        ))}
        <div aria-live="polite" aria-atomic="true">
          {error && <p className="text-sm text-red-300">{error}</p>}
        </div>
      </form>
    </div>
  );
}
