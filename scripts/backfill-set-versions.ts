import { prisma } from "../app/lib/prisma";

async function main() {
  // MongoDB schema defaults do not replace a data backfill.
  // Only missing versions are initialized; reruns never reset existing versions.
  const result = await prisma.$runCommandRaw({
    update: "WorkoutSet",
    updates: [{ q: { version: { $exists: false } }, u: { $set: { version: 0 } }, multi: true }],
  });
  if (result.ok !== 1 || result.writeErrors || result.writeConcernError) {
    throw new Error("Backfill failed; inspect the database before continuing.");
  }
  console.log("Missing set versions initialized:", result.nModified);
}
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => { await prisma.$disconnect(); });
