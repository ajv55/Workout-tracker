import assert from "node:assert/strict";
import test from "node:test";
import {
  estimateDailyEnergy,
  type ActivityLevel,
} from "./daily-energy";

const validInput = {
  age: 30,
  weightKg: 80,
  heightCm: 180,
  metabolicSex: "MALE" as const,
  activityLevel: "MODERATELY_ACTIVE" as ActivityLevel,
};

const activityCases = [
  {
    activityLevel: "SEDENTARY",
    multiplier: 1.2,
    expectedCalories: 2136,
  },
  {
    activityLevel: "LIGHTLY_ACTIVE",
    multiplier: 1.375,
    expectedCalories: 2447.5,
  },
  {
    activityLevel: "MODERATELY_ACTIVE",
    multiplier: 1.55,
    expectedCalories: 2759,
  },
  {
    activityLevel: "VERY_ACTIVE",
    multiplier: 1.725,
    expectedCalories: 3070.5,
  },
  {
    activityLevel: "EXTRA_ACTIVE",
    multiplier: 1.9,
    expectedCalories: 3382,
  },
] as const;

for (const activity of activityCases) {
  test(`calculates daily energy for ${activity.activityLevel}`, () => {
    const result = estimateDailyEnergy({
      ...validInput,
      activityLevel: activity.activityLevel,
    });

    assert.equal(result.status, "available");

    if (result.status === "available") {
      assert.ok(
        Math.abs(result.kcalPerDay - activity.expectedCalories) < 1e-9,
      );
      assert.equal(result.restingKcalPerDay, 1780);
      assert.equal(result.activityLevel, activity.activityLevel);
      assert.equal(result.activityMultiplier, activity.multiplier);
      assert.equal(
        result.method,
        "mifflin-st-jeor-activity-factor-v1",
      );
    }
  });
}

test("requires an explicit activity selection", () => {
  assert.deepEqual(
    estimateDailyEnergy({
      ...validInput,
      activityLevel: null,
    }),
    {
      status: "unavailable",
      reason: "missing-activity-level",
    },
  );
});

test("rejects an unexpected runtime activity value", () => {
  assert.deepEqual(
    estimateDailyEnergy({
      ...validInput,
      // Deliberately bypass the type to test runtime protection.
      activityLevel: "UNKNOWN" as ActivityLevel,
    }),
    {
      status: "unavailable",
      reason: "invalid-activity-level",
    },
  );
});

test("rejects inherited object property names as activity levels", () => {
  assert.deepEqual(
    estimateDailyEnergy({
      ...validInput,
      activityLevel: "toString" as ActivityLevel,
    }),
    {
      status: "unavailable",
      reason: "invalid-activity-level",
    },
  );
});

test("reports missing resting-energy inputs", () => {
  assert.deepEqual(
    estimateDailyEnergy({
      ...validInput,
      weightKg: null,
    }),
    {
      status: "unavailable",
      reason: "resting-energy-unavailable",
      restingEnergy: {
        status: "unavailable",
        reason: "missing-inputs",
        missingFields: ["weightKg"],
      },
    },
  );
});

test("reports invalid resting-energy inputs", () => {
  assert.deepEqual(
    estimateDailyEnergy({
      ...validInput,
      weightKg: -80,
    }),
    {
      status: "unavailable",
      reason: "resting-energy-unavailable",
      restingEnergy: {
        status: "unavailable",
        reason: "invalid-inputs",
        invalidFields: ["weightKg"],
      },
    },
  );
});

test("preserves the unsupported-age explanation", () => {
  assert.deepEqual(
    estimateDailyEnergy({
      ...validInput,
      age: 79,
    }),
    {
      status: "unavailable",
      reason: "resting-energy-unavailable",
      restingEnergy: {
        status: "unavailable",
        reason: "unsupported-age",
      },
    },
  );
});

test("preserves the unsupported-measurement explanation", () => {
  assert.deepEqual(
    estimateDailyEnergy({
      ...validInput,
      heightCm: 90,
    }),
    {
      status: "unavailable",
      reason: "resting-energy-unavailable",
      restingEnergy: {
        status: "unavailable",
        reason: "unsupported-measurements",
        unsupportedFields: ["heightCm"],
      },
    },
  );
});

test("uses the female resting-energy result", () => {
  const result = estimateDailyEnergy({
    ...validInput,
    metabolicSex: "FEMALE",
  });

  assert.equal(result.status, "available");

  if (result.status === "available") {
    assert.equal(result.restingKcalPerDay, 1614);
    assert.ok(Math.abs(result.kcalPerDay - 2501.7) < 1e-9);
  }
});

test("keeps fractional precision until presentation", () => {
  const result = estimateDailyEnergy({
    ...validInput,
    heightCm: 180.5,
  });

  assert.equal(result.status, "available");

  if (result.status === "available") {
    assert.equal(result.restingKcalPerDay, 1783.125);
    assert.ok(Math.abs(result.kcalPerDay - 2763.84375) < 1e-9);
  }
});