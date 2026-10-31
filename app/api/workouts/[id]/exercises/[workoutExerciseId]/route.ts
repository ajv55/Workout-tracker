import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
    workoutExerciseId: string;
  }>;
};

const responseHeaders = {
  "Cache-Control": "private, no-store",
};

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

    await prisma.workoutExercise.delete({
      where: {
        id: workoutExerciseId,
        workoutId: id,
        workout: {
          userId: session.user.id,
        },
      },
    });

    return NextResponse.json(
      { message: "Exercise removed from workout" },
      { status: 200, headers: responseHeaders },
    );
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { message: "Workout exercise not found" },
        { status: 404, headers: responseHeaders },
      );
    }

    console.error("Failed to remove workout exercise:", error);

    return NextResponse.json(
      { message: "Unable to remove exercise from workout" },
      { status: 500, headers: responseHeaders },
    );
  }
}