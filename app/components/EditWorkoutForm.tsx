"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { updateWorkoutSchema } from "@/app/lib/validations/workout";

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

type FormValues = {
  title: string;
  date: string;
  duration: string;
  notes: string;
};

type FieldName = "title" | "date" | "durationMinutes" | "notes";
type FieldErrors = Partial<Record<FieldName, string[]>>;

const inputClass =
  "mt-2 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm";

function FieldError({
  id,
  messages,
}: {
  id: string;
  messages?: string[];
}) {
  if (!messages?.length) return null;

  return (
    <p id={id} className="mt-2 text-sm text-red-400">
      {messages.join(" ")}
    </p>
  );
}

export default function EditWorkoutForm({
  workoutId,
  todayUtc,
}: {
  workoutId: string;
  todayUtc: string;
}) {
  const router = useRouter();
  const submitting = useRef(false);

  const [form, setForm] = useState<FormValues | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    let active = true;

    async function loadWorkout() {
      setLoading(true);
      setLoadError(null);
      setForm(null);
      setLoadedId(null);

      try {
        const response = await fetch(
          `/api/workouts/${encodeURIComponent(workoutId)}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? "Sign in to edit this workout."
              : response.status === 404
                ? "Workout not found."
                : "Unable to load this workout.",
          );
        }

        const data: WorkoutResponse = await response.json();

        if (active) {
          setForm({
            title: data.workout.title,
            date: data.workout.date.slice(0, 10),
            duration: data.workout.durationMinutes?.toString() ?? "",
            notes: data.workout.notes ?? "",
          });
          setLoadedId(workoutId);
        }
      } catch (error: unknown) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load this workout.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadWorkout();

    return () => {
      active = false;
    };
  }, [workoutId]);

  function updateField(field: keyof FormValues, value: string) {
    setForm((current) =>
      current ? { ...current, [field]: value } : current,
    );
    setSaveError(null);
    setFieldErrors({});
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form || loadedId !== workoutId || submitting.current) return;

    setSaveError(null);
    setFieldErrors({});

    const payload = {
      title: form.title,
      date: form.date,
      durationMinutes:
        form.duration.trim() === "" ? null : Number(form.duration),
      notes: form.notes.trim() === "" ? null : form.notes,
    };

    const validation = updateWorkoutSchema.safeParse(payload);

    if (!validation.success) {
      setFieldErrors(validation.error.flatten().fieldErrors);
      setSaveError("Check the highlighted fields.");
      return;
    }

    submitting.current = true;
    setSaving(true);

    try {
      const response = await fetch(
        `/api/workouts/${encodeURIComponent(workoutId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          // Preserve the date-only string for server validation.
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        if (response.status === 400) {
          const body = await response.json();
          setFieldErrors(body.errors ?? {});
        }

        throw new Error(
          response.status === 401
            ? "Sign in to save this workout."
            : response.status === 404
              ? "Workout not found. It may have been deleted."
              : response.status === 400
                ? "Check your workout details."
                : "Unable to save this workout.",
        );
      }

      router.push(`/workouts/${workoutId}`);
      router.refresh();
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to save this workout.",
      );
      submitting.current = false;
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p role="status" className="text-sm text-text-muted">
        Loading workout...
      </p>
    );
  }

  if (loadError) {
    return (
      <p role="alert" className="text-sm text-red-400">
        {loadError}
      </p>
    );
  }

  if (!form || loadedId !== workoutId) return null;

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={saving}
      className="rounded-2xl border border-app-border bg-app-surface p-6"
    >
      <fieldset disabled={saving} className="space-y-5">
        <legend className="sr-only">Edit workout details</legend>

        <div>
          <label htmlFor="edit-title" className="text-sm font-medium">
            Title
          </label>
          <input
            id="edit-title"
            type="text"
            required
            maxLength={100}
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            aria-invalid={Boolean(fieldErrors.title?.length)}
            aria-describedby={
              fieldErrors.title?.length ? "edit-title-error" : undefined
            }
            className={inputClass}
          />
          <FieldError id="edit-title-error" messages={fieldErrors.title} />
        </div>

        <div>
          <label htmlFor="edit-date" className="text-sm font-medium">
            Training date (UTC)
          </label>
          <input
            id="edit-date"
            type="date"
            required
            max={todayUtc}
            value={form.date}
            onChange={(event) => updateField("date", event.target.value)}
            aria-invalid={Boolean(fieldErrors.date?.length)}
            aria-describedby="edit-date-help"
            className={inputClass}
          />
          <p id="edit-date-help" className="mt-2 text-xs text-text-muted">
            Choose the calendar day you trained, up to today in UTC.
          </p>
          <FieldError id="edit-date-error" messages={fieldErrors.date} />
        </div>

        <div>
          <label htmlFor="edit-duration" className="text-sm font-medium">
            Duration in minutes (optional)
          </label>
          <input
            id="edit-duration"
            type="number"
            min="1"
            step="1"
            value={form.duration}
            onChange={(event) =>
              updateField("duration", event.target.value)
            }
            aria-invalid={Boolean(fieldErrors.durationMinutes?.length)}
            aria-describedby="edit-duration-help"
            className={inputClass}
          />
          <p id="edit-duration-help" className="mt-2 text-xs text-text-muted">
            Leave empty to clear the recorded duration.
          </p>
          <FieldError
            id="edit-duration-error"
            messages={fieldErrors.durationMinutes}
          />
        </div>

        <div>
          <label htmlFor="edit-notes" className="text-sm font-medium">
            Notes (optional)
          </label>
          <textarea
            id="edit-notes"
            rows={4}
            maxLength={1000}
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            aria-invalid={Boolean(fieldErrors.notes?.length)}
            aria-describedby={
              fieldErrors.notes?.length ? "edit-notes-error" : undefined
            }
            className={inputClass}
          />
          <FieldError id="edit-notes-error" messages={fieldErrors.notes} />
        </div>
      </fieldset>

      {saveError && (
        <p role="alert" className="mt-5 text-sm text-red-400">
          {saveError}
        </p>
      )}

      <p role="status" className="mt-4 text-sm text-text-muted">
        {saving ? "Saving your changes..." : ""}
      </p>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-accent-cyan px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>

        {!saving && (
          <Link
            href={`/workouts/${workoutId}`}
            className="text-sm text-text-muted hover:text-text-primary"
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}