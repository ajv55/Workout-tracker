import type { DailyEnergyResult } from "./daily-energy";

export type FitnessGoal =
  | "LOSE_WEIGHT"
  | "MAINTAIN_WEIGHT"
  | "GAIN_WEIGHT";

export type TargetEligibility =
  | "GENERAL_ADULT"
  | "SPECIALIST_GUIDANCE"
  | "UNSURE";

type CalorieTargetInput = {
  dailyEnergy: DailyEnergyResult;
  goal: FitnessGoal | null;
  eligibility: TargetEligibility | null;
};

export type CalorieTargetResult =
  | {
      status: "available";
      kcalPerDay: number;
      maintenanceKcalPerDay: number;
      adjustmentKcalPerDay: number;
      goal: FitnessGoal;
      method: "goal-adjustment-v1";
    }
  | {
      status: "unavailable";
      reason:
        | "missing-eligibility"
        | "specialist-guidance"
        | "eligibility-uncertain"
        | "invalid-eligibility"
        | "missing-goal"
        | "invalid-goal"
        | "daily-energy-unavailable"
        | "invalid-daily-energy"
        | "below-application-threshold";
    };

export const CALORIE_TARGET_POLICY = {
  lossFraction: 0.1,
  maximumLossAdjustment: 500,
  gainAdjustment: 300,
  minimumAutomatedTarget: 1500,
} as const;

export function estimateCalorieTarget(
  input: CalorieTargetInput,
): CalorieTargetResult {
  if (input.eligibility == null) {
    return {
      status: "unavailable",
      reason: "missing-eligibility",
    };
  }

  if (input.eligibility === "SPECIALIST_GUIDANCE") {
    return {
      status: "unavailable",
      reason: "specialist-guidance",
    };
  }

  if (input.eligibility === "UNSURE") {
    return {
      status: "unavailable",
      reason: "eligibility-uncertain",
    };
  }

  if (input.eligibility !== "GENERAL_ADULT") {
    return {
      status: "unavailable",
      reason: "invalid-eligibility",
    };
  }

  if (input.goal == null) {
    return {
      status: "unavailable",
      reason: "missing-goal",
    };
  }

  if (
    input.goal !== "LOSE_WEIGHT" &&
    input.goal !== "MAINTAIN_WEIGHT" &&
    input.goal !== "GAIN_WEIGHT"
  ) {
    return {
      status: "unavailable",
      reason: "invalid-goal",
    };
  }

  if (input.dailyEnergy.status === "unavailable") {
    return {
      status: "unavailable",
      reason: "daily-energy-unavailable",
    };
  }

  const maintenance = input.dailyEnergy.kcalPerDay;

  if (!Number.isFinite(maintenance) || maintenance <= 0) {
    return {
      status: "unavailable",
      reason: "invalid-daily-energy",
    };
  }

  let adjustment = 0;

  if (input.goal === "LOSE_WEIGHT") {
    adjustment = -Math.min(
      maintenance * CALORIE_TARGET_POLICY.lossFraction,
      CALORIE_TARGET_POLICY.maximumLossAdjustment,
    );
  } else if (input.goal === "GAIN_WEIGHT") {
    adjustment = CALORIE_TARGET_POLICY.gainAdjustment;
  }

  const target = maintenance + adjustment;

  if (!Number.isFinite(target)) {
    return {
      status: "unavailable",
      reason: "invalid-daily-energy",
    };
  }

  if (target < CALORIE_TARGET_POLICY.minimumAutomatedTarget) {
    return {
      status: "unavailable",
      reason: "below-application-threshold",
    };
  }

  return {
    status: "available",
    kcalPerDay: target,
    maintenanceKcalPerDay: maintenance,
    adjustmentKcalPerDay: adjustment,
    goal: input.goal,
    method: "goal-adjustment-v1",
  };
}