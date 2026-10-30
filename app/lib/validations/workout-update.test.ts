import assert from "node:assert/strict";
import test from "node:test";
import { updateWorkoutSchema } from "./workout";

test("updates title without adding omitted fields", () => {
  const result = updateWorkoutSchema.safeParse({
    title: "  Updated workout  ",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.deepEqual(result.data, {
      title: "Updated workout",
    });
  }
});

test("converts an edited training date to UTC midnight", () => {
  const result = updateWorkoutSchema.safeParse({
    date: "2024-06-15",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.deepEqual(result.data, {
      date: new Date("2024-06-15T00:00:00.000Z"),
    });
  }
});

test("allows clearing duration", () => {
  const result = updateWorkoutSchema.safeParse({
    durationMinutes: null,
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.deepEqual(result.data, { durationMinutes: null });
  }
});

test("allows clearing notes", () => {
  const result = updateWorkoutSchema.safeParse({
    notes: null,
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.deepEqual(result.data, { notes: null });
  }
});

test("accepts a complete edit", () => {
  const result = updateWorkoutSchema.safeParse({
    title: "  Upper body  ",
    date: "2024-06-15",
    durationMinutes: 45,
    notes: "  Felt strong today.  ",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.deepEqual(result.data, {
      title: "Upper body",
      date: new Date("2024-06-15T00:00:00.000Z"),
      durationMinutes: 45,
      notes: "Felt strong today.",
    });
  }
});

test("rejects an empty update", () => {
  assert.equal(updateWorkoutSchema.safeParse({}).success, false);
});

test("rejects an update containing only undefined", () => {
  assert.equal(
    updateWorkoutSchema.safeParse({ title: undefined }).success,
    false,
  );
});

for (const title of ["", "   ", null, "a".repeat(101)]) {
  test(`rejects invalid title ${JSON.stringify(title)}`, () => {
    assert.equal(
      updateWorkoutSchema.safeParse({ title }).success,
      false,
    );
  });
}

for (const date of [
  null,
  "",
  "2025-02-29",
  "2024-04-31",
  "2024-06-15T00:00:00.000Z",
]) {
  test(`rejects invalid edit date ${JSON.stringify(date)}`, () => {
    assert.equal(
      updateWorkoutSchema.safeParse({ date }).success,
      false,
    );
  });
}

test("rejects a future training date", () => {
  const future = new Date();
  future.setUTCDate(future.getUTCDate() + 2);

  assert.equal(
    updateWorkoutSchema.safeParse({
      date: future.toISOString().slice(0, 10),
    }).success,
    false,
  );
});

for (const durationMinutes of [0, -10, 1.5, "30", NaN, Infinity]) {
  test(`rejects invalid duration ${String(durationMinutes)}`, () => {
    assert.equal(
      updateWorkoutSchema.safeParse({ durationMinutes }).success,
      false,
    );
  });
}

test("rejects notes longer than 1000 characters", () => {
  assert.equal(
    updateWorkoutSchema.safeParse({
      notes: "a".repeat(1001),
    }).success,
    false,
  );
});

test("rejects ownership changes even alongside a valid edit", () => {
  assert.equal(
    updateWorkoutSchema.safeParse({
      title: "Valid title",
      userId: "000000000000000000000000",
    }).success,
    false,
  );
});

test("rejects workout ID changes", () => {
  assert.equal(
    updateWorkoutSchema.safeParse({
      id: "000000000000000000000000",
    }).success,
    false,
  );
});