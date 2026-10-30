import Link from "next/link";
import WorkoutHistory from "@/app/components/WorkoutHistory";

export default function WorkoutHistoryPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="text-sm text-accent-cyan hover:underline"
      >
        ← Back to dashboard
      </Link>

      <header className="mb-8 mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">
            Workout history
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Review your past workouts and training history.
          </p>
        </div>

        <Link
          href="/workouts/new"
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-accent-cyan px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          <span aria-hidden="true">+</span>
          New Workout
        </Link>
      </header>

      <WorkoutHistory />
    </main>
  );
}