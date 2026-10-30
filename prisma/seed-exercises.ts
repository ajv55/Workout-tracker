import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const exercises = [
  {
    id: "64f000000000000000000001",
    name: "Barbell Back Squat",
    category: "Strength",
    description: "Barbell squat with the bar positioned on the upper back.",
  },
  {
    id: "64f000000000000000000002",
    name: "Barbell Bench Press",
    category: "Strength",
    description: "Flat bench press using a barbell.",
  },
  {
    id: "64f000000000000000000003",
    name: "Barbell Deadlift",
    category: "Strength",
    description: "Barbell lift from the floor to a standing position.",
  },
  {
    id: "64f000000000000000000004",
    name: "Dumbbell Row",
    category: "Strength",
    description: "Row performed with a dumbbell.",
  },
  {
    id: "64f000000000000000000005",
    name: "Overhead Press",
    category: "Strength",
    description: "Standing overhead press using a barbell.",
  },
  {
    id: "64f000000000000000000006",
    name: "Push-Up",
    category: "Strength",
    description: "Bodyweight pressing exercise performed from the floor.",
  },
] as const;

async function main() {
  const { prisma } = await import("../app/lib/prisma");

  try {
    // Check all reserved IDs before writing any catalog records.
    const existing = await prisma.exercise.findMany({
      where: {
        id: {
          in: exercises.map((exercise) => exercise.id),
        },
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (existing.some((exercise) => exercise.ownerId !== null)) {
      throw new Error(
        "A catalog ID belongs to a custom exercise. No seed changes made.",
      );
    }

    for (const exercise of exercises) {
      const { id, ...details } = exercise;

      await prisma.exercise.upsert({
        where: { id },
        update: details,
        create: {
          id,
          ...details,
          ownerId: null,
        },
      });
    }

    console.log(`Shared catalog ready: ${exercises.length} exercises.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Exercise seed failed.",
  );
  process.exitCode = 1;
});