import assert from "node:assert/strict";
import test from "node:test";
import { createWorkoutSchema } from "./workout";

test("converts a selected calendar day to UTC midnight", () => {
  const result = createWorkoutSchema.safeParse({
    title: "Date validation test",
    date: "2024-06-15",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(
      result.data.date?.toISOString(),
      "2024-06-15T00:00:00.000Z",
    );
  }
});

test("accepts a valid leap day", () => {
  const result = createWorkoutSchema.safeParse({
    title: "Leap day",
    date: "2024-02-29",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(
      result.data.date?.toISOString(),
      "2024-02-29T00:00:00.000Z",
    );
  }
});

for (const date of [
  "2025-02-29",
  "2024-02-30",
  "2024-04-31",
  "2024-00-10",
  "2024-13-10",
  "2024-01-00",
]) {
  test(`rejects impossible calendar date ${date}`, () => {
    const result = createWorkoutSchema.safeParse({
      title: "Invalid calendar date",
      date,
    });

    assert.equal(result.success, false);

    if (!result.success) {
      assert.ok(
        result.error.issues.some((issue) => issue.path[0] === "date"),
      );
    }
  });
}

for (const date of [
  "",
  "06/15/2024",
  "2024-6-15",
  "2024-06-15T00:00:00.000Z",
  "not-a-date",
]) {
  test(`rejects unsupported date format ${JSON.stringify(date)}`, () => {
    const result = createWorkoutSchema.safeParse({
      title: "Invalid format",
      date,
    });

    assert.equal(result.success, false);
  });
}

test("accepts today in UTC", () => {
  const todayUtc = new Date().toISOString().slice(0, 10);

  const result = createWorkoutSchema.safeParse({
    title: "Today",
    date: todayUtc,
  });

  assert.equal(result.success, true);
});

test("rejects a future UTC calendar day", () => {
  const future = new Date();
  future.setUTCDate(future.getUTCDate() + 2);

  const result = createWorkoutSchema.safeParse({
    title: "Future workout",
    date: future.toISOString().slice(0, 10),
  });

  assert.equal(result.success, false);

  if (!result.success) {
    assert.ok(
      result.error.issues.some(
        (issue) =>
          issue.path[0] === "date" &&
          issue.message === "Training date cannot be after today in UTC",
      ),
    );
  }
});

test("allows date omission for existing API callers", () => {
  const result = createWorkoutSchema.safeParse({
    title: "No explicit date",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.date, undefined);
  }
});

test("rejects null rather than treating it as an omitted date", () => {
  const result = createWorkoutSchema.safeParse({
    title: "Null date",
    date: null,
  });

  assert.equal(result.success, false);
});

test("continues rejecting client-supplied ownership", () => {
  const result = createWorkoutSchema.safeParse({
    title: "Ownership test",
    date: "2024-06-15",
    userId: "000000000000000000000000",
  });

  assert.equal(result.success, false);
});