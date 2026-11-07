import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Workout Tracker | Build consistency",
  description:
    "Record your workouts, follow your progress, and build a consistent training routine.",
  robots: { index: true, follow: true },
};

const features = [
  {
    number: "01",
    title: "Record your training",
    description:
      "Keep workouts, exercises, sets, and notes together so you can focus on your next session.",
  },
  {
    number: "02",
    title: "See your consistency",
    description:
      "Review your workout history, weekly activity, and training time to understand your routine.",
  },
  {
    number: "03",
    title: "Understand your energy needs",
    description:
      "Use your fitness profile to explore estimated resting and daily energy needs.",
  },
];

const primaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-accent-cyan px-6 py-3 font-semibold text-app-bg transition hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-cyan";

const secondaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-xl border border-app-border px-6 py-3 font-semibold text-text-primary transition hover:bg-app-raised focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-cyan";

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-app-bg text-text-primary">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent-cyan focus:p-3 focus:text-app-bg"
      >
        Skip to content
      </a>

      <header className="border-b border-app-border">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6"
        >
          <Link
            href="/welcome"
            aria-label="Workout Tracker home"
            className="flex items-center gap-3 font-bold"
          >
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-cyan text-xl text-app-bg"
            >
              W
            </span>
            <span className="text-sm sm:text-base">Workout Tracker</span>
          </Link>

          <Link
            href="/signin"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-accent-cyan hover:bg-app-raised"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <main id="main-content">
        <section
          aria-labelledby="hero-heading"
          className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-16"
        >
          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-accent-cyan">
              Your training. Your progress.
            </p>

            <h1
              id="hero-heading"
              className="max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl"
            >
              Track your training.
              <span className="block text-accent-cyan">
                Build consistency.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-8 text-text-muted sm:text-lg">
              Turn individual workouts into a routine you can follow.
              Record your sessions, review your progress, and keep
              showing up for your goals.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className={primaryButton}>
                Create an account
              </Link>
              <a href="#features" className={secondaryButton}>
                Explore the features
              </a>
            </div>

            <p className="mt-5 text-sm text-text-muted">
              Sign up with email, Google, or GitHub.
            </p>
          </div>

          <div className="min-w-0 rounded-3xl border border-app-border bg-app-surface p-5 shadow-2xl sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-text-muted">Your training overview</p>
                <h2 className="mt-1 text-xl font-bold">A week of showing up</h2>
              </div>
              <span className="rounded-full border border-app-border px-3 py-1 text-xs text-text-muted">
                Sample preview
              </span>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-app-raised p-4">
                <p className="text-xs text-text-muted">Workouts this week</p>
                <p className="mt-2 text-3xl font-bold text-accent-cyan">3</p>
              </div>
              <div className="rounded-2xl bg-app-raised p-4">
                <p className="text-xs text-text-muted">Training time</p>
                <p className="mt-2 text-3xl font-bold">
                  135 <span className="text-sm text-text-muted">min</span>
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-app-border p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="font-medium">Weekly goal</p>
                <p className="text-accent-cyan">3 / 5 workouts</p>
              </div>
              <div
                role="img"
                aria-label="Sample weekly goal: 3 of 5 workouts, 60 percent complete"
                className="mt-4 h-2 overflow-hidden rounded-full bg-app-border"
              >
                <div className="h-full w-3/5 rounded-full bg-accent-cyan" />
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold">Recent sessions</p>
              <ul className="divide-y divide-app-border">
                {[
                  { title: "Upper body", duration: "45 min" },
                  { title: "Lower body", duration: "50 min" },
                  { title: "Full body", duration: "40 min" },
                ].map((workout) => (
                  <li
                    key={workout.title}
                    className="flex items-center justify-between gap-4 py-4 text-sm"
                  >
                    <span>{workout.title}</span>
                    <span className="shrink-0 text-text-muted">
                      {workout.duration}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section
          id="features"
          aria-labelledby="features-heading"
          className="border-y border-app-border bg-app-surface"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <p className="text-sm font-semibold text-accent-cyan">
              Built around your routine
            </p>
            <h2
              id="features-heading"
              className="mt-3 text-3xl font-bold tracking-tight"
            >
              Give every session a place.
            </h2>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.number}
                  className="rounded-2xl border border-app-border bg-app-bg p-6"
                >
                  <p
                    aria-hidden="true"
                    className="text-sm font-bold text-accent-cyan"
                  >
                    {feature.number}
                  </p>
                  <h3 className="mt-5 text-lg font-semibold">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-text-muted">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>

            <p className="mt-6 text-xs leading-6 text-text-muted">
              Energy estimates are informational and are not medical advice.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="start-heading"
          className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24"
        >
          <h2
            id="start-heading"
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Your next session starts here.
          </h2>
          <p className="mt-4 leading-7 text-text-muted">
            Create an account and start building your training history.
          </p>
          <Link href="/register" className={`${primaryButton} mt-8`}>
            Start tracking
          </Link>
        </section>
      </main>

      <footer className="border-t border-app-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-text-muted sm:px-6">
          <p>Workout Tracker · Built for consistency.</p>
          <Link href="/signin" className="text-accent-cyan hover:underline">
            Sign in to your account
          </Link>
        </div>
      </footer>
    </div>
  );
}