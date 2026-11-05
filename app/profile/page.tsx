import { Suspense } from "react";
import { requirePageUser } from "@/app/lib/require-page-user";
import Link from "next/link";
import FitnessProfile from "../components/FitnessProfile";

async function ProfilePageContent() {
  await requirePageUser();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="text-sm text-accent-cyan hover:underline"
      >
        ← Back to dashboard
      </Link>

      <header className="mb-8 mt-6">
        <h1 className="text-3xl font-bold">Fitness profile</h1>
        <p className="mt-2 text-sm text-text-muted">
          Manage the information used to estimate your resting energy needs.
        </p>
      </header>

      <FitnessProfile />
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<p role="status" className="p-8 text-sm text-text-muted">Loading page…</p>}>
      <ProfilePageContent />
    </Suspense>
  );
}
