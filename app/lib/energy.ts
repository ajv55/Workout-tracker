export type RestingEnergyInput = {
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  metabolicSex: "MALE" | "FEMALE" | null;
};

type RequiredField = keyof RestingEnergyInput;
type MeasurementField = "weightKg" | "heightCm";

export type RestingEnergyResult =
  | {
      status: "available";
      kcalPerDay: number;
    }
  | {
      status: "unavailable";
      reason: "missing-inputs";
      missingFields: RequiredField[];
    }
  | {
      status: "unavailable";
      reason: "invalid-inputs";
      invalidFields: RequiredField[];
    }
  | {
      status: "unavailable";
      reason: "unsupported-age";
    }
  | {
      status: "unavailable";
      reason: "unsupported-measurements";
      unsupportedFields: MeasurementField[];
    };

export const ENERGY_SUPPORT_LIMITS = {
  age: { min: 19, max: 78 },
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 30, max: 350 },
} as const;

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function estimateRestingEnergy(
  input: RestingEnergyInput,
): RestingEnergyResult {
  const missingFields: RequiredField[] = [];

  if (input.age == null) missingFields.push("age");
  if (input.weightKg == null) missingFields.push("weightKg");
  if (input.heightCm == null) missingFields.push("heightCm");
  if (input.metabolicSex == null) missingFields.push("metabolicSex");

  if (
    input.age == null ||
    input.weightKg == null ||
    input.heightCm == null ||
    input.metabolicSex == null
  ) {
    return {
      status: "unavailable",
      reason: "missing-inputs",
      missingFields,
    };
  }

  const invalidFields: RequiredField[] = [];

  if (!Number.isInteger(input.age) || input.age <= 0) {
    invalidFields.push("age");
  }

  if (!isPositiveFinite(input.weightKg)) {
    invalidFields.push("weightKg");
  }

  if (!isPositiveFinite(input.heightCm)) {
    invalidFields.push("heightCm");
  }

  if (
    input.metabolicSex !== "MALE" &&
    input.metabolicSex !== "FEMALE"
  ) {
    invalidFields.push("metabolicSex");
  }

  if (invalidFields.length > 0) {
    return {
      status: "unavailable",
      reason: "invalid-inputs",
      invalidFields,
    };
  }

  if (
    input.age < ENERGY_SUPPORT_LIMITS.age.min ||
    input.age > ENERGY_SUPPORT_LIMITS.age.max
  ) {
    return {
      status: "unavailable",
      reason: "unsupported-age",
    };
  }

  const unsupportedFields: MeasurementField[] = [];

  if (
    input.weightKg < ENERGY_SUPPORT_LIMITS.weightKg.min ||
    input.weightKg > ENERGY_SUPPORT_LIMITS.weightKg.max
  ) {
    unsupportedFields.push("weightKg");
  }

  if (
    input.heightCm < ENERGY_SUPPORT_LIMITS.heightCm.min ||
    input.heightCm > ENERGY_SUPPORT_LIMITS.heightCm.max
  ) {
    unsupportedFields.push("heightCm");
  }

  if (unsupportedFields.length > 0) {
    return {
      status: "unavailable",
      reason: "unsupported-measurements",
      unsupportedFields,
    };
  }

  const coefficient = input.metabolicSex === "MALE" ? 5 : -161;

  return {
    status: "available",
    kcalPerDay:
      10 * input.weightKg +
      6.25 * input.heightCm -
      5 * input.age +
      coefficient,
  };
}