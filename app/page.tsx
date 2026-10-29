import { Suspense } from "react";
import RecentWorkouts from "@/app/components/RecentWorkouts";

import { auth } from "@/auth";

import { prisma } from "@/app/lib/prisma";

const navigation = [

  { label: "Dashboard", icon: "◫", active: true },

  { label: "My Workouts", icon: "▤", active: false },

  { label: "Exercises", icon: "◈", active: false },

  { label: "Progress", icon: "↗", active: false },

];

function SectionHeading({ title, action,}: {
  title: string;
  action?: string;
}) {
return (

    <div className="mb-5 flex items-center justify-between gap-3">

      <h2 className="text-base font-semibold text-text-primary sm:text-lg">
        {title}
      </h2>

      {action && (
        <button type="button" className="text-sm font-medium text-accent-cyan transition hover:text-cyan-200">
          {action}
        </button>
      )}
    </div>
  );
}

export async function DashboardContent() {
  const session = await auth();

  const userId = session?.user?.id;

  const workouts = userId ? await prisma.workout.findMany({
        where: { userId },
        select: { durationMinutes: true, date: true },
      }) : [];

      const workoutDays = new Set(
        workouts.map((workout) => {
          const date = new Date(workout.date);
          return date.toISOString().slice(0, 10);
        }),
      );

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const todayKey = today.toISOString().slice(0, 10);

      const yesterday = new Date(today);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);

      const yesterdayKey = yesterday.toISOString().slice(0, 10);

      let currentStreak = 0;

      if (workoutDays.has(todayKey) || workoutDays.has(yesterdayKey)) {
        const streakDate = new Date(
          workoutDays.has(todayKey) ? today : yesterday,
        );

        while (workoutDays.has(streakDate.toISOString().slice(0, 10))) {
          currentStreak++;
          streakDate.setUTCDate(streakDate.getUTCDate() - 1);
        }
      }

      const weeklyGoal = 5;

      const now = new Date();
      const dayOfWeek = now.getUTCDay();
      const daysSinceMonday = (dayOfWeek + 6) % 7;

      const weekStart = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - daysSinceMonday,
        ),
      );

      const workoutsThisWeek = workouts.filter((workout) => {
        const workoutDate = new Date(workout.date);

        return workoutDate >= weekStart && workoutDate <= now;
      }).length;

      const weeklyGoalProgress = Math.min(
        Math.round((workoutsThisWeek / weeklyGoal) * 100),
        100,
      );


    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const todayIndex = (new Date().getDay() + 6) % 7;

const dailyTrainingMinutes = dayLabels.map((_, index) => {
  const dayStart = new Date(weekStart);
  dayStart.setUTCDate(dayStart.getUTCDate() + index);

  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  return workouts.reduce((total, workout) => {
    const workoutDate = new Date(workout.date);

    if (workoutDate >= dayStart && workoutDate < dayEnd) {
      return total + (workout.durationMinutes ?? 0);
    }

    return total;
  }, 0);
});

  const busiestDayMinutes = Math.max(...dailyTrainingMinutes, 0);

  const weeklyActivity = dayLabels.map((day, index) => ({
    day,
    value:
      busiestDayMinutes === 0
        ? 0
        : Math.round(
            (dailyTrainingMinutes[index] / busiestDayMinutes) * 100,
          ),
  }));

      const weeklyTrainingMinutes = dailyTrainingMinutes.reduce(
      (total, minutes) => total + minutes,
      0,
    );

      const weeklyTrainingHours = (weeklyTrainingMinutes / 60).toFixed(1);


      const lastWeekStart = new Date(weekStart);
      lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7);

      const lastWeekEnd = new Date(weekStart);

      const lastWeekTrainingMinutes = workouts.reduce((total, workout) => {
        const workoutDate = new Date(workout.date);

        if (workoutDate >= lastWeekStart && workoutDate < lastWeekEnd) {
          return total + (workout.durationMinutes ?? 0);
        }

        return total;
      }, 0);

      const weeklyChange =
        lastWeekTrainingMinutes === 0
          ? null
          : Math.round(
              ((weeklyTrainingMinutes - lastWeekTrainingMinutes) /
                lastWeekTrainingMinutes) *
                100,
            );

      const weeklyChangeLabel =
        weeklyChange === null
          ? "First week"
          : weeklyChange > 0
            ? `+${weeklyChange}% this week`
            : weeklyChange < 0
              ? `${weeklyChange}% this week`
              : "No change";



      const totalWorkouts = workouts.length;
      const totalTrainingMinutes = workouts.reduce(
        (total, workout) => total + (workout.durationMinutes ?? 0),
        0,
      );
      const totalTrainingHours = Math.round((totalTrainingMinutes / 60) * 10) / 10;

      const stats = [
        {
          label: "Total Workouts",
          value: String(totalWorkouts),
          change: "",
          detail: "all recorded workouts",
          icon: "▤",
          color: "text-accent-cyan",
          iconBg: "bg-accent-cyan/10",
        },
        {
          label: "Total Training Time",
          value: `${totalTrainingHours}hrs`,
          change: "",
          detail: "recorded duration",
          icon: "◷",
          color: "text-accent-violet",
          iconBg: "bg-accent-violet/10",
        },
        {
          label: "Current Streak",
          value: `${currentStreak} ${currentStreak === 1 ? "day" : "days"}`,
          change: currentStreak > 0 ? "On track" : "Start today",
          detail: currentStreak > 0 ? "Keep it going!" : "Log a workout to begin",
          icon: "✳",
          color: "text-accent-emerald",
          iconBg: "bg-accent-emerald/10",
        },
        {
          label: "Weekly Goal",
          value: `${Math.min(workoutsThisWeek, weeklyGoal)} / ${weeklyGoal}`,
          change: `${weeklyGoalProgress}%`,
          detail: "workouts completed",
          icon: "◎",
          color: "text-accent-cyan",
          iconBg: "bg-accent-cyan/10",
        },
      ];

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

          <nav _aria-label_="Main navigation" className="space-y-1">

            {navigation.map((item) => (

              <a key={item.label} href="#" _aria-current_={item.active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${ item.active ? "bg-accent-cyan/10 text-accent-cyan" : "text-text-muted hover:bg-app-raised hover:text-text-primary"}`}>
                <span className="w-6 text-center text-lg" _aria-hidden_="true">
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

            <span className="ml-auto text-text-muted" _aria-hidden_="true">

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

                  <span _aria-hidden_="true" className="text-text-muted">

                    ⌕

                  </span>

                  <input type="search" placeholder="Search workouts..." _aria-label_="Search workouts" className="w-40 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-subtle"/>
                  <span className="text-xs text-text-subtle">⌘ K</span>
                </label>

                <button type="button" _aria-label_="Notifications" className="relative flex size-10 items-center justify-center rounded-xl border border-app-border bg-app-surface text-lg text-text-muted transition hover:text-text-primary">
                  ♧
                  <span className="absolute right-2 top-2 size-2 rounded-full bg-accent-cyan" />
                </button>

                <a href="#recent-workouts" className="hidden items-center gap-2 rounded-xl bg-accent-cyan px-4 py-2.5 text-sm font-semibold text-app-bg transition hover:bg-cyan-300 sm:inline-flex">
                  <span _aria-hidden_="true">+</span>
                  New Workout
                </a>

              </div>
            </div>

            <nav _aria-label_="Mobile navigation" className="mx-auto mt-4 flex max-w-7xl gap-2 overflow-x-auto lg:hidden">
              {navigation.map((item) => (
                <a key={item.label} href="#" _aria-current_={item.active ? "page" : undefined} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium sm:text-sm ${ item.active ? "bg-accent-cyan/10 text-accent-cyan" : "text-text-muted hover:bg-app-raised"}`}>
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

            <section _aria-label_="Workout summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

              {stats.map((stat) => (

                <article key={stat.label} className="rounded-2xl border border-app-border bg-app-surface p-5 transition hover:border-slate-600">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-text-muted">{stat.label}</p>
                    <span className={`flex size-10 items-center justify-center rounded-xl text-xl ${stat.iconBg} ${stat.color}`} _aria-hidden_="true">
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

                  {/* Weekly Goal progress bar */}
                    {stat.label === "Weekly Goal" && (
                      <div className="mt-4">
                        <div
                          className="h-2 w-full overflow-hidden rounded-full bg-slate-700"
                          role="progressbar"
                          aria-label="Weekly workout goal progress"
                          aria-valuenow={weeklyGoalProgress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className="h-full rounded-full bg-accent-cyan transition-all duration-300"
                            style={{ width: `${weeklyGoalProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                </article>

              ))}

            </section>

            {/* Activity and goal panels */}

            <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">

              <article className="rounded-2xl border border-app-border bg-app-surface p-5 sm:p-6 xl:col-span-2">

                <SectionHeading title="Weekly Activity" action="View history →"/>

                <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-3xl font-bold">{weeklyTrainingHours} hours</p>
                    <p className="mt-1 text-sm text-text-muted">
                      Training time this week
                    </p>
                  </div>

                  
                      <span
                        className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                          weeklyChange !== null && weeklyChange < 0
                            ? "bg-red-500/10 text-red-400"
                            : "bg-accent-emerald/10 text-accent-emerald"
                        }`}
                      >
                        {weeklyChangeLabel}
                      </span>

                </div>

                <div className="grid h-44 grid-cols-7 items-end gap-3 sm:h-52 sm:gap-5" role="img" _aria-label_="Illustrative weekly activity chart, Monday through Sunday">

                  {weeklyActivity.map((item, index) => (

                    <div key={item.day} className="flex h-full flex-col items-center justify-end gap-3">
                      <div className="flex h-full w-full items-end justify-center">
                        <div className={`w-full max-w-10 rounded-t-lg transition-opacity ${ index === todayIndex ? "bg-accent-cyan" : "bg-accent-cyan/25 hover:bg-accent-cyan/50"}`} style={{ height: `${item.value}%` }}/>
                      </div>
                      <span className={`text-xs ${ index === todayIndex ? "font-semibold text-accent-cyan" : "text-text-subtle"}`}>
                        {item.day}
                      </span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-app-border bg-app-surface p-5 sm:p-6">

                <SectionHeading title="Weekly Goal" />

                <div className="flex flex-col items-center py-3">

                  <div className="relative flex size-40 items-center justify-center rounded-full" style={{ background: "conic-gradient(#22d3ee 0% 80%, #26364a 80% 100%)", }} role="img" _aria-label_="Weekly goal 80 percent complete">
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
              <SectionHeading title="Recent Workouts" action="View all →"/>
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
                     Keep showing up, tracking your workouts, and building habits. Small improvements add up over time.
                  </p>
                  <a href="#recent-workouts" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent-cyan hover:text-cyan-200">
                    Review recent workouts <span _aria-hidden_="true">→</span>
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

export default function Home() {
  return (
    <Suspense fallback={<div className="p-8">Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
