"use client";

import { useRef, useState } from "react";

type Props = {
  workoutId: string;
  attachmentId: string;
  exerciseName: string;
  disabled?: boolean;
  unsavedSetCount?: number;
  tryStartOperation: () => boolean;
  finishOperation: () => void;
  onRemoved: (attachmentId: string) => void;
};

export default function RemoveWorkoutExercise({
  workoutId,
  attachmentId,
  exerciseName,
  disabled = false,
  unsavedSetCount = 0,
  tryStartOperation,
  finishOperation,
  onRemoved,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitting = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  async function handleRemove() {
    if (
      disabled ||
      !confirming ||
      submitting.current ||
      !tryStartOperation()
    ) {
      return;
    }

    submitting.current = true;
    setRemoving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/workouts/${encodeURIComponent(workoutId)}/exercises/${encodeURIComponent(attachmentId)}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Sign in to remove this exercise."
            : response.status === 404
              ? "Workout exercise not found. Refresh to see the latest workout."
              : "Unable to remove this exercise.",
        );
      }

      onRemoved(attachmentId);
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to remove this exercise.",
      );
    } finally {
      submitting.current = false;
      setRemoving(false);
      finishOperation();
    }
  }

  return (
    <div className="mt-3">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || removing}
        aria-expanded={confirming}
        onClick={() => {
          setConfirming(true);
          setError(null);
        }}
        className="text-sm font-medium text-red-400 hover:underline disabled:opacity-50"
      >
        Remove exercise
      </button>

      {confirming && (
        <div
          role="group"
          aria-label={`Confirm removal of ${exerciseName}`}
          aria-busy={removing}
          className="mt-3 rounded-lg border border-red-400/30 p-3"
        >
          <p className="text-sm text-text-muted">
            Remove “{exerciseName}” and its recorded sets from this
            workout? The catalog exercise will remain available.
          </p>

          {unsavedSetCount > 0 && (
            <p className="mt-2 text-sm font-medium text-amber-300">
              {unsavedSetCount} {unsavedSetCount === 1 ? "set has" : "sets have"} unsaved edits.
              Confirming removal will discard these edits and permanently delete
              this exercise’s recorded sets. Choose Keep exercise to continue editing.
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={disabled || removing}
              onClick={() => {
                setConfirming(false);
                setError(null);
                triggerRef.current?.focus();
              }}
              className="rounded-lg border border-app-border px-3 py-2 text-sm disabled:opacity-50"
            >
              Keep exercise
            </button>

            <button
              type="button"
              disabled={disabled || removing}
              onClick={() => void handleRemove()}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {removing ? "Removing..." : unsavedSetCount > 0
                ? "Remove exercise and discard edits" : "Confirm removal"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <p role="status" className="mt-2 text-sm text-text-muted">
        {removing ? "Removing exercise..." : ""}
      </p>
    </div>
  );
}