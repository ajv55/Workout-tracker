"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  const router = useRouter();
  const deletingRef = useRef(false);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  const [state, setState] = useState<LoadState>({
    status: "loading",
  });
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadWorkout() {
      setState({ status: "loading" });
      setConfirmingDelete(false);
      setDeleteError(null);

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

  async function handleDelete() {
    if (
      !confirmingDelete ||
      deletingRef.current ||
      state.status !== "success" ||
      state.workout.id !== workoutId
    ) {
      return;
    }

    deletingRef.current = true;
    setDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(
        `/api/workouts/${encodeURIComponent(workoutId)}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Sign in to delete this workout."
            : response.status === 404
              ? "Workout not found. It may already have been deleted."
              : "Unable to delete this workout. Try again.",
        );
      }

      router.push("/workouts");
      router.refresh();
    } catch (error: unknown) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Unable to delete this workout.",
      );
      deletingRef.current = false;
      setDeleting(false);
    }
  }

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

  if (workout.id !== workoutId) return null;

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

      <div className="mt-8 border-t border-app-border pt-6">
        <div className="flex flex-wrap items-center gap-4">
          {!deleting && (
            <Link
              href={`/workouts/${workout.id}/edit`}
              className="rounded-lg bg-accent-cyan px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Edit workout
            </Link>
          )}

          <button
            ref={deleteButtonRef}
            type="button"
            disabled={deleting}
            aria-expanded={confirmingDelete}
            aria-controls="delete-confirmation"
            onClick={() => {
              setConfirmingDelete(true);
              setDeleteError(null);
            }}
            className="rounded-lg border border-red-400/40 px-4 py-2 text-sm font-medium text-red-400 disabled:opacity-50"
          >
            Delete workout
          </button>
        </div>

        <div id="delete-confirmation" hidden={!confirmingDelete}>
          {confirmingDelete && (
            <div
              role="group"
              aria-labelledby="delete-confirmation-heading"
              aria-busy={deleting}
              className="mt-5 rounded-xl border border-red-400/30 bg-red-500/5 p-4"
            >
              <h3
                id="delete-confirmation-heading"
                className="font-semibold"
              >
                Delete this workout?
              </h3>

              <p className="mt-2 break-words text-sm text-text-muted">
                “{workout.title}” will be permanently deleted.
                This cannot be undone.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    setConfirmingDelete(false);
                    setDeleteError(null);
                    deleteButtonRef.current?.focus();
                  }}
                  className="rounded-lg border border-app-border px-4 py-2 text-sm disabled:opacity-50"
                >
                  Keep workout
                </button>

                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void handleDelete()}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Permanently delete"}
                </button>
              </div>
            </div>
          )}
        </div>

        {deleteError && (
          <p role="alert" className="mt-4 text-sm text-red-400">
            {deleteError}
          </p>
        )}

        <p role="status" className="mt-4 text-sm text-text-muted">
          {deleting ? "Deleting your workout..." : ""}
        </p>
      </div>
    </article>
  );
}