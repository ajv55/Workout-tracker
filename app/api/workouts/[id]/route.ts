import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { updateWorkoutSchema } from "@/app/lib/validations/workout";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json(
      { message: "Workout not found" },
      { status: 404 }
    );
  }

  try {
    const workout = await prisma.workout.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        exercises: true,
      },
    });

    if (!workout) {
      return NextResponse.json(
        { message: "Workout not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { workout },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Failed to fetch workout:", error);

    return NextResponse.json(
      { message: "Unable to fetch workout" },
      { status: 500 }
    );
  }
}



export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json(
      { message: "Workout not found" },
      { status: 404 }
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

  const result = updateWorkoutSchema.safeParse(body);

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
    const existingWorkout = await prisma.workout.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!existingWorkout) {
      return NextResponse.json(
        { message: "Workout not found" },
        { status: 404 }
      );
    }

    const workout = await prisma.workout.update({
      where: {
        id: existingWorkout.id,
      },
      data: result.data,
    });

    return NextResponse.json(
      {
        message: "Workout updated successfully",
        workout,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Failed to update workout:", error);

    return NextResponse.json(
      { message: "Unable to update workout" },
      { status: 500 }
    );
  }
}



export async function DELETE(
  _request: Request,
  { params }: RouteContext
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json(
      { message: "Workout not found" },
      { status: 404 }
    );
  }

  try {
    const existingWorkout = await prisma.workout.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!existingWorkout) {
      return NextResponse.json(
        { message: "Workout not found" },
        { status: 404 }
      );
    }

    await prisma.workout.delete({
      where: {
        id: existingWorkout.id,
      },
    });

    return NextResponse.json(
      { message: "Workout deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Failed to delete workout:", error);

    return NextResponse.json(
      { message: "Unable to delete workout" },
      { status: 500 }
    );
  }
}
