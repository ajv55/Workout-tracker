"use client";

import { useEffect, useState } from "react";

type Workout = {
  id: string;
  title: string;
  date: string;
  durationMinutes: number | null;
  notes: string | null;
};

type WorkoutsResponse = {
  workouts: Workout[];
};

export default function RecentWorkouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  
  
useEffect(() => {
  async function fetchWorkouts() {
    try {
      const response = await fetch("/api/workouts", {
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Sign in to view your workouts.");
        }

        throw new Error("Unable to load your workouts.");
      }

      const data: WorkoutsResponse = await response.json();
      setWorkouts(data.workouts);
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong while loading workouts.",
      );
    } finally {
      setLoading(false);
    }
  }

  void fetchWorkouts();
}, []);



  function formatDate(date: string) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-app-border bg-app-surface">
      {loading ? (
        <p className="p-6 text-sm text-text-muted" role="status">
          Loading your workouts...
        </p>
      ) : error ? (
        <p className="p-6 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : workouts.length === 0 ? (
        <p className="p-6 text-sm text-text-muted">
          No workouts yet. Your workouts will appear here once you create one.
        </p>
      ) : (
        workouts.slice(0, 3).map((workout, index) => (
          <article
            key={workout.id}
            className={`flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5 ${
              index !== Math.min(workouts.length, 3) - 1
                ? "border-b border-app-border"
                : ""
            }`}
          >
            <div
              className={`flex size-12 shrink-0 items-center justify-center rounded-xl text-xl ${
                index === 0
                  ? "bg-accent-cyan/10 text-accent-cyan"
                  : index === 1
                    ? "bg-accent-violet/10 text-accent-violet"
                    : "bg-accent-emerald/10 text-accent-emerald"
              }`}
              aria-hidden="true"
            >
              {index === 0 ? "↗" : index === 1 ? "◇" : "⌁"}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">{workout.title}</h3>
              <p className="mt-1 text-sm text-text-muted">
                {formatDate(workout.date)}
              </p>
              {workout.notes && (
                <p className="mt-1 truncate text-sm text-text-subtle">
                  {workout.notes}
                </p>
              )}
            </div>

            <div className="flex items-center text-sm text-text-muted sm:gap-6">
              <span className="whitespace-nowrap">
                {workout.durationMinutes != null
                  ? `${workout.durationMinutes} min`
                  : "Duration not set"}
              </span>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
