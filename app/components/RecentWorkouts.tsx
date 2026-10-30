"use client";

import Link from "next/link";
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

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default function RecentWorkouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchWorkouts() {
      try {
        const response = await fetch(
          "/api/workouts?page=1&pageSize=3",
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? "Sign in to view your workouts."
              : "Unable to load your workouts.",
          );
        }

        const data: WorkoutsResponse = await response.json();

        if (active) setWorkouts(data.workouts);
      } catch (error: unknown) {
        if (active) {
          setError(
            error instanceof Error
              ? error.message
              : "Something went wrong while loading workouts.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchWorkouts();

    return () => {
      active = false;
    };
  }, []);

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
        workouts.map((workout, index) => (
          <article
            key={workout.id}
            className={`flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5 ${
              index !== workouts.length - 1
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
              <h3 className="font-semibold">
                <Link
                  href={`/workouts/${workout.id}`}
                  className="rounded-sm hover:text-accent-cyan hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-cyan"
                >
                  {workout.title}
                </Link>
              </h3>

              <time
                dateTime={workout.date}
                className="mt-1 block text-sm text-text-muted"
              >
                {dateFormatter.format(new Date(workout.date))}
              </time>

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