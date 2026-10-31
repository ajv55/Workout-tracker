import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import {
  updateWorkoutSetSchema,
  workoutSetStateSchema,
} from "@/app/lib/validations/workout-set";

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

export async function PATCH(
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

    const patch = updateWorkoutSetSchema.safeParse(body);

    if (!patch.success) {
      return NextResponse.json(
        {
          message: "Invalid set data",
          errors: patch.error.flatten().fieldErrors,
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
        select: {
          id: true,
          reps: true,
          weightKg: true,
          completed: true,
          plannedRestSeconds: true,
        },
      });

      if (!existing) {
        return { status: "not-found" } as const;
      }

      const merged = workoutSetStateSchema.safeParse({
        reps: existing.reps,
        weightKg: existing.weightKg,
        completed: existing.completed,
        plannedRestSeconds: existing.plannedRestSeconds,
        ...patch.data,
      });

      if (!merged.success) {
        return {
          status: "invalid",
          errors: merged.error.flatten().fieldErrors,
        } as const;
      }

      const set = await tx.workoutSet.update({
        where: {
          id: existing.id,
        },
        data: merged.data,
        select: {
          id: true,
          workoutExerciseId: true,
          setNumber: true,
          reps: true,
          weightKg: true,
          completed: true,
          plannedRestSeconds: true,
          restStartedAt: true,
          restEndedAt: true,
        },
      });

      return { status: "updated", set } as const;
    });

    if (outcome.status === "not-found") {
      return NextResponse.json(
        { message: "Workout set not found" },
        { status: 404, headers: responseHeaders },
      );
    }

    if (outcome.status === "invalid") {
      return NextResponse.json(
        {
          message: "Invalid resulting set",
          errors: outcome.errors,
        },
        { status: 400, headers: responseHeaders },
      );
    }

    return NextResponse.json(
      {
        message: "Workout set updated",
        set: outcome.set,
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
          { message: "The set changed. Refresh before trying again." },
          { status: 409, headers: responseHeaders },
        );
      }
    }

    console.error("Failed to update workout set:", error);

    return NextResponse.json(
      { message: "Unable to update workout set" },
      { status: 500, headers: responseHeaders },
    );
  }
}

export async function DELETE(
  _request: Request,
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

    await prisma.workoutSet.delete({
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

    return NextResponse.json(
      {
        message: "Workout set deleted",
        setId,
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
          { message: "The set changed. Refresh before trying again." },
          { status: 409, headers: responseHeaders },
        );
      }
    }

    console.error("Failed to delete workout set:", error);

    return NextResponse.json(
      { message: "Unable to delete workout set" },
      { status: 500, headers: responseHeaders },
    );
  }
}