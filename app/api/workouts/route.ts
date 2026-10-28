import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { createWorkoutSchema } from "@/app/lib/validations/workout";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const workouts = await prisma.workout.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(
      { workouts },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Failed to fetch workouts:", error);

    return NextResponse.json(
      { message: "Unable to fetch workouts" },
      { status: 500 }
    );
  }
}



export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const result = createWorkoutSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        message: "Invalid workout data",
        errors: result.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  try {
    const workout = await prisma.workout.create({
      data: {
        ...result.data,
        userId: session.user.id,
      },
    });

    return NextResponse.json(
      {
        message: "Workout created successfully",
        workout,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Failed to create workout:", error);

    return NextResponse.json(
      { message: "Unable to create workout" },
      { status: 500 }
    );
  }
}

