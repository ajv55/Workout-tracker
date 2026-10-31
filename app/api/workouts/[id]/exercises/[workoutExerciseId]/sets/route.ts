import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { createWorkoutSetsSchema } from "@/app/lib/validations/workout-set";

type RouteContext = {
  params: Promise<{
    id: string;
    workoutExerciseId: string;
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

    const { id, workoutExerciseId } = await params;

    if (
      !/^[a-f\d]{24}$/i.test(id) ||
      !/^[a-f\d]{24}$/i.test(workoutExerciseId)
    ) {
      return NextResponse.json(
        { message: "Workout exercise not found" },
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

    const validation = createWorkoutSetsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Invalid set data",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400, headers: responseHeaders },
      );
    }

    const sets = await prisma.$transaction(async (tx) => {
      const attachment = await tx.workoutExercise.findFirst({
        where: {
          id: workoutExerciseId,
          workoutId: id,
          workout: {
            userId: session.user.id,
          },
        },
        select: { id: true },
      });

      if (!attachment) return null;

      const lastSet = await tx.workoutSet.findFirst({
        where: {
          workoutExerciseId: attachment.id,
        },
        orderBy: {
          setNumber: "desc",
        },
        select: {
          setNumber: true,
        },
      });

      const firstSetNumber = (lastSet?.setNumber ?? 0) + 1;
      const created = [];

      for (let index = 0; index < validation.data.count; index++) {
        const set = await tx.workoutSet.create({
          data: {
            workoutExerciseId: attachment.id,
            setNumber: firstSetNumber + index,
            reps: null,
            weightKg: null,
            completed: false,
            plannedRestSeconds: null,
            restStartedAt: null,
            restEndedAt: null,
          },
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

        created.push(set);
      }

      return created;
    });

    if (sets === null) {
      return NextResponse.json(
        { message: "Workout exercise not found" },
        { status: 404, headers: responseHeaders },
      );
    }

    return NextResponse.json(
      {
        message: "Blank sets created",
        sets,
      },
      { status: 201, headers: responseHeaders },
    );
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      return NextResponse.json(
        {
          message:
            "The workout changed during this request. Refresh before trying again.",
        },
        { status: 409, headers: responseHeaders },
      );
    }

    console.error("Failed to create workout sets:", error);

    return NextResponse.json(
      { message: "Unable to create workout sets" },
      { status: 500, headers: responseHeaders },
    );
  }
}