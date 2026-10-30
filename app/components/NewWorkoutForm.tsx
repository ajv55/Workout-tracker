"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { createWorkoutSchema } from "@/app/lib/validations/workout";

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

export default function NewWorkoutForm({
  todayUtc,
}: {
  todayUtc: string;
}) {
  const router = useRouter();
  const submitting = useRef(false);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayUtc);
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting.current) return;

    setError(null);
    setFieldErrors({});

    const payload = {
      title,
      date,
      ...(duration.trim() === ""
        ? {}
        : { durationMinutes: Number(duration) }),
      ...(notes.trim() === "" ? {} : { notes }),
    };

    const validation = createWorkoutSchema.safeParse(payload);

    if (!validation.success) {
      setFieldErrors(validation.error.flatten().fieldErrors);
      setError("Check the highlighted fields.");
      return;
    }

    submitting.current = true;
    setSaving(true);

    try {
      const response = await fetch("/api/workouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Send the date-only string. The server transforms it to a Date.
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 400) {
          const body = await response.json();
          setFieldErrors(body.errors ?? {});
        }

        throw new Error(
          response.status === 401
            ? "Sign in before creating a workout."
            : response.status === 400
              ? "Check your workout details."
              : "Unable to create the workout.",
        );
      }

      router.push("/workouts");
      router.refresh();
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to create the workout.",
      );

      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={saving}
      className="rounded-2xl border border-app-border bg-app-surface p-6"
    >
      <fieldset disabled={saving} className="space-y-5">
        <legend className="sr-only">Workout details</legend>

        <div>
          <label htmlFor="workout-title" className="text-sm font-medium">
            Title
          </label>
          <input
            id="workout-title"
            type="text"
            required
            maxLength={100}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="For example, Upper body"
            aria-invalid={Boolean(fieldErrors.title?.length)}
            aria-describedby={
              fieldErrors.title?.length ? "workout-title-error" : undefined
            }
            className={inputClass}
          />
          <FieldError
            id="workout-title-error"
            messages={fieldErrors.title}
          />
        </div>

        <div>
          <label htmlFor="workout-date" className="text-sm font-medium">
            Training date (UTC)
          </label>
          <input
            id="workout-date"
            type="date"
            required
            max={todayUtc}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-invalid={Boolean(fieldErrors.date?.length)}
            aria-describedby="workout-date-help workout-date-error"
            className={inputClass}
          />
          <p id="workout-date-help" className="mt-2 text-xs text-text-muted">
            Defaults to today in UTC, which may differ from your local
            date. Choose the calendar day you trained, up to today in UTC.
          </p>
          <FieldError
            id="workout-date-error"
            messages={fieldErrors.date}
          />
        </div>

        <div>
          <label
            htmlFor="workout-duration"
            className="text-sm font-medium"
          >
            Duration in minutes (optional)
          </label>
          <input
            id="workout-duration"
            type="number"
            min="1"
            step="1"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            placeholder="For example, 45"
            aria-invalid={Boolean(fieldErrors.durationMinutes?.length)}
            aria-describedby={
              fieldErrors.durationMinutes?.length
                ? "workout-duration-error"
                : undefined
            }
            className={inputClass}
          />
          <FieldError
            id="workout-duration-error"
            messages={fieldErrors.durationMinutes}
          />
        </div>

        <div>
          <label htmlFor="workout-notes" className="text-sm font-medium">
            Notes (optional)
          </label>
          <textarea
            id="workout-notes"
            rows={4}
            maxLength={1000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="How did the workout go?"
            aria-invalid={Boolean(fieldErrors.notes?.length)}
            aria-describedby={
              fieldErrors.notes?.length ? "workout-notes-error" : undefined
            }
            className={inputClass}
          />
          <FieldError
            id="workout-notes-error"
            messages={fieldErrors.notes}
          />
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="mt-5 text-sm text-red-400">
          {error}
        </p>
      )}

      <p role="status" className="mt-4 text-sm text-text-muted">
        {saving ? "Saving your workout..." : ""}
      </p>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-accent-cyan px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save workout"}
        </button>

        {!saving && (
          <Link
            href="/workouts"
            className="text-sm text-text-muted hover:text-text-primary"
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}