"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type WeeklySplitRow = {
  id: string;
  day_of_week: string;
  label: string;
  targets: Record<string, number> | null;
};

type LoggedSet = {
  weight: number | null;
  reps: number | null;
};

type WorkoutEntryRow = {
  id: string;
  date: string;
  exercise_name: string;
  muscle_group: string;
  sets_data: LoggedSet[] | null;
};

type DietEntryRow = {
  id: string;
  date: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

type BodyEntryRow = {
  id: string;
  date: string;
  weight: number | null;
  waist: number | null;
  notes: string | null;
};

type AverageStats = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  loggedDays: number;
};

function getTodayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDayName(dateString: string) {
  if (!dateString) return "";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
  });
}

function formatLongDate(dateString: string) {
  if (!dateString) return "Loading...";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(dateString: string) {
  if (!dateString) return "";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getStartOfWeek(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

function calculateAverages(entries: DietEntryRow[]): AverageStats {
  if (entries.length === 0) {
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      loggedDays: 0,
    };
  }

  const totals = entries.reduce(
    (acc, entry) => {
      acc.calories += entry.calories ?? 0;
      acc.protein += entry.protein ?? 0;
      acc.carbs += entry.carbs ?? 0;
      acc.fat += entry.fat ?? 0;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    calories: Math.round(totals.calories / entries.length),
    protein: Math.round(totals.protein / entries.length),
    carbs: Math.round(totals.carbs / entries.length),
    fat: Math.round(totals.fat / entries.length),
    loggedDays: entries.length,
  };
}

function formatSetsInline(setsData: LoggedSet[] | null) {
  if (!setsData || setsData.length === 0) return "No sets logged";
  return setsData
    .map((set) => `${set.weight ?? "—"} × ${set.reps ?? "—"}`)
    .join(" · ");
}

export default function DashboardPage() {
  const supabase = createClient();

  const [today, setToday] = useState("");
  const [weeklySplit, setWeeklySplit] = useState<WeeklySplitRow[]>([]);
  const [todayEntries, setTodayEntries] = useState<WorkoutEntryRow[]>([]);
  const [todayDiet, setTodayDiet] = useState<DietEntryRow | null>(null);
  const [latestBody, setLatestBody] = useState<BodyEntryRow | null>(null);
  const [weekDietAverage, setWeekDietAverage] = useState<AverageStats>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    loggedDays: 0,
  });

  useEffect(() => {
    setToday(getTodayISO());
  }, []);

  useEffect(() => {
    if (!today) return;

    async function loadDashboardData() {
      const weekStart = getStartOfWeek(today);

      const [
        splitResponse,
        workoutResponse,
        dietTodayResponse,
        latestBodyResponse,
        weekDietResponse,
      ] = await Promise.all([
        supabase.from("weekly_split").select("id, day_of_week, label, targets"),
        supabase
          .from("workout_entries")
          .select("id, date, exercise_name, muscle_group, sets_data")
          .eq("date", today)
          .order("created_at", { ascending: true }),
        supabase
          .from("diet_entries")
          .select("id, date, calories, protein, carbs, fat")
          .eq("date", today)
          .maybeSingle(),
        supabase
          .from("body_entries")
          .select("id, date, weight, waist, notes")
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("diet_entries")
          .select("id, date, calories, protein, carbs, fat")
          .gte("date", weekStart)
          .lte("date", today)
          .order("date", { ascending: true }),
      ]);

      if (!splitResponse.error && splitResponse.data) {
        setWeeklySplit(splitResponse.data as WeeklySplitRow[]);
      }

      if (!workoutResponse.error && workoutResponse.data) {
        setTodayEntries(workoutResponse.data as WorkoutEntryRow[]);
      }

      if (!dietTodayResponse.error) {
        setTodayDiet((dietTodayResponse.data as DietEntryRow | null) ?? null);
      }

      if (!latestBodyResponse.error) {
        setLatestBody((latestBodyResponse.data as BodyEntryRow | null) ?? null);
      }

      if (!weekDietResponse.error && weekDietResponse.data) {
        setWeekDietAverage(calculateAverages(weekDietResponse.data as DietEntryRow[]));
      }
    }

    loadDashboardData();
  }, [today, supabase]);

  const todaysPlan = useMemo(() => {
    if (!today) {
      return {
        label: "Loading...",
        targets: {} as Record<string, number>,
      };
    }

    const dayName = getDayName(today);
    const matched = weeklySplit.find((row) => row.day_of_week === dayName);

    if (matched) {
      return {
        label: matched.label,
        targets: (matched.targets ?? {}) as Record<string, number>,
      };
    }

    return {
      label: "Custom Training Day",
      targets: {} as Record<string, number>,
    };
  }, [weeklySplit, today]);

  const progressCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    todayEntries.forEach((entry) => {
      counts[entry.muscle_group] = (counts[entry.muscle_group] || 0) + 1;
    });
    return counts;
  }, [todayEntries]);

  const todayCalories = todayDiet?.calories ?? 0;
  const todayProtein = todayDiet?.protein ?? 0;

  return (
    <div className="space-y-6 text-black">
      <div>
        <p className="text-sm text-zinc-500">Overview</p>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Your daily snapshot for training, nutrition, and body metrics.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Today</p>
          <p className="mt-1 text-xl font-semibold">
            {today ? formatLongDate(today) : "Loading..."}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Today’s Workout</p>
          <p className="mt-1 text-xl font-semibold">{todaysPlan.label}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Logged Exercises</p>
          <p className="mt-1 text-xl font-semibold">{todayEntries.length}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Latest Weight</p>
          <p className="mt-1 text-xl font-semibold">
            {latestBody?.weight ?? "—"}
            {latestBody?.weight !== null && latestBody?.weight !== undefined
              ? " kg"
              : ""}
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-lg font-semibold">Today’s Plan</h2>
            <p className="mt-1 text-sm text-zinc-500">{todaysPlan.label}</p>

            {Object.keys(todaysPlan.targets).length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {Object.entries(todaysPlan.targets).map(([group, count]) => (
                  <div key={group} className="rounded-xl bg-zinc-50 p-4">
                    <p className="text-sm text-zinc-500">{group}</p>
                    <p className="mt-1 text-xl font-semibold">
                      {progressCounts[group] || 0} / {Number(count)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">
                No target exercises set for today.
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Today’s Logged Exercises</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Entries saved for today.
                </p>
              </div>

              <Link
                href="/workout"
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium"
              >
                Open Workout
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {todayEntries.length > 0 ? (
                todayEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-zinc-200 bg-white p-4"
                  >
                    <p className="font-medium">{entry.exercise_name}</p>
                    <p className="mt-1 text-sm text-zinc-500">{entry.muscle_group}</p>
                    <p className="mt-2 text-sm text-zinc-700">
                      {formatSetsInline(entry.sets_data)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">
                  No exercises logged today yet.
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Today’s Nutrition</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Quick view of today’s macros.
                </p>
              </div>

              <Link
                href="/diet"
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium"
              >
                Open Diet
              </Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Calories</p>
                <p className="mt-1 text-xl font-semibold">{todayCalories}</p>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Protein</p>
                <p className="mt-1 text-xl font-semibold">{todayProtein}g</p>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Carbs</p>
                <p className="mt-1 text-xl font-semibold">
                  {todayDiet?.carbs ?? 0}g
                </p>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Fat</p>
                <p className="mt-1 text-xl font-semibold">
                  {todayDiet?.fat ?? 0}g
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-lg font-semibold">This Week’s Average Nutrition</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Based on {weekDietAverage.loggedDays} logged day
              {weekDietAverage.loggedDays === 1 ? "" : "s"} this week.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Avg Calories</p>
                <p className="mt-1 text-xl font-semibold">
                  {weekDietAverage.calories}
                </p>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Avg Protein</p>
                <p className="mt-1 text-xl font-semibold">
                  {weekDietAverage.protein}g
                </p>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Avg Carbs</p>
                <p className="mt-1 text-xl font-semibold">
                  {weekDietAverage.carbs}g
                </p>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Avg Fat</p>
                <p className="mt-1 text-xl font-semibold">
                  {weekDietAverage.fat}g
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Latest Body Entry</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Most recent saved body check-in.
                </p>
              </div>

              <Link
                href="/body"
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium"
              >
                Open Body
              </Link>
            </div>

            {latestBody ? (
              <div className="mt-4 rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">{formatShortDate(latestBody.date)}</p>
                <p className="mt-2 text-xl font-semibold">
                  {latestBody.weight ?? "—"} kg
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Waist: {latestBody.waist ?? "—"}
                </p>
                {latestBody.notes ? (
                  <p className="mt-2 text-sm text-zinc-600">{latestBody.notes}</p>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">
                No body entries saved yet.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}