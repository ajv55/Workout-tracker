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

      <header className="mb-8 mt-6">
        <h1 className="text-3xl font-bold text-text-primary">
          Workout history
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Review your past workouts and training history.
        </p>
      </header>

      <WorkoutHistory />
    </main>
  );
}