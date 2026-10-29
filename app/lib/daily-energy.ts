import {
  estimateRestingEnergy,
  type RestingEnergyInput,
  type RestingEnergyResult,
} from "./energy";

export const ACTIVITY_MULTIPLIERS = {
  SEDENTARY: 1.2,
  LIGHTLY_ACTIVE: 1.375,
  MODERATELY_ACTIVE: 1.55,
  VERY_ACTIVE: 1.725,
  EXTRA_ACTIVE: 1.9,
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_MULTIPLIERS;

type DailyEnergyInput = RestingEnergyInput & {
  activityLevel: ActivityLevel | null;
};

type UnavailableRestingEnergy = Extract<
  RestingEnergyResult,
  { status: "unavailable" }
>;

export type DailyEnergyResult =
  | {
      status: "available";
      kcalPerDay: number;
      restingKcalPerDay: number;
      activityLevel: ActivityLevel;
      activityMultiplier: number;
      method: "mifflin-st-jeor-activity-factor-v1";
    }
  | {
      status: "unavailable";
      reason: "resting-energy-unavailable";
      restingEnergy: UnavailableRestingEnergy;
    }
  | {
      status: "unavailable";
      reason: "missing-activity-level" | "invalid-activity-level";
    };

export function estimateDailyEnergy(
  input: DailyEnergyInput,
): DailyEnergyResult {
  const restingEnergy = estimateRestingEnergy(input);

  if (restingEnergy.status === "unavailable") {
    return {
      status: "unavailable",
      reason: "resting-energy-unavailable",
      restingEnergy,
    };
  }

  if (input.activityLevel == null) {
    return {
      status: "unavailable",
      reason: "missing-activity-level",
    };
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      ACTIVITY_MULTIPLIERS,
      input.activityLevel,
    )
  ) {
    return {
      status: "unavailable",
      reason: "invalid-activity-level",
    };
  }

  const activityMultiplier =
    ACTIVITY_MULTIPLIERS[input.activityLevel];

  return {
    status: "available",
    kcalPerDay: restingEnergy.kcalPerDay * activityMultiplier,
    restingKcalPerDay: restingEnergy.kcalPerDay,
    activityLevel: input.activityLevel,
    activityMultiplier,
    method: "mifflin-st-jeor-activity-factor-v1",
  };
}