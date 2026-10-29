import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { createWorkoutSchema } from "@/app/lib/validations/workout";
import { z } from "zod";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  range: z.enum(["all", "week", "month"]).default("all"),
});

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

   const searchParams = new URL(request.url).searchParams;

    const paginationRequested =
    searchParams.has("page") || searchParams.has("pageSize");

    const paginationResult = paginationSchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
    range: searchParams.get("range") ?? undefined,
    });

    if (!paginationResult.success) {
    return NextResponse.json(
        {
        message: "Invalid pagination parameters",
        errors: paginationResult.error.flatten().fieldErrors,
        },
        { status: 400 },
    );
    }

    const { page, pageSize, range } = paginationResult.data;
const skip = (page - 1) * pageSize;

const now = new Date();
let startDate: Date | undefined;

if (range === "week") {
  const daysSinceMonday = (now.getUTCDay() + 6) % 7;

  startDate = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysSinceMonday,
    ),
  );
} else if (range === "month") {
  startDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
}

const where = {
  userId: session.user.id,
  ...(startDate
    ? {
        date: {
          gte: startDate,
          lte: now,
        },
      }
    : {}),
};

  try {
    const workouts = await prisma.workout.findMany({
        where,
        orderBy: [
            { date: "desc" },
            { id: "desc" },
        ],
        ...(paginationRequested
            ? {
                skip,
                take: pageSize,
            }
            : {}),
        });

        if (!paginationRequested) {
                return NextResponse.json({ workouts }, { status: 200 });
                }

                const summary = await prisma.workout.aggregate({
                        where,
                        _count: {
                            _all: true,
                            durationMinutes: true,
                        },
                        _sum: {
                            durationMinutes: true,
                        },
                        _avg: {
                            durationMinutes: true,
                        },
                        });

                        const total = summary._count._all;

                const totalPages = Math.ceil(total / pageSize);

                return NextResponse.json(
                        {
                            workouts,
                            pagination: {
                            page,
                            pageSize,
                            total,
                            totalPages,
                            hasNextPage: page < totalPages,
                            },
                            analytics: {
                            workoutCount: total,
                            workoutsWithDuration: summary._count.durationMinutes,
                            totalTrainingMinutes: summary._sum.durationMinutes ?? 0,
                            averageDurationMinutes: summary._avg.durationMinutes,
                            },
                        },
                        { status: 200 },
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

