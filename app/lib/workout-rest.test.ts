import assert from "node:assert/strict";
import test from "node:test";
import {
  getRestExpirationMs,
  transitionWorkoutRest,
  type RestAction,
  type RestSetState,
} from "./workout-rest";

const startTime = new Date("2026-01-01T12:00:00.000Z");
const endTime = new Date("2026-01-01T12:02:45.000Z");
const laterTime = new Date("2026-01-01T12:03:00.000Z");

function readySet(
  overrides: Partial<RestSetState> = {},
): RestSetState {
  return {
    completed: true,
    reps: 10,
    plannedRestSeconds: 90,
    restStartedAt: null,
    restEndedAt: null,
    ...overrides,
  };
}

test("starts rest for a completed set with planned rest", () => {
  assert.deepEqual(
    transitionWorkoutRest(readySet(), "START_REST", startTime),
    {
      status: "allowed",
      changed: true,
      restStartedAt: startTime,
      restEndedAt: null,
    },
  );
});

test("rejects starting rest for an incomplete set", () => {
  assert.deepEqual(
    transitionWorkoutRest(
      readySet({ completed: false }),
      "START_REST",
      startTime,
    ),
    {
      status: "rejected",
      reason: "set-not-completed",
    },
  );
});

for (const reps of [null, 0, -1, 1.5, NaN, Infinity]) {
  test(`rejects starting rest with invalid reps ${String(reps)}`, () => {
    assert.deepEqual(
      transitionWorkoutRest(
        readySet({ reps }),
        "START_REST",
        startTime,
      ),
      {
        status: "rejected",
        reason: "set-not-completed",
      },
    );
  });
}

for (const plannedRestSeconds of [
  null,
  0,
  -1,
  1.5,
  3601,
  NaN,
  Infinity,
]) {
  test(
    `rejects starting rest with invalid duration ${String(plannedRestSeconds)}`,
    () => {
      assert.deepEqual(
        transitionWorkoutRest(
          readySet({ plannedRestSeconds }),
          "START_REST",
          startTime,
        ),
        {
          status: "rejected",
          reason: "missing-planned-rest",
        },
      );
    },
  );
}

for (const plannedRestSeconds of [1, 90, 165, 180, 3600]) {
  test(`accepts a ${plannedRestSeconds}-second plan`, () => {
    const result = transitionWorkoutRest(
      readySet({ plannedRestSeconds }),
      "START_REST",
      startTime,
    );

    assert.equal(result.status, "allowed");
  });
}

test("a repeated start preserves the original timestamp", () => {
  assert.deepEqual(
    transitionWorkoutRest(
      readySet({ restStartedAt: startTime }),
      "START_REST",
      laterTime,
    ),
    {
      status: "allowed",
      changed: false,
      restStartedAt: startTime,
      restEndedAt: null,
    },
  );
});

test("ends an active rest interval", () => {
  assert.deepEqual(
    transitionWorkoutRest(
      readySet({ restStartedAt: startTime }),
      "END_REST",
      endTime,
    ),
    {
      status: "allowed",
      changed: true,
      restStartedAt: startTime,
      restEndedAt: endTime,
    },
  );
});

test("actual rest may exceed the planned countdown", () => {
  const result = transitionWorkoutRest(
    readySet({
      plannedRestSeconds: 90,
      restStartedAt: startTime,
    }),
    "END_REST",
    endTime,
  );

  assert.equal(result.status, "allowed");

  if (result.status === "allowed") {
    assert.ok(result.restEndedAt);

    const elapsedSeconds =
      (result.restEndedAt.getTime() -
        result.restStartedAt.getTime()) /
      1000;

    assert.equal(elapsedSeconds, 165);
  }
});

test("allows ending rest before the planned duration", () => {
  const earlyEnd = new Date("2026-01-01T12:00:30.000Z");

  const result = transitionWorkoutRest(
    readySet({ restStartedAt: startTime }),
    "END_REST",
    earlyEnd,
  );

  assert.equal(result.status, "allowed");

  if (result.status === "allowed") {
    assert.equal(result.restEndedAt?.getTime(), earlyEnd.getTime());
  }
});

test("a repeated end preserves the original timestamp", () => {
  assert.deepEqual(
    transitionWorkoutRest(
      readySet({
        restStartedAt: startTime,
        restEndedAt: endTime,
      }),
      "END_REST",
      laterTime,
    ),
    {
      status: "allowed",
      changed: false,
      restStartedAt: startTime,
      restEndedAt: endTime,
    },
  );
});

test("rejects ending rest before it starts", () => {
  assert.deepEqual(
    transitionWorkoutRest(readySet(), "END_REST", endTime),
    {
      status: "rejected",
      reason: "rest-not-started",
    },
  );
});

test("rejects restarting an ended interval", () => {
  assert.deepEqual(
    transitionWorkoutRest(
      readySet({
        restStartedAt: startTime,
        restEndedAt: endTime,
      }),
      "START_REST",
      laterTime,
    ),
    {
      status: "rejected",
      reason: "rest-already-ended",
    },
  );
});

test("rejects an end time earlier than the start", () => {
  assert.deepEqual(
    transitionWorkoutRest(
      readySet({ restStartedAt: endTime }),
      "END_REST",
      startTime,
    ),
    {
      status: "rejected",
      reason: "invalid-time",
    },
  );
});

test("rejects an invalid current timestamp", () => {
  assert.deepEqual(
    transitionWorkoutRest(
      readySet(),
      "START_REST",
      new Date("invalid"),
    ),
    {
      status: "rejected",
      reason: "invalid-time",
    },
  );
});

test("rejects an end timestamp without a start", () => {
  assert.deepEqual(
    transitionWorkoutRest(
      readySet({ restEndedAt: endTime }),
      "END_REST",
      laterTime,
    ),
    {
      status: "rejected",
      reason: "invalid-rest-state",
    },
  );
});

test("rejects a saved end earlier than the saved start", () => {
  assert.deepEqual(
    transitionWorkoutRest(
      readySet({
        restStartedAt: endTime,
        restEndedAt: startTime,
      }),
      "END_REST",
      laterTime,
    ),
    {
      status: "rejected",
      reason: "invalid-rest-state",
    },
  );
});

test("rejects an invalid saved start timestamp", () => {
  assert.deepEqual(
    transitionWorkoutRest(
      readySet({ restStartedAt: new Date("invalid") }),
      "START_REST",
      startTime,
    ),
    {
      status: "rejected",
      reason: "invalid-rest-state",
    },
  );
});

test("rejects an invalid saved end timestamp", () => {
  assert.deepEqual(
    transitionWorkoutRest(
      readySet({
        restStartedAt: startTime,
        restEndedAt: new Date("invalid"),
      }),
      "END_REST",
      laterTime,
    ),
    {
      status: "rejected",
      reason: "invalid-rest-state",
    },
  );
});

test("rejects an unexpected runtime action", () => {
  assert.deepEqual(
    transitionWorkoutRest(
      readySet(),
      "RESET_REST" as RestAction,
      startTime,
    ),
    {
      status: "rejected",
      reason: "invalid-action",
    },
  );
});

test("does not mutate the supplied set", () => {
  const set = readySet();

  transitionWorkoutRest(set, "START_REST", startTime);

  assert.equal(set.restStartedAt, null);
  assert.equal(set.restEndedAt, null);
  assert.equal(set.completed, true);
  assert.equal(set.plannedRestSeconds, 90);
});

const expiryMs = startTime.getTime() + (90 + 900) * 1000;

for (const action of ["START_REST", "END_REST"] as const) {
  test(`${action} is allowed one millisecond before expiration`, () => {
    assert.equal(transitionWorkoutRest(
      readySet({ restStartedAt: startTime }), action,
      new Date(expiryMs - 1),
    ).status, "allowed");
  });
  for (const offset of [0, 1, 86400000]) {
    test(`${action} rejects expired rest at cutoff + ${offset}ms`, () => {
      const set = readySet({ restStartedAt: startTime });
      assert.deepEqual(transitionWorkoutRest(set, action,
        new Date(expiryMs + offset)),
        { status: "rejected", reason: "rest-expired" });
      assert.equal(set.restEndedAt, null);
      assert.equal(set.restStartedAt, startTime);
    });
  }
}

test("expiration is based on planned rest plus fifteen minutes", () => {
  for (const plan of [1, 90, 180, 3600]) {
    assert.equal(getRestExpirationMs(startTime.getTime(), plan),
      startTime.getTime() + (plan + 900) * 1000);
  }
});

test("a sixty-minute plan does not expire at fifteen minutes", () => {
  assert.equal(transitionWorkoutRest(readySet({
    restStartedAt: startTime, plannedRestSeconds: 3600,
  }), "END_REST", new Date(startTime.getTime() + 900000)).status, "allowed");
});

test("a finished interval stays finished on a much later retry", () => {
  const result = transitionWorkoutRest(readySet({
    restStartedAt: startTime, restEndedAt: endTime,
  }), "END_REST", new Date(expiryMs + 86400000));
  assert.deepEqual(result, { status: "allowed", changed: false,
    restStartedAt: startTime, restEndedAt: endTime });
});

for (const plan of [null, 0, -1, 1.5, 3601, NaN, Infinity]) {
  test(`expiration rejects invalid plan ${String(plan)}`, () => {
    assert.equal(getRestExpirationMs(startTime.getTime(), plan), null);
    assert.deepEqual(transitionWorkoutRest(readySet({
      restStartedAt: startTime, plannedRestSeconds: plan,
    }), "END_REST", endTime),
      { status: "rejected", reason: "invalid-rest-state" });
  });
}

test("expiration rejects invalid start time", () => {
  assert.equal(getRestExpirationMs(NaN, 90), null);
  assert.equal(getRestExpirationMs(Infinity, 90), null);
});

test("a repeated start rejects a clock earlier than the saved start", () => {
  assert.deepEqual(transitionWorkoutRest(readySet({
    restStartedAt: endTime,
  }), "START_REST", startTime),
    { status: "rejected", reason: "invalid-time" });
});
