import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connection } from "next/server";

// Page navigation only: API routes must keep their JSON authorization responses.
export async function requirePageUser(): Promise<string> {
  await connection();
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/signin");
  }

  return userId;
}
