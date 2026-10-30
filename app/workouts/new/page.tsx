import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import NewWorkoutForm from "@/app/components/NewWorkoutForm";

async function WorkoutFormContent() {
  await connection();

  const todayUtc = new Date().toISOString().slice(0, 10);

  return <NewWorkoutForm todayUtc={todayUtc} />;
}

export default function NewWorkoutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/workouts"
        className="text-sm text-accent-cyan hover:underline"
      >
        ← Workout history
      </Link>

      <header className="mb-8 mt-6">
        <h1 className="text-3xl font-bold">New workout</h1>
        <p className="mt-2 text-sm text-text-muted">
          Record a completed workout.
        </p>
      </header>

      <Suspense
        fallback={
          <p role="status" className="text-sm text-text-muted">
            Loading workout form...
          </p>
        }
      >
        <WorkoutFormContent />
      </Suspense>
    </main>
  );
}