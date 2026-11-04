import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SignInForm from "./SignInForm";

export const metadata: Metadata = {
  title: "Sign in | Workout Tracker",
  description: "Sign in to track your workouts and view your progress.",
  robots: { index: false, follow: false },
};

async function SignInContent() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/");
  }

  return (
    <section
      aria-labelledby="signin-heading"
      className="w-full max-w-md rounded-2xl border border-app-border bg-app-surface p-6 sm:p-8"
    >
      <div aria-hidden="true" className="mb-6 flex size-12 items-center justify-center rounded-xl bg-accent-cyan text-2xl font-bold text-app-bg">
        W
      </div>
      <p className="mb-2 text-sm font-semibold text-accent-cyan">
        WorkoutTrack
      </p>
      <h1 id="signin-heading" className="text-3xl font-bold tracking-tight">
        Welcome back
      </h1>
      <p className="mt-3 text-sm leading-6 text-text-muted">
        Sign in to record your training and follow your progress.
      </p>
      <SignInForm />
    </section>
  );
}

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-app-bg px-4 py-12 text-text-primary">
      <Suspense fallback={<p role="status">Loading sign-in…</p>}>
        <SignInContent />
      </Suspense>
    </main>
  );
}
