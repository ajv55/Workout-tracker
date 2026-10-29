import assert from "node:assert/strict";
import test from "node:test";
import type { DailyEnergyResult } from "./daily-energy";
import {
  estimateCalorieTarget,
  type FitnessGoal,
  type TargetEligibility,
} from "./calorie-target";

function dailyEnergy(kcalPerDay: number): DailyEnergyResult {
  return {
    status: "available",
    kcalPerDay,
    restingKcalPerDay: kcalPerDay / 1.55,
    activityLevel: "MODERATELY_ACTIVE",
    activityMultiplier: 1.55,
    method: "mifflin-st-jeor-activity-factor-v1",
  };
}

const validInput = {
  dailyEnergy: dailyEnergy(2500),
  goal: "MAINTAIN_WEIGHT" as FitnessGoal,
  eligibility: "GENERAL_ADULT" as TargetEligibility,
};

const goalCases = [
  {
    goal: "MAINTAIN_WEIGHT",
    target: 2500,
    adjustment: 0,
  },
  {
    goal: "LOSE_WEIGHT",
    target: 2250,
    adjustment: -250,
  },
  {
    goal: "GAIN_WEIGHT",
    target: 2800,
    adjustment: 300,
  },
] as const;

for (const example of goalCases) {
  test(`calculates target for ${example.goal}`, () => {
    assert.deepEqual(
      estimateCalorieTarget({
        ...validInput,
        goal: example.goal,
      }),
      {
        status: "available",
        kcalPerDay: example.target,
        maintenanceKcalPerDay: 2500,
        adjustmentKcalPerDay: example.adjustment,
        goal: example.goal,
        method: "goal-adjustment-v1",
      },
    );
  });
}

test("caps the loss adjustment at 500 calories", () => {
  assert.deepEqual(
    estimateCalorieTarget({
      ...validInput,
      dailyEnergy: dailyEnergy(6000),
      goal: "LOSE_WEIGHT",
    }),
    {
      status: "available",
      kcalPerDay: 5500,
      maintenanceKcalPerDay: 6000,
      adjustmentKcalPerDay: -500,
      goal: "LOSE_WEIGHT",
      method: "goal-adjustment-v1",
    },
  );
});

test("handles the exact reduction-cap boundary", () => {
  const result = estimateCalorieTarget({
    ...validInput,
    dailyEnergy: dailyEnergy(5000),
    goal: "LOSE_WEIGHT",
  });

  assert.equal(result.status, "available");

  if (result.status === "available") {
    assert.equal(result.adjustmentKcalPerDay, -500);
    assert.equal(result.kcalPerDay, 4500);
  }
});

test("preserves fractional precision", () => {
  const result = estimateCalorieTarget({
    ...validInput,
    dailyEnergy: dailyEnergy(2500.5),
    goal: "LOSE_WEIGHT",
  });

  assert.equal(result.status, "available");

  if (result.status === "available") {
    assert.ok(Math.abs(result.kcalPerDay - 2250.45) < 1e-9);
    assert.ok(Math.abs(result.adjustmentKcalPerDay + 250.05) < 1e-9);
  }
});

test("requires an explicit eligibility selection", () => {
  assert.deepEqual(
    estimateCalorieTarget({
      ...validInput,
      eligibility: null,
    }),
    {
      status: "unavailable",
      reason: "missing-eligibility",
    },
  );
});

test("withholds targets when specialist guidance is needed", () => {
  assert.deepEqual(
    estimateCalorieTarget({
      ...validInput,
      eligibility: "SPECIALIST_GUIDANCE",
    }),
    {
      status: "unavailable",
      reason: "specialist-guidance",
    },
  );
});

test("withholds targets when eligibility is uncertain", () => {
  assert.deepEqual(
    estimateCalorieTarget({
      ...validInput,
      eligibility: "UNSURE",
    }),
    {
      status: "unavailable",
      reason: "eligibility-uncertain",
    },
  );
});

test("rejects an unexpected runtime eligibility value", () => {
  assert.deepEqual(
    estimateCalorieTarget({
      ...validInput,
      eligibility: "UNKNOWN" as TargetEligibility,
    }),
    {
      status: "unavailable",
      reason: "invalid-eligibility",
    },
  );
});

test("requires a goal", () => {
  assert.deepEqual(
    estimateCalorieTarget({
      ...validInput,
      goal: null,
    }),
    {
      status: "unavailable",
      reason: "missing-goal",
    },
  );
});

test("rejects an unexpected runtime goal value", () => {
  assert.deepEqual(
    estimateCalorieTarget({
      ...validInput,
      goal: "UNKNOWN" as FitnessGoal,
    }),
    {
      status: "unavailable",
      reason: "invalid-goal",
    },
  );
});

test("withholds a target when daily energy is unavailable", () => {
  assert.deepEqual(
    estimateCalorieTarget({
      ...validInput,
      dailyEnergy: {
        status: "unavailable",
        reason: "missing-activity-level",
      },
    }),
    {
      status: "unavailable",
      reason: "daily-energy-unavailable",
    },
  );
});

for (const value of [0, -100, NaN, Infinity, -Infinity]) {
  test(`rejects invalid daily energy ${String(value)}`, () => {
    assert.deepEqual(
      estimateCalorieTarget({
        ...validInput,
        dailyEnergy: dailyEnergy(value),
      }),
      {
        status: "unavailable",
        reason: "invalid-daily-energy",
      },
    );
  });
}

test("accepts a target exactly at the application cutoff", () => {
  const result = estimateCalorieTarget({
    ...validInput,
    dailyEnergy: dailyEnergy(1500),
  });

  assert.equal(result.status, "available");

  if (result.status === "available") {
    assert.equal(result.kcalPerDay, 1500);
  }
});

test("withholds a target below the cutoff before display rounding", () => {
  assert.deepEqual(
    estimateCalorieTarget({
      ...validInput,
      dailyEnergy: dailyEnergy(1499.99),
    }),
    {
      status: "unavailable",
      reason: "below-application-threshold",
    },
  );
});

test("checks the adjusted loss target against the cutoff", () => {
  assert.deepEqual(
    estimateCalorieTarget({
      ...validInput,
      dailyEnergy: dailyEnergy(1600),
      goal: "LOSE_WEIGHT",
    }),
    {
      status: "unavailable",
      reason: "below-application-threshold",
    },
  );
});

test("checks the adjusted gain target against the cutoff", () => {
  assert.deepEqual(
    estimateCalorieTarget({
      ...validInput,
      dailyEnergy: dailyEnergy(1100),
      goal: "GAIN_WEIGHT",
    }),
    {
      status: "unavailable",
      reason: "below-application-threshold",
    },
  );
});