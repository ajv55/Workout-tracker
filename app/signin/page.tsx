import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SignInForm from "./SignInForm";
import OAuthButtons from "./OAuthButtons";

export const metadata: Metadata = {
  title: "Sign in | Workout Tracker",
  description: "Sign in to track your workouts and view your progress.",
  robots: { index: false, follow: false },
};

type SignInSearchParams = Promise<{
  error?: string | string[];
}>;

async function SignInContent({
  searchParams,
}: {
  searchParams: SignInSearchParams;
}) {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/");
  }

  const params = await searchParams;
  const errorCode = typeof params.error === "string" ? params.error : null;
  const signInError = errorCode === "OAuthAccountNotLinked"
    ? "This email is already associated with another sign-in method. Use the method you originally used."
    : errorCode
      ? "Sign-in could not be completed. Please try again."
      : null;

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
      {signInError && (
        <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
          {signInError}
        </p>
      )}
      <SignInForm />
      <OAuthButtons />
    </section>
  );
}

export default function SignInPage({
  searchParams,
}: {
  searchParams: SignInSearchParams;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-app-bg px-4 py-12 text-text-primary">
      <Suspense fallback={<p role="status">Loading sign-in…</p>}>
        <SignInContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
