import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { addWorkoutExerciseSchema } from "@/app/lib/validations/workout-exercise";

type RouteContext = {
  params: Promise<{ id: string }>;
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

    const { id } = await params;

    if (!/^[a-f\d]{24}$/i.test(id)) {
      return NextResponse.json(
        { message: "Workout not found" },
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

    const result = addWorkoutExerciseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Invalid exercise data",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400, headers: responseHeaders },
      );
    }

    const workout = await prisma.workout.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!workout) {
      return NextResponse.json(
        { message: "Workout not found" },
        { status: 404, headers: responseHeaders },
      );
    }

    const exercise = await prisma.exercise.findFirst({
      where: {
        id: result.data.exerciseId,
        OR: [
          { ownerId: null },
          { ownerId: session.user.id },
        ],
      },
      select: {
        id: true,
        name: true,
        category: true,
      },
    });

    if (!exercise) {
      return NextResponse.json(
        { message: "Exercise not found" },
        { status: 404, headers: responseHeaders },
      );
    }

    const lastExercise = await prisma.workoutExercise.findFirst({
      where: {
        workoutId: workout.id,
      },
      orderBy: [
        { order: "desc" },
        { id: "desc" },
      ],
      select: {
        order: true,
      },
    });

    const workoutExercise = await prisma.workoutExercise.create({
      data: {
        workoutId: workout.id,
        exerciseId: exercise.id,
        order: (lastExercise?.order ?? -1) + 1,
      },
      select: {
        id: true,
        workoutId: true,
        exerciseId: true,
        order: true,
        exercise: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Exercise added to workout",
        workoutExercise,
      },
      { status: 201, headers: responseHeaders },
    );
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "This exercise is already in the workout" },
        { status: 409, headers: responseHeaders },
      );
    }

    console.error("Failed to add exercise to workout:", error);

    return NextResponse.json(
      { message: "Unable to add exercise to workout" },
      { status: 500, headers: responseHeaders },
    );
  }
}