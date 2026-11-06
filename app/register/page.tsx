import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = {
  title: "Create account | Workout Tracker",
  description: "Create an account to start tracking your workouts.",
  robots: { index: false, follow: false },
};

async function RegisterContent() {
  await connection();

  const session = await auth();

  if (session?.user?.id) {
    redirect("/");
  }

  return (
    <section
      aria-labelledby="register-heading"
      className="w-full max-w-md rounded-2xl border border-app-border bg-app-surface p-6 sm:p-8"
    >
      <div
        aria-hidden="true"
        className="mb-6 flex size-12 items-center justify-center rounded-xl bg-accent-cyan text-2xl font-bold text-app-bg"
      >
        W
      </div>
      <p className="mb-2 text-sm font-semibold text-accent-cyan">
        WorkoutTrack
      </p>
      <h1 id="register-heading" className="text-3xl font-bold tracking-tight">
        Create your account
      </h1>
      <p className="mt-3 text-sm leading-6 text-text-muted">
        Start recording your training and following your progress.
      </p>

      <RegisterForm />

      <p className="mt-6 text-sm text-text-muted">
        Already have an account?{" "}
        <Link href="/signin" className="font-semibold text-accent-cyan underline">
          Sign in
        </Link>
      </p>
    </section>
  );
}

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-app-bg px-4 py-12 text-text-primary">
      <Suspense fallback={<p role="status">Loading registration…</p>}>
        <RegisterContent />
      </Suspense>
    </main>
  );
}