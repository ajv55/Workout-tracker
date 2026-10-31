"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  createWorkoutSetsSchema,
  updateWorkoutSetSchema,
} from "@/app/lib/validations/workout-set";

import { getRestExpirationMs } from "@/app/lib/workout-rest";

export type WorkoutSetRecord = {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  completed: boolean;
  plannedRestSeconds: number | null;
  restStartedAt: string | null;
  restEndedAt: string | null;
};

type OperationProps = {
  disabled: boolean;
  tryStartOperation: () => boolean;
  finishOperation: () => void;
};

type Props = OperationProps & {
  workoutId: string;
  attachmentId: string;
  exerciseName: string;
  sets: WorkoutSetRecord[];
  onSetsChanged: (sets: WorkoutSetRecord[]) => void;
  onDirtyChange: (setId: string, dirty: boolean) => void;
};

type SetRowProps = OperationProps & {
  workoutId: string;
  attachmentId: string;
  set: WorkoutSetRecord;
  onSaved: (set: WorkoutSetRecord) => void;
  onRemoved: (setId: string) => void;
  onDirtyChange: (setId: string, dirty: boolean) => void;
};

const KG_PER_POUND = 0.45359237;

const inputClass =
  "mt-1 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm";

function toForm(set: WorkoutSetRecord) {
  const rest = set.plannedRestSeconds;

  return {
    reps: set.reps?.toString() ?? "",
    pounds:
      set.weightKg === null
        ? ""
        : Number((set.weightKg / KG_PER_POUND).toFixed(2)).toString(),
    completed: set.completed,
    restMinutes: rest === null ? "" : Math.floor(rest / 60).toString(),
    restSeconds: rest === null ? "" : (rest % 60).toString(),
  };
}

async function responseError(response: Response): Promise<string> {
  if (response.status === 401) {
    return "Sign in to update this workout.";
  }

  if (response.status === 404) {
    return "Workout exercise or set not found. Refresh the page.";
  }

  if (response.status === 409) {
    return "The workout changed. Refresh before trying again.";
  }

  if (response.status === 400) {
    const body = await response.json();
    const errors = body.errors as
      | Record<string, string[] | undefined>
      | undefined;

    const messages = errors
      ? Object.values(errors).flatMap((items) => items ?? [])
      : [];

    return messages.join(" ") || "Check the set values.";
  }

  return "The request failed. Refresh to check the saved workout before retrying.";
}

type ClockAnchor = { serverMs: number; receivedAt: number };

function formatRest(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function RestDisplay({ set, now }: {
  set: WorkoutSetRecord;
  now: number | null;
}) {
  const active = set.restStartedAt !== null && set.restEndedAt === null;
  const expiresAt = set.restStartedAt === null ? null :
    getRestExpirationMs(Date.parse(set.restStartedAt), set.plannedRestSeconds);
  if (active && expiresAt !== null && now !== null && now >= expiresAt) {
    return <p role="status" className="text-sm text-text-muted">
      Rest tracking expired. Timer wasn’t stopped; actual rest is unknown.
    </p>;
  }

  if (set.restStartedAt === null) {
    return <p className="text-sm text-text-muted">Rest has not started.</p>;
  }

  const start = Date.parse(set.restStartedAt);
  const end = set.restEndedAt === null ? now : Date.parse(set.restEndedAt);
  if (end === null) {
    return <p className="text-sm text-text-muted">Loading rest timer...</p>;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return <p role="alert">Unable to display saved rest time. Refresh the page.</p>;
  }
  const elapsed = Math.max(0, Math.floor((end - start) / 1000));
  const planned = set.plannedRestSeconds;
  const remaining = planned === null ? null : Math.max(0, planned - elapsed);
  const overtime = planned === null ? 0 : Math.max(0, elapsed - planned);

  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-accent-cyan">
        {set.restEndedAt !== null
          ? `Actual rest: ${formatRest(elapsed)}`
          : remaining === null
            ? `Rest elapsed: ${formatRest(elapsed)}`
            : overtime > 0
              ? `Over planned rest: +${formatRest(overtime)}`
              : `Rest remaining: ${formatRest(remaining)}`}
      </p>
      {active && (
        <p className="text-xs text-text-muted">
          Elapsed: {formatRest(elapsed)}. End rest when you are ready;
          reaching zero does not end it automatically.
        </p>
      )}
    </div>
  );
}

function SetRow({
  workoutId,
  attachmentId,
  set,
  disabled,
  tryStartOperation,
  finishOperation,
  onSaved,
  onRemoved,
  onDirtyChange,
}: SetRowProps) {
  const prefix = useId();
  const submitting = useRef(false);
  const removeButtonRef = useRef<HTMLButtonElement>(null);

  const [form, setForm] = useState(() => toForm(set));
  const [restAction, setRestAction] = useState<"START_REST" | "END_REST" | null>(null);
  const [clockAnchor, setClockAnchor] = useState<ClockAnchor | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const expiresAt = set.restStartedAt === null ? null :
    getRestExpirationMs(Date.parse(set.restStartedAt), set.plannedRestSeconds);
  const expired = expiresAt !== null && now !== null && now >= expiresAt &&
    set.restEndedAt === null;
  const running = set.restStartedAt !== null && set.restEndedAt === null && !expired;

  useEffect(() => {
    if (!running) return;
    function tick() {
      setNow(clockAnchor
        ? clockAnchor.serverMs + performance.now() - clockAnchor.receivedAt
        : Date.now());
    }
    const interval = window.setInterval(tick, 250);
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [running, clockAnchor]);

  const setUrl =
    `/api/workouts/${encodeURIComponent(workoutId)}` +
    `/exercises/${encodeURIComponent(attachmentId)}` +
    `/sets/${encodeURIComponent(set.id)}`;

  function change<K extends keyof typeof form>(
    field: K,
    value: (typeof form)[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
    setMessage("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disabled || submitting.current || confirmingRemoval) return;

    setError(null);
    setMessage("");

    const restEmpty =
      form.restMinutes.trim() === "" &&
      form.restSeconds.trim() === "";

    const minutes =
      form.restMinutes.trim() === "" ? 0 : Number(form.restMinutes);

    const seconds =
      form.restSeconds.trim() === "" ? 0 : Number(form.restSeconds);

    if (
      !restEmpty &&
      (
        !Number.isInteger(minutes) ||
        minutes < 0 ||
        !Number.isInteger(seconds) ||
        seconds < 0 ||
        seconds > 59
      )
    ) {
      setError(
        "Use nonnegative whole minutes and seconds from 0 to 59.",
      );
      return;
    }

    const original = toForm(set);

    const payload = {
      reps: form.reps.trim() === "" ? null : Number(form.reps),
      weightKg:
        form.pounds === original.pounds
          ? set.weightKg
          : form.pounds.trim() === ""
            ? null
            : Number(form.pounds) * KG_PER_POUND,
      completed: form.completed,
      plannedRestSeconds: restEmpty ? null : minutes * 60 + seconds,
    };

    const validation = updateWorkoutSetSchema.safeParse(payload);

    if (!validation.success) {
      setError(
        validation.error.issues.map((issue) => issue.message).join(" "),
      );
      return;
    }

    if (payload.completed && payload.reps === null) {
      setError("Record reps before completing this set.");
      return;
    }

    if (!tryStartOperation()) return;

    submitting.current = true;
    setSaving(true);

    try {
      const response = await fetch(setUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await responseError(response));
      }

      const result: { set: WorkoutSetRecord } = await response.json();

      onSaved(result.set);
      setForm(toForm(result.set));
      setMessage("Set saved.");
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Unable to save this set.",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
      finishOperation();
    }
  }

  async function remove() {
    if (
      disabled ||
      !confirmingRemoval ||
      submitting.current ||
      !tryStartOperation()
    ) {
      return;
    }

    submitting.current = true;
    setRemoving(true);
    setError(null);
    setMessage("");

    try {
      const response = await fetch(setUrl, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await responseError(response));
      }

      onRemoved(set.id);
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to remove this set.",
      );
    } finally {
      submitting.current = false;
      setRemoving(false);
      finishOperation();
    }
  }

  const restLocked = set.restStartedAt !== null;
  const originalForm = toForm(set);
  const dirty = (Object.keys(form) as Array<keyof typeof form>).some(
    (key) => form[key] !== originalForm[key],
  );

  useEffect(() => {
    onDirtyChange(set.id, dirty);
  }, [set.id, dirty, onDirtyChange]);

  // Remove this row from the registry when its set or attachment unmounts.
  useEffect(() => {
    return () => onDirtyChange(set.id, false);
  }, [set.id, onDirtyChange]);

  async function actOnRest(action: "START_REST" | "END_REST") {
    if (disabled || submitting.current || confirmingRemoval || dirty || expired) return;
    if (!tryStartOperation()) return;
    submitting.current = true;
    setRestAction(action);
    setError(null);
    setMessage("");
    try {
      const response = await fetch(`${setUrl}/rest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const serverMs = Date.parse(body?.serverNow ?? "");
        if (Number.isFinite(serverMs)) {
          setClockAnchor({ serverMs, receivedAt: performance.now() });
          setNow(serverMs);
        }
        throw new Error(typeof body?.message === "string"
          ? body.message : "Unable to update rest. Refresh before retrying.");
      }
      const result: { set: WorkoutSetRecord; serverNow: string } =
        await response.json();
      const serverMs = Date.parse(result.serverNow);
      setClockAnchor(Number.isFinite(serverMs)
        ? { serverMs, receivedAt: performance.now() }
        : null);
      if (Number.isFinite(serverMs)) setNow(serverMs);
      onSaved(result.set);
      setForm(toForm(result.set));
      setMessage(action === "START_REST" ? "Rest started." : "Rest ended.");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Unable to update rest.");
    } finally {
      submitting.current = false;
      setRestAction(null);
      finishOperation();
    }
  }

  const busy = disabled || saving || removing || restAction !== null;

  return (
    <div
      aria-busy={saving || removing || restAction !== null}
      className="rounded-xl border border-app-border p-3"
    >
      <form onSubmit={save} aria-label={`Edit set ${set.setNumber}`}>
        <fieldset disabled={busy || confirmingRemoval}>
          <legend className="px-1 text-sm font-semibold">
            Set {set.setNumber}{dirty ? " — Unsaved changes" : ""}
          </legend>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label
              htmlFor={`${prefix}-reps`}
              className="text-xs text-text-muted"
            >
              Reps
              <input
                id={`${prefix}-reps`}
                type="number"
                min="1"
                step="1"
                value={form.reps}
                onChange={(event) => change("reps", event.target.value)}
                className={inputClass}
              />
            </label>

            <label
              htmlFor={`${prefix}-weight`}
              className="text-xs text-text-muted"
            >
              Weight (lb)
              <input
                id={`${prefix}-weight`}
                type="number"
                min="0"
                step="any"
                value={form.pounds}
                onChange={(event) => change("pounds", event.target.value)}
                className={inputClass}
              />
            </label>

            <label
              htmlFor={`${prefix}-minutes`}
              className="text-xs text-text-muted"
            >
              Rest minutes
              <input
                id={`${prefix}-minutes`}
                disabled={restLocked}
                type="number"
                min="0"
                max="60"
                step="1"
                value={form.restMinutes}
                onChange={(event) =>
                  change("restMinutes", event.target.value)
                }
                className={inputClass}
              />
            </label>

            <label
              htmlFor={`${prefix}-seconds`}
              className="text-xs text-text-muted"
            >
              Rest seconds
              <input
                id={`${prefix}-seconds`}
                disabled={restLocked}
                type="number"
                min="0"
                max="59"
                step="1"
                value={form.restSeconds}
                onChange={(event) =>
                  change("restSeconds", event.target.value)
                }
                className={inputClass}
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={restLocked}
                checked={form.completed}
                onChange={(event) =>
                  change("completed", event.target.checked)
                }
              />
              Completed
            </label>

            <button
              type="submit"
              disabled={busy || confirmingRemoval}
              className="rounded-lg bg-accent-cyan px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save set"}
            </button>

            <button
              type="button"
              disabled={busy || confirmingRemoval}
              onClick={() => {
                setForm(toForm(set));
                setError(null);
                setMessage("Changes discarded.");
              }}
              className="text-sm text-text-muted disabled:opacity-50"
            >
              Reset changes
            </button>
          </div>
        </fieldset>
      </form>

      <div className="mt-4 space-y-3 rounded-lg bg-app-surface p-3">
        <RestDisplay set={set} now={now} />
        {restLocked && (
          <p className="text-xs text-text-muted">
            Rest plan and completion are locked after rest starts.
            Reps and weight can still be corrected and saved.
          </p>
        )}
        {dirty && set.restEndedAt === null && (
          <p className="text-xs text-text-muted">
            Save or reset your edits before using the rest controls.
          </p>
        )}
        {set.restStartedAt === null ? (
          <>
            <button
              type="button"
              disabled={busy || confirmingRemoval || dirty || !set.completed ||
                set.reps === null || set.plannedRestSeconds === null}
              onClick={() => void actOnRest("START_REST")}
              className="rounded-lg border border-app-border px-3 py-2 text-sm text-accent-cyan disabled:opacity-50"
            >
              {restAction === "START_REST" ? "Starting..." : "Start rest"}
            </button>
            {(!set.completed || set.plannedRestSeconds === null) && (
              <p className="text-xs text-text-muted">
                Save a completed set with reps and a rest plan to start rest.
              </p>
            )}
          </>
        ) : set.restEndedAt === null && !expired ? (
          <button
            type="button"
            disabled={busy || confirmingRemoval || dirty}
            onClick={() => void actOnRest("END_REST")}
            className="rounded-lg bg-accent-cyan px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            {restAction === "END_REST" ? "Ending..." : "End rest"}
          </button>
        ) : (
          <p className="text-xs text-text-muted">
            {expired ? "Expired intervals cannot be ended or restarted." :
              "Rest finished. This interval cannot be restarted."}
          </p>
        )}
      </div>

      <button
        ref={removeButtonRef}
        type="button"
        disabled={busy}
        aria-expanded={confirmingRemoval}
        aria-controls={`${prefix}-remove-confirmation`}
        onClick={() => {
          setConfirmingRemoval(true);
          setError(null);
          setMessage("");
        }}
        className="mt-3 text-sm font-medium text-red-400 hover:underline disabled:opacity-50"
      >
        Remove set
      </button>

      <div
        id={`${prefix}-remove-confirmation`}
        hidden={!confirmingRemoval}
      >
        {confirmingRemoval && (
          <div
            role="group"
            aria-label={`Confirm removal of set ${set.setNumber}`}
            className="mt-3 rounded-lg border border-red-400/30 p-3"
          >
            <p className="text-sm text-text-muted">
              Permanently remove set {set.setNumber}, including its saved
              reps, weight, and rest information? Unsaved edits in this
              row will also be discarded. Other sets will remain.
            </p>

            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setConfirmingRemoval(false);
                  setError(null);
                  removeButtonRef.current?.focus();
                }}
                className="rounded-lg border border-app-border px-3 py-2 text-sm disabled:opacity-50"
              >
                Keep set
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => void remove()}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {removing ? "Removing..." : "Confirm removal"}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <p role="status" className="mt-2 text-xs text-text-muted">
        {removing ? "Removing set..." : message}
      </p>
    </div>
  );
}

export default function WorkoutSets({
  workoutId,
  attachmentId,
  exerciseName,
  sets,
  disabled,
  tryStartOperation,
  finishOperation,
  onSetsChanged,
  onDirtyChange,
}: Props) {
  const prefix = useId();
  const submitting = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [count, setCount] = useState("3");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function addSets(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disabled || submitting.current) return;

    setError(null);
    setMessage("");

    const result = createWorkoutSetsSchema.safeParse({
      count: Number(count),
    });

    if (!result.success) {
      setError("Choose a whole number from 1 to 20.");
      return;
    }

    if (!tryStartOperation()) return;

    submitting.current = true;
    setCreating(true);

    try {
      const response = await fetch(
        `/api/workouts/${encodeURIComponent(workoutId)}/exercises/${encodeURIComponent(attachmentId)}/sets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result.data),
        },
      );

      if (!response.ok) {
        throw new Error(await responseError(response));
      }

      const body: { sets: WorkoutSetRecord[] } = await response.json();

      const merged = new Map(sets.map((set) => [set.id, set]));

      for (const set of body.sets) {
        merged.set(set.id, set);
      }

      onSetsChanged(
        [...merged.values()].sort(
          (first, second) => first.setNumber - second.setNumber,
        ),
      );

      setMessage(`${body.sets.length} blank sets added.`);
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to add sets. Refresh before retrying.",
      );
    } finally {
      submitting.current = false;
      setCreating(false);
      finishOperation();
    }
  }

  function handleRemoved(setId: string) {
    const removed = sets.find((set) => set.id === setId);

    onSetsChanged(sets.filter((set) => set.id !== setId));
    setError(null);
    setMessage(
      removed ? `Set ${removed.setNumber} removed.` : "Set removed.",
    );

    headingRef.current?.focus();
  }

  return (
    <section
      aria-labelledby={`${prefix}-heading`}
      className="mt-4 space-y-3"
    >
      <h5
        ref={headingRef}
        id={`${prefix}-heading`}
        tabIndex={-1}
        className="text-sm font-semibold"
      >
        Sets for {exerciseName}
      </h5>

      <p className="text-xs leading-5 text-text-muted">
        Blank weight means unrecorded; 0 means zero external load.
        For barbells use total loaded bar weight; for dumbbells use
        weight per dumbbell. Rest is the planned countdown; saving
        does not start a timer. Save each row before leaving.
      </p>

      {sets.length === 0 && (
        <p className="text-sm text-text-muted">
          No sets yet. Add blank rows below.
        </p>
      )}

      {sets.map((set) => (
        <SetRow
          key={set.id}
          workoutId={workoutId}
          attachmentId={attachmentId}
          set={set}
          disabled={disabled}
          tryStartOperation={tryStartOperation}
          finishOperation={finishOperation}
          onSaved={(saved) =>
            onSetsChanged(
              sets.map((item) => item.id === saved.id ? saved : item),
            )
          }
          onRemoved={handleRemoved}
          onDirtyChange={onDirtyChange}
        />
      ))}

      <form
        onSubmit={addSets}
        className="flex flex-wrap items-end gap-3"
      >
        <label
          htmlFor={`${prefix}-count`}
          className="text-xs text-text-muted"
        >
          Blank sets to add
          <input
            id={`${prefix}-count`}
            type="number"
            required
            min="1"
            max="20"
            step="1"
            value={count}
            onChange={(event) => setCount(event.target.value)}
            disabled={disabled || creating}
            className={`${inputClass} max-w-28`}
          />
        </label>

        <button
          type="submit"
          disabled={disabled || creating}
          className="rounded-lg border border-app-border px-3 py-2 text-sm text-accent-cyan disabled:opacity-50"
        >
          {creating ? "Adding..." : "Add blank sets"}
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <p role="status" className="text-xs text-text-muted">
        {message}
      </p>
    </section>
  );
}