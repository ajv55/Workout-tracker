import assert from "node:assert/strict";
import test from "node:test";
import {
  createWorkoutSetsSchema,
  updateWorkoutSetSchema,
  workoutSetStateSchema,
  workoutSetRestActionSchema,
} from "./workout-set";

const blankSet = {
  reps: null,
  weightKg: null,
  completed: false,
  plannedRestSeconds: null,
};

for (const count of [1, 3, 20]) {
  test(`accepts creation of ${count} blank sets`, () => {
    assert.deepEqual(createWorkoutSetsSchema.parse({ count }), {
      count,
    });
  });
}

for (const count of [0, -1, 21, 1.5, "3", null, NaN, Infinity]) {
  test(`rejects invalid set count ${String(count)}`, () => {
    assert.equal(
      createWorkoutSetsSchema.safeParse({ count }).success,
      false,
    );
  });
}

test("rejects client-supplied parent IDs and set numbers", () => {
  assert.equal(
    createWorkoutSetsSchema.safeParse({
      count: 3,
      workoutExerciseId: "000000000000000000000000",
      setNumber: 1,
    }).success,
    false,
  );
});

test("accepts a blank incomplete set", () => {
  assert.deepEqual(workoutSetStateSchema.parse(blankSet), blankSet);
});

test("accepts independently recorded reps and weight", () => {
  assert.deepEqual(
    workoutSetStateSchema.parse({
      ...blankSet,
      reps: 10,
      weightKg: 45.359237,
      completed: true,
      plannedRestSeconds: 90,
    }),
    {
      reps: 10,
      weightKg: 45.359237,
      completed: true,
      plannedRestSeconds: 90,
    },
  );
});

test("allows completing a set without recorded weight", () => {
  assert.equal(
    workoutSetStateSchema.safeParse({
      ...blankSet,
      reps: 10,
      completed: true,
    }).success,
    true,
  );
});

test("distinguishes zero external load from missing weight", () => {
  assert.equal(
    workoutSetStateSchema.parse({
      ...blankSet,
      weightKg: 0,
    }).weightKg,
    0,
  );

  assert.equal(
    workoutSetStateSchema.parse(blankSet).weightKg,
    null,
  );
});

test("rejects completion without reps", () => {
  const result = workoutSetStateSchema.safeParse({
    ...blankSet,
    completed: true,
  });

  assert.equal(result.success, false);

  if (!result.success) {
    assert.ok(
      result.error.issues.some((issue) => issue.path[0] === "reps"),
    );
  }
});

for (const reps of [0, -1, 2.5, "10", NaN, Infinity]) {
  test(`rejects invalid reps ${String(reps)}`, () => {
    assert.equal(
      updateWorkoutSetSchema.safeParse({ reps }).success,
      false,
    );
  });
}

for (const weightKg of [-1, "100", NaN, Infinity, -Infinity]) {
  test(`rejects invalid weight ${String(weightKg)}`, () => {
    assert.equal(
      updateWorkoutSetSchema.safeParse({ weightKg }).success,
      false,
    );
  });
}

for (const seconds of [1, 90, 165, 180, 3600]) {
  test(`accepts planned rest of ${seconds} seconds`, () => {
    assert.equal(
      updateWorkoutSetSchema.safeParse({
        plannedRestSeconds: seconds,
      }).success,
      true,
    );
  });
}

for (const seconds of [0, -1, 1.5, 3601, "90", NaN, Infinity]) {
  test(`rejects invalid planned rest ${String(seconds)}`, () => {
    assert.equal(
      updateWorkoutSetSchema.safeParse({
        plannedRestSeconds: seconds,
      }).success,
      false,
    );
  });
}

test("allows clearing recorded values", () => {
  const input = {
    reps: null,
    weightKg: null,
    plannedRestSeconds: null,
  };

  assert.deepEqual(updateWorkoutSetSchema.parse(input), input);
});

test("rejects an empty update", () => {
  assert.equal(updateWorkoutSetSchema.safeParse({}).success, false);
});

test("rejects an undefined-only update", () => {
  assert.equal(
    updateWorkoutSetSchema.safeParse({ reps: undefined }).success,
    false,
  );
});

test("requires completion to be a boolean", () => {
  assert.equal(
    updateWorkoutSetSchema.safeParse({ completed: "true" }).success,
    false,
  );
});

test("allows a partial completion update before merging saved state", () => {
  assert.deepEqual(
    updateWorkoutSetSchema.parse({ completed: true }),
    { completed: true },
  );
});

test("rejects clearing reps on a completed set after merging", () => {
  const existing = {
    ...blankSet,
    reps: 10,
    completed: true,
  };

  const patch = updateWorkoutSetSchema.parse({ reps: null });

  assert.equal(
    workoutSetStateSchema.safeParse({
      ...existing,
      ...patch,
    }).success,
    false,
  );
});

test("allows clearing reps when also marking the set incomplete", () => {
  const existing = {
    ...blankSet,
    reps: 10,
    completed: true,
  };

  const patch = updateWorkoutSetSchema.parse({
    reps: null,
    completed: false,
  });

  assert.equal(
    workoutSetStateSchema.safeParse({
      ...existing,
      ...patch,
    }).success,
    true,
  );
});

for (const action of ["START_REST", "END_REST"]) {
  test(`accepts rest action ${action}`, () => {
    assert.deepEqual(
      workoutSetRestActionSchema.parse({ action }),
      { action },
    );
  });
}

test("rejects an unknown rest action", () => {
  assert.equal(
    workoutSetRestActionSchema.safeParse({
      action: "RESET_EVERYTHING",
    }).success,
    false,
  );
});

test("rejects timestamps supplied with a rest action", () => {
  assert.equal(
    workoutSetRestActionSchema.safeParse({
      action: "START_REST",
      restStartedAt: "2024-01-01T00:00:00.000Z",
    }).success,
    false,
  );
});

for (const field of [
  "userId",
  "workoutExerciseId",
  "setNumber",
  "restStartedAt",
  "restEndedAt",
]) {
  test(`rejects editing server-controlled field ${field}`, () => {
    assert.equal(
      updateWorkoutSetSchema.safeParse({
        reps: 10,
        [field]: "forbidden",
      }).success,
      false,
    );
  });
}