"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ExerciseRow = {
  id: string;
  name: string;
  muscle_group: string;
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

type BodyEntryRow = {
  id: string;
  date: string;
  weight: number | null;
  waist: number | null;
  notes: string | null;
};

type DietEntryRow = {
  id: string;
  date: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

type ChartPoint = {
  label: string;
  value: number;
  sublabel?: string;
};

function formatShortDate(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatMonthLabel(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function formatFullDate(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getWeekStart(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

function getMonthStart(dateString: string) {
  return `${dateString.slice(0, 7)}-01`;
}

function getTopWeight(setsData: LoggedSet[] | null) {
  if (!setsData || setsData.length === 0) return 0;
  return setsData.reduce((max, set) => Math.max(max, set.weight ?? 0), 0);
}

function getTotalVolume(setsData: LoggedSet[] | null) {
  if (!setsData || setsData.length === 0) return 0;
  return setsData.reduce((sum, set) => {
    const weight = set.weight ?? 0;
    const reps = set.reps ?? 0;
    return sum + weight * reps;
  }, 0);
}

function SimpleLineChart({
  title,
  data,
  valueSuffix = "",
}: {
  title: string;
  data: ChartPoint[];
  valueSuffix?: string;
}) {
  if (data.length === 0) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-black">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">
          No data yet.
        </div>
      </section>
    );
  }

  const width = 700;
  const height = 260;
  const padding = 28;
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = Math.max(maxValue - minValue, 1);

  const points = data.map((point, index) => {
    const x =
      data.length === 1
        ? width / 2
        : padding + (index * (width - padding * 2)) / (data.length - 1);

    const normalizedY = (point.value - minValue) / range;
    const y = height - padding - normalizedY * (height - padding * 2);

    return { ...point, x, y };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-black">
      <h2 className="text-lg font-semibold">{title}</h2>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full">
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="#d4d4d8"
            strokeWidth="1"
          />
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            stroke="#d4d4d8"
            strokeWidth="1"
          />

          <polyline
            fill="none"
            stroke="black"
            strokeWidth="3"
            points={polylinePoints}
          />

          {points.map((point, index) => (
            <g key={`${point.label}-${index}`}>
              <circle cx={point.x} cy={point.y} r="4" fill="black" />
              <text
                x={point.x}
                y={point.y - 10}
                textAnchor="middle"
                fontSize="11"
                fill="#3f3f46"
              >
                {point.value}
                {valueSuffix}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.map((point, index) => (
          <div key={`${point.label}-${index}`} className="rounded-xl bg-zinc-50 p-4">
            <p className="text-sm text-zinc-500">{point.label}</p>
            <p className="mt-1 text-xl font-semibold">
              {point.value}
              {valueSuffix}
            </p>
            {point.sublabel ? (
              <p className="mt-1 text-sm text-zinc-500">{point.sublabel}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ProgressPage() {
  const supabase = createClient();

  const [progressType, setProgressType] = useState<"exercise" | "body" | "diet">(
    "exercise"
  );
  const [exerciseMetric, setExerciseMetric] = useState<"top_weight" | "volume">(
    "top_weight"
  );
  const [dietMetric, setDietMetric] = useState<"calories" | "protein" | "carbs" | "fat">(
    "calories"
  );
  const [dietGranularity, setDietGranularity] = useState<"daily" | "weekly" | "monthly">(
    "daily"
  );

  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseRow[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntryRow[]>([]);
  const [bodyEntries, setBodyEntries] = useState<BodyEntryRow[]>([]);
  const [dietEntries, setDietEntries] = useState<DietEntryRow[]>([]);

  const [selectedExercise, setSelectedExercise] = useState("");

  useEffect(() => {
    async function loadAllData() {
      const [
        exercisesResponse,
        workoutsResponse,
        bodyResponse,
        dietResponse,
      ] = await Promise.all([
        supabase.from("exercises").select("id, name, muscle_group").order("name"),
        supabase
          .from("workout_entries")
          .select("id, date, exercise_name, muscle_group, sets_data")
          .order("date", { ascending: true }),
        supabase
          .from("body_entries")
          .select("id, date, weight, waist, notes")
          .order("date", { ascending: true }),
        supabase
          .from("diet_entries")
          .select("id, date, calories, protein, carbs, fat")
          .order("date", { ascending: true }),
      ]);

      if (!exercisesResponse.error && exercisesResponse.data) {
        const exercises = exercisesResponse.data as ExerciseRow[];
        setExerciseLibrary(exercises);
        if (exercises.length > 0) {
          setSelectedExercise((prev) => prev || exercises[0].name);
        }
      }

      if (!workoutsResponse.error && workoutsResponse.data) {
        setWorkoutEntries(workoutsResponse.data as WorkoutEntryRow[]);
      }

      if (!bodyResponse.error && bodyResponse.data) {
        setBodyEntries(bodyResponse.data as BodyEntryRow[]);
      }

      if (!dietResponse.error && dietResponse.data) {
        setDietEntries(dietResponse.data as DietEntryRow[]);
      }
    }

    loadAllData();
  }, [supabase]);

  const selectedExerciseEntries = useMemo(() => {
    return workoutEntries.filter(
      (entry) => entry.exercise_name === selectedExercise
    );
  }, [workoutEntries, selectedExercise]);

  const exerciseChartData = useMemo(() => {
    return selectedExerciseEntries.map((entry) => {
      const value =
        exerciseMetric === "top_weight"
          ? getTopWeight(entry.sets_data)
          : getTotalVolume(entry.sets_data);

      return {
        label: formatShortDate(entry.date),
        value,
        sublabel: formatFullDate(entry.date),
      };
    });
  }, [selectedExerciseEntries, exerciseMetric]);

  const bodyweightChartData = useMemo(() => {
    return bodyEntries
      .filter((entry) => entry.weight !== null)
      .map((entry) => ({
        label: formatShortDate(entry.date),
        value: Number(entry.weight),
        sublabel: formatFullDate(entry.date),
      }));
  }, [bodyEntries]);

  const waistChartData = useMemo(() => {
    return bodyEntries
      .filter((entry) => entry.waist !== null)
      .map((entry) => ({
        label: formatShortDate(entry.date),
        value: Number(entry.waist),
        sublabel: formatFullDate(entry.date),
      }));
  }, [bodyEntries]);

  const dietChartData = useMemo(() => {
    if (dietGranularity === "daily") {
      return dietEntries
        .map((entry) => ({
          date: entry.date,
          value: Number(entry[dietMetric] ?? 0),
        }))
        .filter((entry) => entry.value > 0)
        .map((entry) => ({
          label: formatShortDate(entry.date),
          value: entry.value,
          sublabel: formatFullDate(entry.date),
        }));
    }

    if (dietGranularity === "weekly") {
      const grouped = new Map<string, number[]>();

      dietEntries.forEach((entry) => {
        const weekStart = getWeekStart(entry.date);
        const value = Number(entry[dietMetric] ?? 0);
        if (!grouped.has(weekStart)) grouped.set(weekStart, []);
        grouped.get(weekStart)!.push(value);
      });

      return Array.from(grouped.entries()).map(([weekStart, values]) => ({
        label: formatShortDate(weekStart),
        value: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
        sublabel: `Week of ${formatShortDate(weekStart)}`,
      }));
    }

    const grouped = new Map<string, number[]>();

    dietEntries.forEach((entry) => {
      const monthStart = getMonthStart(entry.date);
      const value = Number(entry[dietMetric] ?? 0);
      if (!grouped.has(monthStart)) grouped.set(monthStart, []);
      grouped.get(monthStart)!.push(value);
    });

    return Array.from(grouped.entries()).map(([monthStart, values]) => ({
      label: formatMonthLabel(monthStart),
      value: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      sublabel: `Month starting ${formatShortDate(monthStart)}`,
    }));
  }, [dietEntries, dietMetric, dietGranularity]);

  const exerciseMetricLabel =
    exerciseMetric === "top_weight" ? "Top Weight" : "Total Volume";

  return (
    <div className="space-y-6 text-black">
      <div>
        <p className="text-sm text-zinc-500">Progress Tracking</p>
        <h1 className="text-3xl font-semibold tracking-tight">Progress</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Review exercise, body, and diet trends over time.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-black">
        <h2 className="text-lg font-semibold">View</h2>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setProgressType("exercise")}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              progressType === "exercise"
                ? "bg-black text-white"
                : "border border-zinc-200 bg-white text-black"
            }`}
          >
            Exercise
          </button>

          <button
            type="button"
            onClick={() => setProgressType("body")}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              progressType === "body"
                ? "bg-black text-white"
                : "border border-zinc-200 bg-white text-black"
            }`}
          >
            Body
          </button>

          <button
            type="button"
            onClick={() => setProgressType("diet")}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              progressType === "diet"
                ? "bg-black text-white"
                : "border border-zinc-200 bg-white text-black"
            }`}
          >
            Diet
          </button>
        </div>
      </section>

      {progressType === "exercise" ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-black">
            <h2 className="text-lg font-semibold">Exercise Filters</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-zinc-600">Exercise</label>
                <select
                  value={selectedExercise}
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
                >
                  {exerciseLibrary.map((exercise) => (
                    <option key={exercise.id} value={exercise.name}>
                      {exercise.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-zinc-600">Metric</label>
                <select
                  value={exerciseMetric}
                  onChange={(e) =>
                    setExerciseMetric(e.target.value as "top_weight" | "volume")
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
                >
                  <option value="top_weight">Top Weight</option>
                  <option value="volume">Total Volume</option>
                </select>
              </div>
            </div>
          </section>

          <SimpleLineChart
            title={`${selectedExercise || "Exercise"} · ${exerciseMetricLabel}`}
            data={exerciseChartData}
            valueSuffix={exerciseMetric === "top_weight" ? "" : ""}
          />

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-black">
            <h2 className="text-lg font-semibold">Session History</h2>

            <div className="mt-4 space-y-3">
              {selectedExerciseEntries.length > 0 ? (
                selectedExerciseEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-zinc-200 bg-white p-4"
                  >
                    <p className="font-medium">{formatFullDate(entry.date)}</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Top Weight: {getTopWeight(entry.sets_data)} · Total Volume:{" "}
                      {getTotalVolume(entry.sets_data)}
                    </p>

                    <div className="mt-2 space-y-1 text-sm text-zinc-700">
                      {(entry.sets_data || []).map((set, index) => (
                        <p key={index}>
                          Set {index + 1}: {set.weight ?? "—"} × {set.reps ?? "—"}
                        </p>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">
                  No entries yet for this exercise.
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {progressType === "body" ? (
        <div className="space-y-6">
          <SimpleLineChart title="Bodyweight" data={bodyweightChartData} valueSuffix=" kg" />
          <SimpleLineChart title="Waist" data={waistChartData} />
        </div>
      ) : null}

      {progressType === "diet" ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-black">
            <h2 className="text-lg font-semibold">Diet Filters</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-zinc-600">Metric</label>
                <select
                  value={dietMetric}
                  onChange={(e) =>
                    setDietMetric(
                      e.target.value as "calories" | "protein" | "carbs" | "fat"
                    )
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
                >
                  <option value="calories">Calories</option>
                  <option value="protein">Protein</option>
                  <option value="carbs">Carbs</option>
                  <option value="fat">Fat</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-zinc-600">Granularity</label>
                <select
                  value={dietGranularity}
                  onChange={(e) =>
                    setDietGranularity(
                      e.target.value as "daily" | "weekly" | "monthly"
                    )
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly Average</option>
                  <option value="monthly">Monthly Average</option>
                </select>
              </div>
            </div>
          </section>

          <SimpleLineChart
            title={`${dietMetric.charAt(0).toUpperCase() + dietMetric.slice(1)} · ${
              dietGranularity === "daily"
                ? "Daily"
                : dietGranularity === "weekly"
                ? "Weekly Average"
                : "Monthly Average"
            }`}
            data={dietChartData}
            valueSuffix={dietMetric === "calories" ? "" : "g"}
          />
        </div>
      ) : null}
    </div>
  );
}