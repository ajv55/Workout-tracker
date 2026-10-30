import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import EditWorkoutForm from "@/app/components/EditWorkoutForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function EditWorkoutContent({ params }: PageProps) {
  const { id } = await params;

  await connection();

  const todayUtc = new Date().toISOString().slice(0, 10);

  return <EditWorkoutForm workoutId={id} todayUtc={todayUtc} />;
}

export default function EditWorkoutPage({ params }: PageProps) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/workouts"
        className="text-sm text-accent-cyan hover:underline"
      >
        ← Workout history
      </Link>

      <header className="mb-8 mt-6">
        <h1 className="text-3xl font-bold">Edit workout</h1>
        <p className="mt-2 text-sm text-text-muted">
          Update your recorded workout details.
        </p>
      </header>

      <Suspense
        fallback={
          <p role="status" className="text-sm text-text-muted">
            Loading workout...
          </p>
        }
      >
        <EditWorkoutContent params={params} />
      </Suspense>
    </main>
  );
}