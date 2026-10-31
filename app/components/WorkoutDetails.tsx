"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AddWorkoutExercise, {
  type AddedWorkoutExercise,
} from "@/app/components/AddWorkoutExercise";
import RemoveWorkoutExercise from "@/app/components/RemoveWorkoutExercise";
import WorkoutSets, {
  type WorkoutSetRecord,
} from "@/app/components/WorkoutSets";

type WorkoutExercise = AddedWorkoutExercise & {
  sets: WorkoutSetRecord[];
};

type Workout = {
  id: string;
  title: string;
  date: string;
  durationMinutes: number | null;
  notes: string | null;
  exercises: WorkoutExercise[];
};

type WorkoutResponse = {
  workout: Omit<Workout, "exercises"> & {
    exercises: Array<
      AddedWorkoutExercise & {
        sets?: WorkoutSetRecord[] | null;
      }
    >;
  };
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

function sortExercises(exercises: WorkoutExercise[]) {
  return [...exercises].sort(
    (first, second) =>
      first.order - second.order ||
      first.id.localeCompare(second.id),
  );
}

export default function WorkoutDetails({
  workoutId,
}: {
  workoutId: string;
}) {
  const router = useRouter();

  const operationLocked = useRef(false);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const exercisesHeadingRef = useRef<HTMLHeadingElement>(null);

  const [state, setState] = useState<LoadState>({
    status: "loading",
  });
  const [operationBusy, setOperationBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [exerciseMessage, setExerciseMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadWorkout() {
      setState({ status: "loading" });
      setConfirmingDelete(false);
      setDeleteError(null);
      setExerciseMessage("");

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

        const exercises = data.workout.exercises.map((exercise) => ({
          ...exercise,
          sets: exercise.sets ?? [],
        }));

        if (active) {
          setState({
            status: "success",
            workout: {
              ...data.workout,
              exercises: sortExercises(exercises),
            },
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

  function tryStartOperation() {
    if (operationLocked.current) return false;

    operationLocked.current = true;
    setOperationBusy(true);
    return true;
  }

  function finishOperation() {
    operationLocked.current = false;
    setOperationBusy(false);
  }

  function handleExerciseAdded(added: AddedWorkoutExercise) {
    setState((current) => {
      if (
        current.status !== "success" ||
        current.workout.id !== workoutId ||
        current.workout.exercises.some((item) => item.id === added.id)
      ) {
        return current;
      }

      return {
        status: "success",
        workout: {
          ...current.workout,
          exercises: sortExercises([
            ...current.workout.exercises,
            { ...added, sets: [] },
          ]),
        },
      };
    });

    setExerciseMessage("");
  }

  function handleExerciseRemoved(attachmentId: string) {
    setState((current) => {
      if (
        current.status !== "success" ||
        current.workout.id !== workoutId
      ) {
        return current;
      }

      return {
        status: "success",
        workout: {
          ...current.workout,
          exercises: current.workout.exercises.filter(
            (item) => item.id !== attachmentId,
          ),
        },
      };
    });

    setExerciseMessage("Exercise removed from this workout.");
    exercisesHeadingRef.current?.focus();
  }

  function handleSetsChanged(
    attachmentId: string,
    sets: WorkoutSetRecord[],
  ) {
    setState((current) => {
      if (
        current.status !== "success" ||
        current.workout.id !== workoutId
      ) {
        return current;
      }

      return {
        status: "success",
        workout: {
          ...current.workout,
          exercises: current.workout.exercises.map((exercise) =>
            exercise.id === attachmentId
              ? { ...exercise, sets }
              : exercise,
          ),
        },
      };
    });
  }

  async function handleDelete() {
    if (
      !confirmingDelete ||
      state.status !== "success" ||
      state.workout.id !== workoutId ||
      !tryStartOperation()
    ) {
      return;
    }

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
      setDeleting(false);
      finishOperation();
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

  const exerciseControlsDisabled = operationBusy || confirmingDelete;

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
            {workout.notes?.trim()
              ? workout.notes
              : "No notes recorded."}
          </dd>
        </div>
      </dl>

      <section
        aria-labelledby="workout-exercises-heading"
        className="mt-8 border-t border-app-border pt-6"
      >
        <h3
          ref={exercisesHeadingRef}
          id="workout-exercises-heading"
          tabIndex={-1}
          className="text-lg font-semibold"
        >
          Exercises
        </h3>

        <p role="status" className="mt-2 text-sm text-text-muted">
          {exerciseMessage}
        </p>

        {workout.exercises.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">
            No exercises added to this workout yet.
          </p>
        ) : (
          <ol className="mt-4 space-y-3">
            {workout.exercises.map((item, index) => (
              <li
                key={item.id}
                className="flex items-start gap-3 rounded-xl border border-app-border p-4"
              >
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-cyan/10 text-sm font-semibold text-accent-cyan"
                >
                  {index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <h4 className="break-words font-semibold">
                    {item.exercise.name}
                  </h4>

                  <p className="mt-1 break-words text-sm text-text-muted">
                    {item.exercise.category}
                  </p>

                  <WorkoutSets
                    workoutId={workout.id}
                    attachmentId={item.id}
                    exerciseName={item.exercise.name}
                    sets={item.sets}
                    disabled={exerciseControlsDisabled}
                    tryStartOperation={tryStartOperation}
                    finishOperation={finishOperation}
                    onSetsChanged={(sets) =>
                      handleSetsChanged(item.id, sets)
                    }
                  />

                  <RemoveWorkoutExercise
                    workoutId={workout.id}
                    attachmentId={item.id}
                    exerciseName={item.exercise.name}
                    disabled={exerciseControlsDisabled}
                    tryStartOperation={tryStartOperation}
                    finishOperation={finishOperation}
                    onRemoved={handleExerciseRemoved}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}

        <AddWorkoutExercise
          key={workout.id}
          workoutId={workout.id}
          attachedExerciseIds={workout.exercises.map(
            (item) => item.exerciseId,
          )}
          disabled={exerciseControlsDisabled}
          tryStartOperation={tryStartOperation}
          finishOperation={finishOperation}
          onAdded={handleExerciseAdded}
        />
      </section>

      <div className="mt-8 border-t border-app-border pt-6">
        <div className="flex flex-wrap items-center gap-4">
          {!operationBusy && !confirmingDelete && (
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
            disabled={operationBusy}
            aria-expanded={confirmingDelete}
            aria-controls="delete-confirmation"
            onClick={() => {
              if (operationLocked.current) return;
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
                “{workout.title}” and its recorded exercises and sets
                will be permanently deleted. Catalog exercises will
                remain. This cannot be undone.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={operationBusy}
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
                  disabled={operationBusy}
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