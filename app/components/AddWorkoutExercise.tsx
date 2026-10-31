"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { createExerciseSchema } from "@/app/lib/validations/exercise";

type Exercise = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  isCustom: boolean;
};

type CatalogResponse = {
  exercises: Exercise[];
  pagination: {
    page: number;
    totalPages: number;
    hasNextPage: boolean;
  };
};

export type AddedWorkoutExercise = {
  id: string;
  exerciseId: string;
  order: number;
  exercise: {
    id: string;
    name: string;
    category: string;
  };
};

type Props = {
  workoutId: string;
  attachedExerciseIds: string[];
  disabled?: boolean;
  tryStartOperation: () => boolean;
  finishOperation: () => void;
  onAdded: (exercise: AddedWorkoutExercise) => void;
};

export default function AddWorkoutExercise({
  workoutId,
  attachedExerciseIds,
  disabled = false,
  tryStartOperation,
  finishOperation,
  onAdded,
}: Props) {
  const prefix = useId();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", category: "", description: "" });
  const [recentlyCreated, setRecentlyCreated] = useState<Exercise[]>([]);
  const [page, setPage] = useState(1);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);

  const submitting = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadExercises() {
      setLoading(true);
      setLoadError(null);

      try {
        const response = await fetch(
          `/api/exercises?page=${page}&pageSize=20`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? "Sign in to view exercises."
              : "Unable to load exercises.",
          );
        }

        const result: CatalogResponse = await response.json();

        if (active) setCatalog(result);
      } catch (error: unknown) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load exercises.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadExercises();

    return () => {
      active = false;
    };
  }, [page, reload]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      disabled ||
      submitting.current ||
      loading ||
      !selectedId ||
      attachedExerciseIds.includes(selectedId)
    ) {
      return;
    }

    if (!tryStartOperation()) return;

    submitting.current = true;
    setSaving(true);
    setSaveError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/workouts/${encodeURIComponent(workoutId)}/exercises`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exerciseId: selectedId }),
        },
      );

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Sign in to add exercises."
            : response.status === 404
              ? "The workout or selected exercise is no longer available."
              : response.status === 409
                ? "This exercise is already attached. Refresh to see the latest list."
                : "Unable to add this exercise.",
        );
      }

      const result: {
        workoutExercise: AddedWorkoutExercise;
      } = await response.json();

      onAdded(result.workoutExercise);
      setSelectedId("");
      setSuccess(`${result.workoutExercise.exercise.name} added.`);
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to add this exercise.",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
      finishOperation();
    }
  }

  async function createCustomExercise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || submitting.current || loading || loadError) return;
    setCreateError(null);
    const parsed = createExerciseSchema.safeParse({
      name: draft.name,
      category: draft.category,
      ...(draft.description.trim() ? { description: draft.description } : {}),
    });
    if (!parsed.success) {
      setCreateError(parsed.error.issues.map((issue) => issue.message).join(" "));
      return;
    }
    if (!tryStartOperation()) return;
    submitting.current = true;
    setCreating(true);
    setSuccess(null);
    setSaveError(null);
    try {
      const response = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) {
        if (response.status === 401) throw new Error("Sign in to create exercises.");
        if (response.status === 400) {
          const body: { errors?: Record<string, string[]> } = await response.json();
          throw new Error(Object.values(body.errors ?? {}).flat().join(" ") ||
            "Check the exercise details.");
        }
        throw new Error("Unable to confirm creation. Check the catalog before retrying.");
      }
      const result: { exercise: Exercise } = await response.json();
      setRecentlyCreated((current) => [result.exercise,
        ...current.filter((item) => item.id !== result.exercise.id)]);
      setSelectedId(result.exercise.id);
      setDraft({ name: "", category: "", description: "" });
      setShowCreate(false);
      setSuccess(`${result.exercise.name} created privately. Click Add exercise to attach it to this workout.`);
      // Reload pagination while retaining the returned exercise as a selectable option,
      // even when its alphabetical position is on another catalog page.
      setReload((current) => current + 1);
    } catch (error: unknown) {
      setCreateError(error instanceof Error ? error.message :
        "Unable to confirm creation. Check the catalog before retrying.");
    } finally {
      submitting.current = false;
      setCreating(false);
      finishOperation();
    }
  }

  function changeDraft(field: keyof typeof draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setCreateError(null);
  }

  const busy = disabled || saving || creating;
  const catalogIds = new Set(catalog?.exercises.map((item) => item.id) ?? []);
  const extraExercises = recentlyCreated.filter((item) => !catalogIds.has(item.id));
  const availableCount = (catalog?.exercises.length ?? 0) + extraExercises.length;
  const inputClass = "mt-1 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm disabled:opacity-50";


  return (
    <div className="mt-5 rounded-xl border border-app-border p-4">
      <h4 className="font-semibold">Add an exercise</h4>

      {loading && !catalog ? (
        <p role="status" className="mt-3 text-sm text-text-muted">
          Loading exercise catalog...
        </p>
      ) : loadError ? (
        <div className="mt-3">
          <p role="alert" className="text-sm text-red-400">
            {loadError}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => setReload((current) => current + 1)}
            className="mt-3 text-sm text-accent-cyan disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      ) : catalog ? (
        <>
          <form onSubmit={handleSubmit} className="mt-4">
            <label
              htmlFor={`${prefix}-picker`}
              className="block text-sm font-medium"
            >
              Exercise
            </label>

            <select
              id={`${prefix}-picker`}
              value={selectedId}
              disabled={busy || loading || availableCount === 0}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setSaveError(null);
                setSuccess(null);
              }}
              className="mt-2 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="">Select an exercise</option>

              {extraExercises.length > 0 && (
                <optgroup label="Recently created by you">
                  {extraExercises.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}
                      disabled={attachedExerciseIds.includes(exercise.id)}>
                      {exercise.name} — Custom
                      {attachedExerciseIds.includes(exercise.id) ? " (already added)" : ""}
                    </option>
                  ))}
                </optgroup>
              )}
              {catalog.exercises.map((exercise) => {
                const attached =
                  attachedExerciseIds.includes(exercise.id);

                return (
                  <option
                    key={exercise.id}
                    value={exercise.id}
                    disabled={attached}
                  >
                    {exercise.name}
                    {exercise.isCustom ? " — Custom" : " — Shared"}
                    {attached ? " (already added)" : ""}
                  </option>
                );
              })}
            </select>

            {availableCount === 0 && (
              <p className="mt-2 text-sm text-text-muted">
                No exercises on this catalog page.
              </p>
            )}

            <button
              type="submit"
              disabled={
                busy || loading ||
                !selectedId ||
                attachedExerciseIds.includes(selectedId)
              }
              className="mt-4 rounded-lg bg-accent-cyan px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add exercise"}
            </button>
          </form>

          <nav
            aria-label="Exercise catalog pages"
            className="mt-4 flex items-center justify-between gap-3"
          >
            <button
              type="button"
              disabled={busy || loading || page === 1}
              onClick={() => {
                setSelectedId("");
                setPage((current) => current - 1);
              }}
              className="text-sm text-accent-cyan disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-xs text-text-muted">
              {catalog.pagination.totalPages === 0
                ? "0 catalog pages"
                : `Page ${catalog.pagination.page} of ${catalog.pagination.totalPages}`}
            </span>

            <button
              type="button"
              disabled={busy || loading || !catalog.pagination.hasNextPage}
              onClick={() => {
                setSelectedId("");
                setPage((current) => current + 1);
              }}
              className="text-sm text-accent-cyan disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        </>
      ) : null}

      <section className="mt-5 border-t border-app-border pt-4">
        <button type="button" disabled={busy}
          aria-expanded={showCreate} aria-controls={`${prefix}-custom-form`}
          onClick={() => { setShowCreate((current) => !current); setCreateError(null); }}
          className="text-sm font-semibold text-accent-cyan disabled:opacity-50">
          {showCreate ? "Hide custom exercise form" : "Create custom exercise"}
        </button>
        <div id={`${prefix}-custom-form`} hidden={!showCreate}>
          <p className="mt-2 text-sm text-text-muted">
            Save an exercise to your private catalog for reuse. Add sets, reps,
            weight, and rest after attaching it to a workout.
          </p>
          <form onSubmit={createCustomExercise} className="mt-3 space-y-3"
            aria-label="Create custom exercise" aria-busy={creating}>
            <fieldset disabled={busy || loading || loadError !== null} className="space-y-3">
              <legend className="sr-only">Custom exercise details</legend>
              <label htmlFor={`${prefix}-name`} className="block text-sm">
                Exercise name
                <input id={`${prefix}-name`} required maxLength={100}
                  value={draft.name} placeholder="Barbell bent-over row"
                  onChange={(event) => changeDraft("name", event.target.value)}
                  className={inputClass} />
              </label>
              <label htmlFor={`${prefix}-category`} className="block text-sm">
                Category
                <input id={`${prefix}-category`} required maxLength={50}
                  value={draft.category} placeholder="Strength"
                  onChange={(event) => changeDraft("category", event.target.value)}
                  className={inputClass} />
              </label>
              <label htmlFor={`${prefix}-description`} className="block text-sm">
                Description (optional)
                <textarea id={`${prefix}-description`} maxLength={1000} rows={3}
                  value={draft.description}
                  onChange={(event) => changeDraft("description", event.target.value)}
                  className={inputClass} />
              </label>
              <button type="submit"
                className="rounded-lg bg-accent-cyan px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">
                {creating ? "Creating..." : "Save custom exercise"}
              </button>
            </fieldset>
            {createError && <p role="alert" className="text-sm text-red-400">{createError}</p>}
          </form>
        </div>
      </section>

      {saveError && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {saveError}
        </p>
      )}

      <p role="status" className="mt-3 text-sm text-text-muted">
        {success}
      </p>
    </div>
  );
}
