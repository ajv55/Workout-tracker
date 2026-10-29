import assert from "node:assert/strict";
import test from "node:test";
import {
  estimateRestingEnergy,
  type RestingEnergyInput,
} from "./energy";

const validInput: RestingEnergyInput = {
  age: 30,
  weightKg: 80,
  heightCm: 180,
  metabolicSex: "MALE",
};

test("calculates the known male example", () => {
  assert.deepEqual(estimateRestingEnergy(validInput), {
    status: "available",
    kcalPerDay: 1780,
  });
});

test("uses the female coefficient", () => {
  assert.deepEqual(
    estimateRestingEnergy({ ...validInput, metabolicSex: "FEMALE" }),
    { status: "available", kcalPerDay: 1614 },
  );
});

for (const field of [
  "age",
  "weightKg",
  "heightCm",
  "metabolicSex",
] as const) {
  test(`reports missing ${field}`, () => {
    assert.deepEqual(
      estimateRestingEnergy({ ...validInput, [field]: null }),
      {
        status: "unavailable",
        reason: "missing-inputs",
        missingFields: [field],
      },
    );
  });
}

test("reports all missing inputs", () => {
  assert.deepEqual(
    estimateRestingEnergy({
      age: null,
      weightKg: null,
      heightCm: null,
      metabolicSex: null,
    }),
    {
      status: "unavailable",
      reason: "missing-inputs",
      missingFields: ["age", "weightKg", "heightCm", "metabolicSex"],
    },
  );
});

for (const field of ["weightKg", "heightCm"] as const) {
  for (const value of [-80, 0, NaN, Infinity, -Infinity]) {
    test(`rejects invalid ${field}=${String(value)}`, () => {
      assert.deepEqual(
        estimateRestingEnergy({ ...validInput, [field]: value }),
        {
          status: "unavailable",
          reason: "invalid-inputs",
          invalidFields: [field],
        },
      );
    });
  }
}

for (const age of [-1, 0, 30.5, NaN, Infinity, -Infinity]) {
  test(`rejects invalid age=${String(age)}`, () => {
    assert.deepEqual(
      estimateRestingEnergy({ ...validInput, age }),
      {
        status: "unavailable",
        reason: "invalid-inputs",
        invalidFields: ["age"],
      },
    );
  });
}

for (const age of [18, 79]) {
  test(`reports unsupported age=${age}`, () => {
    assert.deepEqual(
      estimateRestingEnergy({ ...validInput, age }),
      { status: "unavailable", reason: "unsupported-age" },
    );
  });
}

const unsupportedMeasurements = [
  { field: "weightKg", values: [0.5, 29.9, 350.1] },
  { field: "heightCm", values: [0.5, 99.9, 250.1] },
] as const;

for (const { field, values } of unsupportedMeasurements) {
  for (const value of values) {
    test(`reports unsupported ${field}=${value}`, () => {
      assert.deepEqual(
        estimateRestingEnergy({ ...validInput, [field]: value }),
        {
          status: "unavailable",
          reason: "unsupported-measurements",
          unsupportedFields: [field],
        },
      );
    });
  }
}

test("reports both unsupported measurements", () => {
  assert.deepEqual(
    estimateRestingEnergy({
      ...validInput,
      weightKg: 20,
      heightCm: 90,
    }),
    {
      status: "unavailable",
      reason: "unsupported-measurements",
      unsupportedFields: ["weightKg", "heightCm"],
    },
  );
});

const supportedBoundaries = [
  { field: "age", values: [19, 78] },
  { field: "weightKg", values: [30, 350] },
  { field: "heightCm", values: [100, 250] },
] as const;

for (const { field, values } of supportedBoundaries) {
  for (const value of values) {
    test(`accepts ${field} boundary=${value}`, () => {
      const result = estimateRestingEnergy({
        ...validInput,
        [field]: value,
      });

      assert.equal(result.status, "available");

      if (result.status === "available") {
        assert.ok(Number.isFinite(result.kcalPerDay));
        assert.ok(result.kcalPerDay > 0);
      }
    });
  }
}

test("preserves fractional calories until presentation", () => {
  assert.deepEqual(
    estimateRestingEnergy({ ...validInput, heightCm: 180.5 }),
    { status: "available", kcalPerDay: 1783.125 },
  );
});