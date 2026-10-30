"use client";

import { useEffect, useState } from "react";

type Workout = {
  id: string;
  title: string;
  date: string;
  durationMinutes: number | null;
  notes: string | null;
};

type WorkoutResponse = {
  workout: Workout;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; workout: Workout };

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default function WorkoutDetails({
  workoutId,
}: {
  workoutId: string;
}) {
  const [state, setState] = useState<LoadState>({
    status: "loading",
  });

  useEffect(() => {
    let active = true;

    async function loadWorkout() {
      setState({ status: "loading" });

      try {
        const response = await fetch(
          `/api/workouts/${encodeURIComponent(workoutId)}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? "Sign in to view this workout."
              : response.status === 404
                ? "Workout not found."
                : "Unable to load this workout.",
          );
        }

        const data: WorkoutResponse = await response.json();

        if (active) {
          setState({
            status: "success",
            workout: data.workout,
          });
        }
      } catch (error: unknown) {
        if (active) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Unable to load this workout.",
          });
        }
      }
    }

    void loadWorkout();

    return () => {
      active = false;
    };
  }, [workoutId]);

  if (state.status === "loading") {
    return (
      <p role="status" className="text-sm text-text-muted">
        Loading workout...
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <p role="alert" className="text-sm text-red-400">
        {state.message}
      </p>
    );
  }

  const { workout } = state;

  return (
    <article className="rounded-2xl border border-app-border bg-app-surface p-6">
      <h2 className="break-words text-2xl font-bold">
        {workout.title}
      </h2>

      <dl className="mt-6 space-y-5">
        <div>
          <dt className="text-sm text-text-muted">
            Training date (UTC)
          </dt>
          <dd className="mt-1 font-medium">
            <time dateTime={workout.date}>
              {dateFormatter.format(new Date(workout.date))}
            </time>
          </dd>
        </div>

        <div>
          <dt className="text-sm text-text-muted">Duration</dt>
          <dd className="mt-1 font-medium">
            {workout.durationMinutes !== null
              ? `${workout.durationMinutes} min`
              : "Duration not set"}
          </dd>
        </div>

        <div>
          <dt className="text-sm text-text-muted">Notes</dt>
          <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
            {workout.notes?.trim() ? workout.notes : "No notes recorded."}
          </dd>
        </div>
      </dl>
    </article>
  );
}