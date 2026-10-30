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
  analytics: {
    workoutCount: number;
    workoutsWithDuration: number;
    totalTrainingMinutes: number;
    averageDurationMinutes: number | null;
  };
};

type HistoryRange = "all" | "week" | "month";

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
  const [range, setRange] = useState<HistoryRange>("all");

  useEffect(() => {
    let active = true;

    async function fetchWorkouts() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/workouts?page=${page}&pageSize=10&range=${range}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? "Sign in to view your workout history."
              : "Unable to load your workout history.",
          );
        }

        const result: WorkoutHistoryResponse = await response.json();

        if (active) setData(result);
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
  }, [page, range]);

  return (
    <section aria-label="Workout history">
      <div className="mb-6">
        <label
          htmlFor="history-range"
          className="mb-2 block text-sm font-medium"
        >
          Date range (UTC)
        </label>

        <select
          id="history-range"
          value={range}
          onChange={(event) => {
            const nextRange = event.target.value;

            if (
              nextRange === "all" ||
              nextRange === "week" ||
              nextRange === "month"
            ) {
              setRange(nextRange);
              setPage(1);
            }
          }}
          className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-text-primary"
        >
          <option value="all">All time</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-text-muted" role="status">
          Loading your workout history...
        </p>
      ) : error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : data ? (
        <>
          <dl className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-app-border bg-app-surface p-5">
              <dt className="text-sm text-text-muted">Workouts</dt>
              <dd className="mt-2 text-2xl font-bold">
                {data.analytics.workoutCount}
              </dd>
            </div>

            <div className="rounded-2xl border border-app-border bg-app-surface p-5">
              <dt className="text-sm text-text-muted">Training time</dt>
              <dd className="mt-2 text-2xl font-bold">
                {data.analytics.totalTrainingMinutes} min
              </dd>
            </div>

            <div className="rounded-2xl border border-app-border bg-app-surface p-5">
              <dt className="text-sm text-text-muted">
                Average recorded duration
              </dt>
              <dd className="mt-2 text-2xl font-bold">
                {data.analytics.averageDurationMinutes === null
                  ? "—"
                  : `${data.analytics.averageDurationMinutes.toFixed(1)} min`}
              </dd>
              <dd className="mt-1 text-xs text-text-muted">
                Based on {data.analytics.workoutsWithDuration} workouts
                with recorded duration
              </dd>
            </div>
          </dl>

          {data.workouts.length === 0 ? (
            <p className="text-sm text-text-muted">
              {data.pagination.total === 0
                ? range === "all"
                  ? "No workouts yet. Your recorded workouts will appear here."
                  : "No workouts found for this date range."
                : "No workouts on this page. Go back to an earlier page."}
            </p>
          ) : (
            <ul className="divide-y divide-app-border rounded-2xl border border-app-border bg-app-surface">
              {data.workouts.map((workout) => (
                <li key={workout.id} className="p-5">
                  <h2 className="font-semibold">
                    <Link
                      href={`/workouts/${workout.id}`}
                      className="rounded-sm hover:text-accent-cyan hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-cyan"
                    >
                      {workout.title}
                    </Link>
                  </h2>

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
        </>
      ) : null}
    </section>
  );
}