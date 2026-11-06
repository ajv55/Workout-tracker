import { existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "../generated/prisma/client";

if (process.env.VERCEL === "1") {
  const enginePath = path.join(
    process.cwd(),
    "app",
    "generated",
    "prisma",
    "libquery_engine-rhel-openssl-3.0.x.so.node",
  );

  if (!existsSync(enginePath)) {
    throw new Error(`Prisma query engine missing at: ${enginePath}`);
  }

  process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}