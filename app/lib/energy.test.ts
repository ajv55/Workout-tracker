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

test("uses the female equation coefficient", () => {
  assert.deepEqual(
    estimateRestingEnergy({
      ...validInput,
      metabolicSex: "FEMALE",
    }),
    {
      status: "available",
      kcalPerDay: 1614,
    },
  );
});

test("reports missing weight without inventing an estimate", () => {
  assert.deepEqual(
    estimateRestingEnergy({
      ...validInput,
      weightKg: null,
    }),
    {
      status: "unavailable",
      reason: "missing-inputs",
      missingFields: ["weightKg"],
    },
  );
});

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
    test(`rejects ${field}=${String(value)}`, () => {
      assert.deepEqual(
        estimateRestingEnergy({
          ...validInput,
          [field]: value,
        }),
        {
          status: "unavailable",
          reason: "invalid-inputs",
          invalidFields: [field],
        },
      );
    });
  }
}

for (const age of [-1, 0, 30.5, NaN, Infinity]) {
  test(`rejects invalid age=${String(age)}`, () => {
    assert.deepEqual(
      estimateRestingEnergy({
        ...validInput,
        age,
      }),
      {
        status: "unavailable",
        reason: "invalid-inputs",
        invalidFields: ["age"],
      },
    );
  });
}

for (const age of [18, 79]) {
  test(`reports age ${age} as outside the supported range`, () => {
    assert.deepEqual(
      estimateRestingEnergy({
        ...validInput,
        age,
      }),
      {
        status: "unavailable",
        reason: "unsupported-age",
      },
    );
  });
}

for (const age of [19, 78]) {
  test(`accepts supported age boundary ${age}`, () => {
    const result = estimateRestingEnergy({
      ...validInput,
      age,
    });

    assert.equal(result.status, "available");

    if (result.status === "available") {
      assert.ok(Number.isFinite(result.kcalPerDay));
      assert.ok(result.kcalPerDay > 0);
    }
  });
}