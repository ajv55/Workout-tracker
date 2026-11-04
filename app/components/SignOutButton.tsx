"use client";

import { useActionState } from "react";
import { endSession } from "@/app/signin/actions";

export default function SignOutButton() {
  const [error, formAction, pending] = useActionState(endSession, null);

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        className="shrink-0 rounded-xl border border-app-border bg-app-surface px-3 py-2.5 text-sm font-medium text-text-muted transition hover:border-accent-cyan hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-cyan disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
      <div aria-live="polite" aria-atomic="true">
        {error && <p className="mt-2 max-w-48 text-xs text-red-300">{error}</p>}
      </div>
    </form>
  );
}
