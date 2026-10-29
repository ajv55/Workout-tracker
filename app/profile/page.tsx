import Link from "next/link";
import FitnessProfile from "../components/FitnessProfile";

export default function ProfilePage() {
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