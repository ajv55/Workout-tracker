import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { createExerciseSchema } from "@/app/lib/validations/exercise";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

const responseHeaders = {
  "Cache-Control": "private, no-store",
};

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401, headers: responseHeaders },
      );
    }

    const searchParams = new URL(request.url).searchParams;

    const result = querySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Invalid pagination parameters",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400, headers: responseHeaders },
      );
    }

    const { page, pageSize } = result.data;

    const where = {
      OR: [
        { ownerId: null },
        { ownerId: session.user.id },
      ],
    };

    const exercises = await prisma.exercise.findMany({
      where,
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        ownerId: true,
      },
      orderBy: [
        { name: "asc" },
        { id: "asc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const total = await prisma.exercise.count({ where });
    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json(
      {
        exercises: exercises.map(({ ownerId, ...exercise }) => ({
          ...exercise,
          isCustom: ownerId !== null,
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasNextPage: page < totalPages,
        },
      },
      { status: 200, headers: responseHeaders },
    );
  } catch (error: unknown) {
    console.error("Failed to fetch exercises:", error);

    return NextResponse.json(
      { message: "Unable to fetch exercises" },
      { status: 500, headers: responseHeaders },
    );
  }
}

export async function POST(request: Request) {
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

    const result = createExerciseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Invalid exercise data",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400, headers: responseHeaders },
      );
    }

    const exercise = await prisma.exercise.create({
      data: {
        ...result.data,
        ownerId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
      },
    });

    return NextResponse.json(
      {
        message: "Custom exercise created successfully",
        exercise: {
          ...exercise,
          isCustom: true,
        },
      },
      { status: 201, headers: responseHeaders },
    );
  } catch (error: unknown) {
    console.error("Failed to create custom exercise:", error);

    return NextResponse.json(
      { message: "Unable to create custom exercise" },
      { status: 500, headers: responseHeaders },
    );
  }
}