import { Suspense } from "react";
import Link from "next/link";
import WorkoutDetails from "@/app/components/WorkoutDetails";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function WorkoutDetailsContent({ params }: PageProps) {
  const { id } = await params;

  return <WorkoutDetails workoutId={id} />;
}

export default function WorkoutDetailsPage({ params }: PageProps) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/workouts"
        className="text-sm text-accent-cyan hover:underline"
      >
        ← Workout history
      </Link>

      <header className="mb-8 mt-6">
        <h1 className="text-3xl font-bold">Workout details</h1>
      </header>

      <Suspense
        fallback={
          <p role="status" className="text-sm text-text-muted">
            Loading workout...
          </p>
        }
      >
        <WorkoutDetailsContent params={params} />
      </Suspense>
    </main>
  );
}