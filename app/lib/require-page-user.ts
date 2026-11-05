import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Page navigation only: API routes must keep their JSON authorization responses.
export async function requirePageUser(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/signin");
  }

  return userId;
}
