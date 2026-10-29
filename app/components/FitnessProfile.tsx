"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { RestingEnergyResult } from "@/app/lib/energy";
import type {
  ActivityLevel,
  DailyEnergyResult,
} from "@/app/lib/daily-energy";

type EquationSex = "MALE" | "FEMALE";

type ProfileResponse = {
  profile: {
    age: number | null;
    metabolicSex: EquationSex | null;
    heightCm: number | null;
    weightKg: number | null;
    activityLevel: ActivityLevel | null;
  };
  restingEnergy: RestingEnergyResult;
  dailyEnergy: DailyEnergyResult;
};

type ProfileForm = {
  age: string;
  metabolicSex: EquationSex | "";
  heightFeet: string;
  heightInches: string;
  weightLb: string;
  activityLevel: ActivityLevel | "";
};

const CM_PER_INCH = 2.54;
const KG_PER_POUND = 0.45359237;

const activityOptions = [
  {
    value: "SEDENTARY",
    label: "Sedentary",
    description: "Mostly seated, with little walking or exercise.",
  },
  {
    value: "LIGHTLY_ACTIVE",
    label: "Lightly active",
    description: "Mostly seated, with some walking and light activity.",
  },
  {
    value: "MODERATELY_ACTIVE",
    label: "Moderately active",
    description: "Regular movement and exercise across a typical week.",
  },
  {
    value: "VERY_ACTIVE",
    label: "Very active",
    description:
      "Substantial daily movement, physical work, or demanding training.",
  },
  {
    value: "EXTRA_ACTIVE",
    label: "Extra active",
    description:
      "Sustained strenuous work or a very demanding training schedule.",
  },
] as const;

const emptyForm: ProfileForm = {
  age: "",
  metabolicSex: "",
  heightFeet: "",
  heightInches: "",
  weightLb: "",
  activityLevel: "",
};

const fieldLabels = {
  age: "age",
  weightKg: "weight",
  heightCm: "height",
  metabolicSex: "equation sex selection",
};

const inputClass =
  "mt-2 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm";

function toForm(profile: ProfileResponse["profile"]): ProfileForm {
  const totalInches =
    profile.heightCm === null
      ? null
      : Math.round((profile.heightCm / CM_PER_INCH) * 100) / 100;

  const feet =
    totalInches === null ? null : Math.floor(totalInches / 12);

  const inches =
    totalInches === null || feet === null
      ? null
      : Number((totalInches - feet * 12).toFixed(2));

  return {
    age: profile.age?.toString() ?? "",
    metabolicSex: profile.metabolicSex ?? "",
    heightFeet: feet?.toString() ?? "",
    heightInches: inches?.toString() ?? "",
    weightLb:
      profile.weightKg === null
        ? ""
        : Number((profile.weightKg / KG_PER_POUND).toFixed(1)).toString(),
    activityLevel: profile.activityLevel ?? "",
  };
}

function parseOptionalNumber(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function Calories({ value }: { value: number }) {
  return (
    <p className="mt-3 text-3xl font-bold text-accent-cyan">
      {Math.round(value).toLocaleString("en-US")}
      <span className="ml-2 text-sm font-normal text-text-muted">
        kcal/day
      </span>
    </p>
  );
}

function RestingEstimate({ result }: { result: RestingEnergyResult }) {
  if (result.status === "available") {
    return (
      <>
        <Calories value={result.kcalPerDay} />
        <p className="mt-3 text-sm text-text-muted">
          Estimated energy used at rest using Mifflin–St Jeor.
          This is not your total daily expenditure or an intake target.
        </p>
      </>
    );
  }

  let message: string;

  switch (result.reason) {
    case "missing-inputs":
      message = `Complete your ${result.missingFields
        .map((field) => fieldLabels[field])
        .join(", ")} to calculate an estimate.`;
      break;
    case "invalid-inputs":
      message = `Check your ${result.invalidFields
        .map((field) => fieldLabels[field])
        .join(", ")} before calculating.`;
      break;
    case "unsupported-age":
      message = "This estimator currently supports ages 19–78.";
      break;
    case "unsupported-measurements":
      message =
        "Your measurements are outside this estimator’s supported range.";
      break;
  }

  return <p className="mt-3 text-sm text-text-muted">{message}</p>;
}

function DailyEstimate({ result }: { result: DailyEnergyResult }) {
  if (result.status === "unavailable") {
    const message =
      result.reason === "missing-activity-level"
        ? "Select and save your typical activity level to calculate this estimate."
        : result.reason === "invalid-activity-level"
          ? "Select a valid activity level and save your profile."
          : "Complete or correct the resting-energy inputs first.";

    return <p className="mt-3 text-sm text-text-muted">{message}</p>;
  }

  const activity = activityOptions.find(
    (option) => option.value === result.activityLevel,
  );

  return (
    <>
      <Calories value={result.kcalPerDay} />

      <p className="mt-3 text-sm text-text-muted">
        Resting estimate × {result.activityMultiplier} activity factor
        {" "}({activity?.label}).
      </p>

      <p className="mt-3 text-sm text-text-muted">
        An approximate average daily expenditure at your current weight
        and typical activity level. Individual needs can differ.
        Regular exercise is included; logged workout calories are not
        added again. This is not a weight-loss or weight-gain target.
      </p>
    </>
  );
}

export default function FitnessProfile() {
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/profile", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? "Sign in to view your fitness profile."
              : "Unable to load your fitness profile.",
          );
        }

        const result: ProfileResponse = await response.json();

        if (active) {
          setData(result);
          setForm(toForm(result.profile));
        }
      } catch (error: unknown) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load your fitness profile.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  function updateField<K extends keyof ProfileForm>(
    field: K,
    value: ProfileForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setSaved(false);
    setSaveError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !data) return;

    setSaved(false);
    setSaveError(null);

    const age = parseOptionalNumber(form.age);
    const feet = parseOptionalNumber(form.heightFeet);
    const inches = parseOptionalNumber(form.heightInches);
    const pounds = parseOptionalNumber(form.weightLb);

    if (age !== null && (!Number.isInteger(age) || age <= 0)) {
      setSaveError("Enter age as a positive whole number.");
      return;
    }

    const heightIsEmpty = feet === null && inches === null;

    if (
      !heightIsEmpty &&
      (
        feet === null ||
        inches === null ||
        !Number.isInteger(feet) ||
        feet < 0 ||
        !Number.isFinite(inches) ||
        inches < 0 ||
        inches >= 12 ||
        feet * 12 + inches <= 0
      )
    ) {
      setSaveError(
        "Enter both feet and inches. Use whole-number feet and inches from 0 to less than 12. Clear both fields to remove height.",
      );
      return;
    }

    if (
      pounds !== null &&
      (!Number.isFinite(pounds) || pounds <= 0)
    ) {
      setSaveError("Enter a positive weight in pounds.");
      return;
    }

    const originalForm = toForm(data.profile);

    const heightUnchanged =
      form.heightFeet === originalForm.heightFeet &&
      form.heightInches === originalForm.heightInches;

    const weightUnchanged = form.weightLb === originalForm.weightLb;

    const heightCm = heightUnchanged
      ? data.profile.heightCm
      : feet === null || inches === null
        ? null
        : (feet * 12 + inches) * CM_PER_INCH;

    const weightKg = weightUnchanged
      ? data.profile.weightKg
      : pounds === null
        ? null
        : pounds * KG_PER_POUND;

    if (
      [heightCm, weightKg].some(
        (value) => value !== null && !Number.isFinite(value),
      )
    ) {
      setSaveError("These measurements are too large to process.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age,
          heightCm,
          weightKg,
          metabolicSex: form.metabolicSex || null,
          activityLevel: form.activityLevel || null,
        }),
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Your session has expired. Sign in again."
            : response.status === 400
              ? "Check your profile inputs before saving."
              : "Unable to save your fitness profile.",
        );
      }

      const result: ProfileResponse = await response.json();

      setData(result);
      setForm(toForm(result.profile));
      setSaved(true);
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to save your fitness profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p role="status">Loading your fitness profile...</p>;
  }

  if (loadError) {
    return (
      <p role="alert" className="text-red-400">
        {loadError}
      </p>
    );
  }

  if (!data) return null;

  const selectedActivity = activityOptions.find(
    (option) => option.value === form.activityLevel,
  );

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-app-border bg-app-surface p-6"
      >
        <h2 className="text-lg font-semibold">Your fitness profile</h2>

        <p id="profile-help" className="mt-2 text-sm text-text-muted">
          Enter height in feet and inches, and weight in pounds.
          You can save an incomplete profile. Clear both height fields
          to remove height, or clear weight to remove weight.
        </p>

        <fieldset
          disabled={saving}
          aria-describedby="profile-help"
          className="mt-6 grid gap-5 sm:grid-cols-2"
        >
          <legend className="sr-only">Energy estimate inputs</legend>

          <label htmlFor="profile-age" className="text-sm font-medium">
            Age (years)
            <input
              id="profile-age"
              type="number"
              min="1"
              step="1"
              value={form.age}
              onChange={(event) => updateField("age", event.target.value)}
              className={inputClass}
            />
          </label>

          <div>
            <p className="text-sm font-medium">Height</p>
            <div className="grid grid-cols-2 gap-3">
              <label htmlFor="profile-feet" className="mt-2 text-sm">
                Feet
                <input
                  id="profile-feet"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="5"
                  value={form.heightFeet}
                  onChange={(event) =>
                    updateField("heightFeet", event.target.value)
                  }
                  className={inputClass}
                />
              </label>

              <label htmlFor="profile-inches" className="mt-2 text-sm">
                Inches
                <input
                  id="profile-inches"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="8"
                  value={form.heightInches}
                  onChange={(event) =>
                    updateField("heightInches", event.target.value)
                  }
                  className={inputClass}
                />
              </label>
            </div>

            {form.heightFeet !== "" && form.heightInches !== "" && (
              <p className="mt-2 text-sm text-text-muted">
                {form.heightFeet}′ {form.heightInches}″
              </p>
            )}
          </div>

          <label htmlFor="profile-weight" className="text-sm font-medium">
            Weight (lb)
            <div className="relative">
              <input
                id="profile-weight"
                type="number"
                min="0"
                step="any"
                placeholder="185"
                value={form.weightLb}
                onChange={(event) =>
                  updateField("weightLb", event.target.value)
                }
                className={`${inputClass} pr-12`}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 mt-1 -translate-y-1/2 text-sm text-text-muted"
              >
                lb
              </span>
            </div>
          </label>

          <label htmlFor="profile-sex" className="text-sm font-medium">
            Sex coefficient for equation
            <select
              id="profile-sex"
              value={form.metabolicSex}
              aria-describedby="equation-sex-help"
              onChange={(event) => {
                const value = event.target.value;

                if (value === "" || value === "MALE" || value === "FEMALE") {
                  updateField("metabolicSex", value);
                }
              }}
              className={inputClass}
            >
              <option value="">Select an option</option>
              <option value="MALE">Male coefficient</option>
              <option value="FEMALE">Female coefficient</option>
            </select>
          </label>

          <label
            htmlFor="profile-activity"
            className="text-sm font-medium sm:col-span-2"
          >
            Typical overall activity
            <select
              id="profile-activity"
              value={form.activityLevel}
              aria-describedby="activity-help"
              onChange={(event) => {
                const value = event.target.value;

                if (value === "") {
                  updateField("activityLevel", "");
                  return;
                }

                const option = activityOptions.find(
                  (item) => item.value === value,
                );

                if (option) {
                  updateField("activityLevel", option.value);
                }
              }}
              className={inputClass}
            >
              <option value="">Select an activity level</option>
              {activityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <p
            id="activity-help"
            className="text-sm text-text-muted sm:col-span-2"
          >
            {selectedActivity
              ? `${selectedActivity.description} `
              : ""}
            Consider your work, transport, everyday movement, and regular
            exercise across a typical week—not just your hardest workout.
          </p>
        </fieldset>

        <p id="equation-sex-help" className="mt-4 text-xs text-text-muted">
          These are the original equation’s two sex categories.
          They do not capture every individual’s physiology.
        </p>

        {saveError && (
          <p role="alert" className="mt-4 text-sm text-red-400">
            {saveError}
          </p>
        )}

        <p role="status" className="mt-4 text-sm text-text-muted">
          {saved ? "Profile saved." : saving ? "Saving profile..." : ""}
        </p>

        <button
          type="submit"
          disabled={saving}
          className="mt-4 rounded-lg bg-accent-cyan px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>

      <p className="text-sm text-text-muted">
        Estimates below use your last saved profile.
      </p>

      <section
        aria-labelledby="resting-energy-heading"
        className="rounded-2xl border border-app-border bg-app-surface p-6"
      >
        <h2 id="resting-energy-heading" className="text-lg font-semibold">
          Estimated resting calories
        </h2>
        <RestingEstimate result={data.restingEnergy} />
      </section>

      <section
        aria-labelledby="daily-energy-heading"
        className="rounded-2xl border border-app-border bg-app-surface p-6"
      >
        <h2 id="daily-energy-heading" className="text-lg font-semibold">
          Estimated daily expenditure (TDEE)
        </h2>
        <DailyEstimate result={data.dailyEnergy} />
      </section>
    </div>
  );
}