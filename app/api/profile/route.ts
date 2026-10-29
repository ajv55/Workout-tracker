import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { estimateRestingEnergy } from "@/app/lib/energy";
import {
  estimateDailyEnergy,
  type ActivityLevel,
} from "@/app/lib/daily-energy";
import {
  estimateCalorieTarget,
  type FitnessGoal,
  type TargetEligibility,
} from "@/app/lib/calorie-target";
import { updateProfileSchema } from "@/app/lib/validations/profile";

const profileSelect = {
  age: true,
  metabolicSex: true,
  heightCm: true,
  weightKg: true,
  activityLevel: true,
  goal: true,
  targetEligibility: true,
} as const;

const responseHeaders = {
  "Cache-Control": "private, no-store",
};

type FitnessProfile = {
  age: number | null;
  metabolicSex: "MALE" | "FEMALE" | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel | null;
  goal: FitnessGoal | null;
  targetEligibility: TargetEligibility | null;
};

function buildProfileResponse(profile: FitnessProfile) {
  const energyInput = {
    age: profile.age,
    metabolicSex: profile.metabolicSex,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
  };

  const restingEnergy = estimateRestingEnergy(energyInput);

  const dailyEnergy = estimateDailyEnergy({
    ...energyInput,
    activityLevel: profile.activityLevel,
  });

  const calorieTarget = estimateCalorieTarget({
    dailyEnergy,
    goal: profile.goal,
    eligibility: profile.targetEligibility,
  });

  return {
    profile,
    restingEnergy,
    dailyEnergy,
    calorieTarget,
  };
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401, headers: responseHeaders },
      );
    }

    const profile = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: profileSelect,
    });

    if (!profile) {
      return NextResponse.json(
        { message: "Profile not found" },
        { status: 404, headers: responseHeaders },
      );
    }

    return NextResponse.json(buildProfileResponse(profile), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    console.error("Failed to fetch fitness profile:", error);

    return NextResponse.json(
      { message: "Unable to fetch fitness profile" },
      { status: 500, headers: responseHeaders },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401, headers: responseHeaders },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON body" },
        { status: 400, headers: responseHeaders },
      );
    }

    const result = updateProfileSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Invalid profile data",
          errors: result.error.flatten(),
        },
        { status: 400, headers: responseHeaders },
      );
    }

    const profile = await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: result.data,
      select: profileSelect,
    });

    return NextResponse.json(buildProfileResponse(profile), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { message: "Profile not found" },
        { status: 404, headers: responseHeaders },
      );
    }

    console.error("Failed to update fitness profile:", error);

    return NextResponse.json(
      { message: "Unable to update fitness profile" },
      { status: 500, headers: responseHeaders },
    );
  }
}