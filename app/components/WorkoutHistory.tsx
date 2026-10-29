"use client";

import { useEffect, useState } from "react";

type Workout = {
  id: string;
  title: string;
  date: string;
  durationMinutes: number | null;
  notes: string | null;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
};

type WorkoutHistoryResponse = {
  workouts: Workout[];
  pagination: Pagination;
};

const workoutDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default function WorkoutHistory() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<WorkoutHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  let active = true;

  async function fetchWorkouts() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/workouts?page=${page}&pageSize=10`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Sign in to view your workout history."
            : "Unable to load your workout history.",
        );
      }

      const result: WorkoutHistoryResponse = await response.json();

      if (active) {
        setData(result);
      }
    } catch (error: unknown) {
      if (active) {
        setError(
          error instanceof Error
            ? error.message
            : "Something went wrong while loading workouts.",
        );
      }
    } finally {
      if (active) {
        setLoading(false);
      }
    }
  }

  void fetchWorkouts();

  return () => {
    active = false;
  };
}, [page]);

  if (loading) {
    return (
      <p className="text-sm text-text-muted" role="status">
        Loading your workout history...
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-400" role="alert">
        {error}
      </p>
    );
  }

  if (!data) return null;

  return (
    <section aria-label="Workout history">
      {data.workouts.length === 0 ? (
        <p className="text-sm text-text-muted">
          {data.pagination.total === 0
            ? "No workouts yet. Your recorded workouts will appear here."
            : "No workouts on this page. Go back to an earlier page."}
        </p>
      ) : (
        <ul className="divide-y divide-app-border rounded-2xl border border-app-border bg-app-surface">
          {data.workouts.map((workout) => (
            <li key={workout.id} className="p-5">
              <h2 className="font-semibold">{workout.title}</h2>
              <time
                dateTime={workout.date}
                className="mt-1 block text-sm text-text-muted"
                >
                {workoutDateFormatter.format(new Date(workout.date))}
            </time>
              <p className="mt-1 text-sm text-text-muted">
                {workout.durationMinutes != null
                  ? `${workout.durationMinutes} min`
                  : "Duration not set"}
              </p>
            </li>
          ))}
        </ul>
      )}

      <nav
        aria-label="Workout history pagination"
        className="mt-6 flex items-center justify-between gap-4"
      >
        <button
          type="button"
          disabled={page === 1}
          onClick={() => setPage((currentPage) => currentPage - 1)}
          className="rounded-lg border border-app-border px-4 py-2 text-sm text-accent-cyan disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <p className="text-sm text-text-muted" role="status">
          {data.pagination.total === 0
            ? "0 workouts"
            : `Page ${data.pagination.page} of ${data.pagination.totalPages}`}
        </p>

        <button
          type="button"
          disabled={!data.pagination.hasNextPage}
          onClick={() => setPage((currentPage) => currentPage + 1)}
          className="rounded-lg border border-app-border px-4 py-2 text-sm text-accent-cyan disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </nav>
    </section>
  );
}