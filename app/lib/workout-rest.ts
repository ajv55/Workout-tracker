// Application policy: tracking expires 15 minutes after the planned rest.
export const REST_EXPIRATION_GRACE_SECONDS = 15 * 60;

export function getRestExpirationMs(
  startMs: number,
  plannedRestSeconds: number | null,
): number | null {
  if (!Number.isFinite(startMs) || plannedRestSeconds === null ||
      !Number.isInteger(plannedRestSeconds) || plannedRestSeconds < 1 ||
      plannedRestSeconds > 3600) return null;
  const expiration = startMs +
    (plannedRestSeconds + REST_EXPIRATION_GRACE_SECONDS) * 1000;
  return Number.isFinite(expiration) ? expiration : null;
}

export type RestAction = "START_REST" | "END_REST";

export type RestSetState = {
  completed: boolean;
  reps: number | null;
  plannedRestSeconds: number | null;
  restStartedAt: Date | null;
  restEndedAt: Date | null;
};

export type RestTransitionResult =
  | {
      status: "allowed";
      changed: boolean;
      restStartedAt: Date;
      restEndedAt: Date | null;
    }
  | {
      status: "rejected";
      reason:
        | "invalid-action"
        | "invalid-time"
        | "invalid-rest-state"
        | "set-not-completed"
        | "missing-planned-rest"
        | "rest-not-started"
        | "rest-already-ended"
        | "rest-expired";
    };

export function transitionWorkoutRest(
  set: RestSetState,
  action: RestAction,
  now: Date,
): RestTransitionResult {
  if (action !== "START_REST" && action !== "END_REST") {
    return { status: "rejected", reason: "invalid-action" };
  }

  if (!Number.isFinite(now.getTime())) {
    return { status: "rejected", reason: "invalid-time" };
  }

  const start = set.restStartedAt;
  const end = set.restEndedAt;

  if (
    (start !== null && !Number.isFinite(start.getTime())) ||
    (end !== null && !Number.isFinite(end.getTime())) ||
    (end !== null && start === null) ||
    (start !== null && end !== null && end < start)
  ) {
    return { status: "rejected", reason: "invalid-rest-state" };
  }

  // Derive expiration without inventing a measured end timestamp.
  // Completed intervals remain unchanged, including on later retries.
  if (start !== null && end === null) {
    if (now < start) {
      return { status: "rejected", reason: "invalid-time" };
    }
    const expiresAt = getRestExpirationMs(start.getTime(), set.plannedRestSeconds);
    if (expiresAt === null) {
      return { status: "rejected", reason: "invalid-rest-state" };
    }
    if (now.getTime() >= expiresAt) {
      return { status: "rejected", reason: "rest-expired" };
    }
  }

  if (action === "START_REST") {
    // Retrying must never overwrite an existing start timestamp.
    if (start !== null) {
      if (end !== null) {
        return { status: "rejected", reason: "rest-already-ended" };
      }

      return {
        status: "allowed",
        changed: false,
        restStartedAt: start,
        restEndedAt: null,
      };
    }

    if (
      !set.completed ||
      set.reps === null ||
      !Number.isInteger(set.reps) ||
      set.reps <= 0
    ) {
      return { status: "rejected", reason: "set-not-completed" };
    }

    if (
      set.plannedRestSeconds === null ||
      !Number.isInteger(set.plannedRestSeconds) ||
      set.plannedRestSeconds < 1 ||
      set.plannedRestSeconds > 3600
    ) {
      return { status: "rejected", reason: "missing-planned-rest" };
    }

    return {
      status: "allowed",
      changed: true,
      restStartedAt: now,
      restEndedAt: null,
    };
  }

  if (start === null) {
    return { status: "rejected", reason: "rest-not-started" };
  }

  // Retrying END_REST preserves the original recorded end.
  if (end !== null) {
    return {
      status: "allowed",
      changed: false,
      restStartedAt: start,
      restEndedAt: end,
    };
  }

  if (now < start) {
    return { status: "rejected", reason: "invalid-time" };
  }

  return {
    status: "allowed",
    changed: true,
    restStartedAt: start,
    restEndedAt: now,
  };
}