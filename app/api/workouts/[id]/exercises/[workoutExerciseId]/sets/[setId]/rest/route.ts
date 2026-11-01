import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { transitionWorkoutRest } from "@/app/lib/workout-rest";
import { workoutSetRestRequestSchema } from "@/app/lib/validations/workout-set";

type RouteContext = {
  params: Promise<{
    id: string;
    workoutExerciseId: string;
    setId: string;
  }>;
};

const responseHeaders = {
  "Cache-Control": "private, no-store",
};

export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401, headers: responseHeaders },
      );
    }

    const { id, workoutExerciseId, setId } = await params;

    if (
      ![id, workoutExerciseId, setId].every((value) =>
        /^[a-f\d]{24}$/i.test(value),
      )
    ) {
      return NextResponse.json(
        { message: "Workout set not found" },
        { status: 404, headers: responseHeaders },
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

    const action = workoutSetRestRequestSchema.safeParse(body);

    if (!action.success) {
      return NextResponse.json(
        {
          message: "Invalid rest action",
          errors: action.error.flatten(),
        },
        { status: 400, headers: responseHeaders },
      );
    }

    const outcome = await prisma.$transaction(async (tx) => {
      const existing = await tx.workoutSet.findFirst({
        where: {
          id: setId,
          workoutExerciseId,
          workoutExercise: {
            workoutId: id,
            workout: {
              userId: session.user.id,
            },
          },
        },
      });

      if (!existing) {
        return { status: "not-found" } as const;
      }

      const transition = transitionWorkoutRest(
        {
          completed: existing.completed,
          reps: existing.reps,
          plannedRestSeconds: existing.plannedRestSeconds,
          restStartedAt: existing.restStartedAt,
          restEndedAt: existing.restEndedAt,
        },
        action.data.action,
        new Date(),
      );

      if (transition.status === "rejected") {
        return {
          status: "rejected",
          reason: transition.reason,
        } as const;
      }

      if (!transition.changed) {
        return {
          status: "success",
          changed: false,
          set: existing,
        } as const;
      }

      if (existing.version !== action.data.expectedVersion) {
        return { status: "conflict", currentSet: existing } as const;
      }
      const updated = await tx.workoutSet.updateMany({
        where: { id: existing.id, version: action.data.expectedVersion },
        data: {
          restStartedAt: transition.restStartedAt,
          restEndedAt: transition.restEndedAt,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        return { status: "conflict", currentSet: await tx.workoutSet.findUniqueOrThrow({
          where: { id: existing.id },
        }) } as const;
      }
      const set = await tx.workoutSet.findUniqueOrThrow({ where: { id: existing.id } });

      return {
        status: "success",
        changed: true,
        set,
      } as const;
    });

    if (outcome.status === "not-found") {
      return NextResponse.json(
        { message: "Workout set not found" },
        { status: 404, headers: responseHeaders },
      );
    }

    if (outcome.status === "conflict") {
      return NextResponse.json({
        message: "This set changed in another tab. Review its latest saved values.",
        reason: "version-conflict",
        currentSet: outcome.currentSet,
        serverNow: new Date().toISOString(),
      }, { status: 409, headers: responseHeaders });
    }

    if (outcome.status === "rejected") {
      return NextResponse.json(
        {
          message: outcome.reason === "rest-expired"
            ? "Rest tracking expired. No actual rest duration was recorded."
            : "Rest action is not allowed for this set",
          serverNow: new Date().toISOString(),
          reason: outcome.reason,
        },
        { status: 409, headers: responseHeaders },
      );
    }

    return NextResponse.json(
      {
        message: outcome.changed
          ? "Rest interval updated"
          : "Rest interval unchanged",
        changed: outcome.changed,
        set: outcome.set,
        serverNow: new Date().toISOString(),
      },
      { status: 200, headers: responseHeaders },
    );
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error
    ) {
      if (error.code === "P2025") {
        return NextResponse.json(
          { message: "Workout set not found" },
          { status: 404, headers: responseHeaders },
        );
      }

      if (error.code === "P2034") {
        return NextResponse.json(
          {
            message:
              "The set changed during this request. Refresh before trying again.",
          },
          { status: 409, headers: responseHeaders },
        );
      }
    }

    console.error("Failed to update workout rest:", error);

    return NextResponse.json(
      { message: "Unable to update workout rest" },
      { status: 500, headers: responseHeaders },
    );
  }
}