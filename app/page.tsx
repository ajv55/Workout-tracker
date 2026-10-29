import RecentWorkouts from "@/app/components/RecentWorkouts";


const navigation = [
  { label: "Dashboard", icon: "◫", active: true },
  { label: "My Workouts", icon: "▤", active: false },
  { label: "Exercises", icon: "◈", active: false },
  { label: "Progress", icon: "↗", active: false },
];

const stats = [
  {
    label: "Total Workouts",
    value: "24",
    change: "+12%",
    detail: "vs. last month",
    icon: "▤",
    color: "text-accent-cyan",
    iconBg: "bg-accent-cyan/10",
  },
  {
    label: "Total Training Time",
    value: "18.5h",
    change: "+8%",
    detail: "vs. last month",
    icon: "◷",
    color: "text-accent-violet",
    iconBg: "bg-accent-violet/10",
  },
  {
    label: "Current Streak",
    value: "7 days",
    change: "On track",
    detail: "Keep it going!",
    icon: "✳",
    color: "text-accent-emerald",
    iconBg: "bg-accent-emerald/10",
  },
  {
    label: "Weekly Goal",
    value: "4 / 5",
    change: "80%",
    detail: "workouts completed",
    icon: "◎",
    color: "text-accent-cyan",
    iconBg: "bg-accent-cyan/10",
  },
];

const weeklyActivity = [
  { day: "Mon", value: 65 },
  { day: "Tue", value: 88 },
  { day: "Wed", value: 45 },
  { day: "Thu", value: 100 },
  { day: "Fri", value: 72 },
  { day: "Sat", value: 35 },
  { day: "Sun", value: 15 },
];

function SectionHeading({
  title,
  action,
}: {
  title: string;
  action?: string;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-text-primary sm:text-lg">
        {title}
      </h2>
      {action && (
        <button
          type="button"
          className="text-sm font-medium text-accent-cyan transition hover:text-cyan-200"
        >
          {action}
        </button>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-app-bg text-text-primary">
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-app-border bg-app-surface p-5 lg:flex">
          <a href="#" className="mb-10 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-accent-cyan text-xl font-bold text-app-bg">
              W
            </span>
            <span>
              <span className="block text-lg font-bold tracking-tight">
                Workout<span className="text-accent-cyan">Track</span>
              </span>
              <span className="text-xs text-text-muted">
                Your fitness journey
              </span>
            </span>
          </a>

          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-text-subtle">
            Workspace
          </p>

          <nav aria-label="Main navigation" className="space-y-1">
            {navigation.map((item) => (
              <a
                key={item.label}
                href="#"
                aria-current={item.active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  item.active
                    ? "bg-accent-cyan/10 text-accent-cyan"
                    : "text-text-muted hover:bg-app-raised hover:text-text-primary"
                }`}
              >
                <span className="w-6 text-center text-lg" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
                {item.active && (
                  <span className="ml-auto h-5 w-1 rounded-full bg-accent-cyan" />
                )}
              </a>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-app-border bg-app-raised p-4">
            <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-accent-violet/10 text-xl text-accent-violet">
              ✦
            </div>
            <h3 className="mb-1 text-sm font-semibold">Stay consistent</h3>
            <p className="mb-4 text-xs leading-5 text-text-muted">
              Every workout brings you closer to your goals.
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-app-border">
              <div className="h-full w-4/5 rounded-full bg-accent-violet" />
            </div>
            <p className="mt-2 text-xs text-text-muted">Weekly goal: 80%</p>
          </div>

          <div className="mt-5 flex items-center gap-3 border-t border-app-border pt-5">
            <div className="flex size-10 items-center justify-center rounded-full bg-accent-cyan/15 font-semibold text-accent-cyan">
              WT
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">Your Profile</p>
              <p className="text-xs text-text-muted">Fitness enthusiast</p>
            </div>
            <span className="ml-auto text-text-muted" aria-hidden="true">
              ⋯
            </span>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 border-b border-app-border bg-app-bg/95 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div>
                <p className="text-xs text-text-muted sm:text-sm">
                  Monday, October 26
                </p>
                <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
                  Dashboard
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <label className="hidden items-center gap-2 rounded-xl border border-app-border bg-app-surface px-3 py-2.5 md:flex">
                  <span aria-hidden="true" className="text-text-muted">
                    ⌕
                  </span>
                  <input
                    type="search"
                    placeholder="Search workouts..."
                    aria-label="Search workouts"
                    className="w-40 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-subtle"
                  />
                  <span className="text-xs text-text-subtle">⌘ K</span>
                </label>
                <button
                  type="button"
                  aria-label="Notifications"
                  className="relative flex size-10 items-center justify-center rounded-xl border border-app-border bg-app-surface text-lg text-text-muted transition hover:text-text-primary"
                >
                  ♧
                  <span className="absolute right-2 top-2 size-2 rounded-full bg-accent-cyan" />
                </button>
                <a
                  href="#recent-workouts"
                  className="hidden items-center gap-2 rounded-xl bg-accent-cyan px-4 py-2.5 text-sm font-semibold text-app-bg transition hover:bg-cyan-300 sm:inline-flex"
                >
                  <span aria-hidden="true">+</span>
                  New Workout
                </a>
              </div>
            </div>

            <nav
              aria-label="Mobile navigation"
              className="mx-auto mt-4 flex max-w-7xl gap-2 overflow-x-auto lg:hidden"
            >
              {navigation.map((item) => (
                <a
                  key={item.label}
                  href="#"
                  aria-current={item.active ? "page" : undefined}
                  className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium sm:text-sm ${
                    item.active
                      ? "bg-accent-cyan/10 text-accent-cyan"
                      : "text-text-muted hover:bg-app-raised"
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </header>

          <div className="mx-auto max-w-7xl space-y-7 p-4 sm:p-6 lg:space-y-8 lg:p-8">
            {/* Welcome section */}
            <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-2 text-sm font-medium text-accent-cyan">
                  YOUR FITNESS AT A GLANCE
                </p>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Welcome back!
                </h2>
                <p className="mt-2 text-sm text-text-muted sm:text-base">
                  Here&apos;s how your training is coming along.
                </p>
              </div>
              <p className="text-sm text-text-muted">
                <span className="mr-2 inline-block size-2 rounded-full bg-accent-emerald" />
                You&apos;re building momentum
              </p>
            </section>

            {/* Summary cards */}
            <section
              aria-label="Workout summary"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              {stats.map((stat) => (
                <article
                  key={stat.label}
                  className="rounded-2xl border border-app-border bg-app-surface p-5 transition hover:border-slate-600"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-text-muted">{stat.label}</p>
                    <span
                      className={`flex size-10 items-center justify-center rounded-xl text-xl ${stat.iconBg} ${stat.color}`}
                      aria-hidden="true"
                    >
                      {stat.icon}
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-bold tracking-tight">
                    {stat.value}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`font-semibold ${stat.color}`}>
                      {stat.change}
                    </span>
                    <span className="text-text-subtle">{stat.detail}</span>
                  </div>
                </article>
              ))}
            </section>

            {/* Activity and goal panels */}
            <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <article className="rounded-2xl border border-app-border bg-app-surface p-5 sm:p-6 xl:col-span-2">
                <SectionHeading
                  title="Weekly Activity"
                  action="View history →"
                />
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-3xl font-bold">4.8 hours</p>
                    <p className="mt-1 text-sm text-text-muted">
                      Training time this week
                    </p>
                  </div>
                  <span className="rounded-lg bg-accent-emerald/10 px-3 py-2 text-xs font-semibold text-accent-emerald">
                    +14.5% this week
                  </span>
                </div>

                <div
                  className="grid h-44 grid-cols-7 items-end gap-3 sm:h-52 sm:gap-5"
                  role="img"
                  aria-label="Illustrative weekly activity chart, Monday through Sunday"
                >
                  {weeklyActivity.map((item, index) => (
                    <div
                      key={item.day}
                      className="flex h-full flex-col items-center justify-end gap-3"
                    >
                      <div className="flex h-full w-full items-end justify-center">
                        <div
                          className={`w-full max-w-10 rounded-t-lg transition-opacity ${
                            index === 3
                              ? "bg-accent-cyan"
                              : "bg-accent-cyan/25 hover:bg-accent-cyan/50"
                          }`}
                          style={{ height: `${item.value}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs ${
                          index === 3
                            ? "font-semibold text-accent-cyan"
                            : "text-text-subtle"
                        }`}
                      >
                        {item.day}
                      </span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-app-border bg-app-surface p-5 sm:p-6">
                <SectionHeading title="Weekly Goal" />
                <div className="flex flex-col items-center py-3">
                  <div
                    className="relative flex size-40 items-center justify-center rounded-full"
                    style={{
                      background:
                        "conic-gradient(#22d3ee 0% 80%, #26364a 80% 100%)",
                    }}
                    role="img"
                    aria-label="Weekly goal 80 percent complete"
                  >
                    <div className="flex size-32 flex-col items-center justify-center rounded-full bg-app-surface">
                      <span className="text-3xl font-bold">80%</span>
                      <span className="mt-1 text-xs text-text-muted">
                        Completed
                      </span>
                    </div>
                  </div>
                  <p className="mt-5 text-center text-sm text-text-muted">
                    You&apos;ve completed{" "}
                    <span className="font-semibold text-text-primary">
                      4 of 5 workouts
                    </span>{" "}
                    this week.
                  </p>
                  <div className="mt-5 w-full rounded-xl bg-accent-emerald/10 p-3 text-center text-sm text-accent-emerald">
                    One more workout to hit your goal!
                  </div>
                </div>
              </article>
            </section>

            {/* Recent workouts */}
            <section id="recent-workouts">
              <SectionHeading
                title="Recent Workouts"
                action="View all →"
              />
              <RecentWorkouts />
            </section>

            {/* Progress highlight */}
            <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="p-6 sm:p-8">
                  <span className="inline-flex rounded-lg bg-accent-violet/10 px-3 py-1.5 text-xs font-semibold text-accent-violet">
                    YOUR PROGRESS
                  </span>
                  <h2 className="mt-4 text-xl font-bold sm:text-2xl">
                    Consistency beats perfection.
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-text-muted">
                    Keep showing up, tracking your workouts, and building
                    habits. Small improvements add up over time.
                  </p>
                  <a
                    href="#recent-workouts"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent-cyan hover:text-cyan-200"
                  >
                    Review recent workouts <span aria-hidden="true">→</span>
                  </a>
                </div>
                <div className="flex min-h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-accent-cyan/10 via-accent-violet/10 to-accent-emerald/10 p-8">
                  <div className="grid size-36 place-items-center rounded-full border border-accent-cyan/30">
                    <div className="grid size-28 place-items-center rounded-full border border-accent-violet/40">
                      <div className="grid size-20 place-items-center rounded-full bg-app-raised text-4xl text-accent-cyan">
                        ↗
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <footer className="border-t border-app-border py-5 text-center text-xs text-text-subtle">
              WorkoutTrack · Built one workout at a time.
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
