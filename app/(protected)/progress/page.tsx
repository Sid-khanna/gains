"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getTopWeight,
  getTotalVolume,
} from "@/lib/utils";

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

function formatFullDate(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

    const y =
      height -
      padding -
      ((point.value - minValue) / range) * (height - padding * 2);

    return { ...point, x, y };
  });

  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-black">
      <h2 className="text-lg font-semibold">{title}</h2>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full">
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

  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseRow[]>([]);
  const [workoutEntries, setWorkoutEntries] = useState<WorkoutEntryRow[]>([]);
  const [bodyEntries, setBodyEntries] = useState<BodyEntryRow[]>([]);
  const [dietEntries, setDietEntries] = useState<DietEntryRow[]>([]);

  const [selectedExercise, setSelectedExercise] = useState("");
  const [progressType, setProgressType] = useState<
    "exercise" | "body" | "diet" | "muscle_volume"
  >("exercise");

  const [exerciseMetric, setExerciseMetric] = useState<"top_weight" | "volume">(
    "top_weight"
  );

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const [exercisesResponse, workoutsResponse, bodyResponse, dietResponse] =
        await Promise.all([
          supabase
            .from("exercises")
            .select("id, name, muscle_group")
            .order("name"),

          supabase
            .from("workout_entries")
            .select("id, date, exercise_name, muscle_group, sets_data")
            .eq("user_id", user.id)
            .order("date", { ascending: true }),

          supabase
            .from("body_entries")
            .select("id, date, weight, waist, notes")
            .eq("user_id", user.id)
            .order("date", { ascending: true }),

          supabase
            .from("diet_entries")
            .select("id, date, calories, protein, carbs, fat")
            .eq("user_id", user.id)
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

    loadData();
  }, [supabase]);

  const selectedExerciseEntries = useMemo(() => {
    return workoutEntries.filter(
      (entry) => entry.exercise_name === selectedExercise
    );
  }, [workoutEntries, selectedExercise]);

  const exerciseChartData = useMemo(() => {
    return selectedExerciseEntries.map((entry) => ({
      label: formatShortDate(entry.date),
      value:
        exerciseMetric === "top_weight"
          ? getTopWeight(entry.sets_data)
          : getTotalVolume(entry.sets_data),
      sublabel: formatFullDate(entry.date),
    }));
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

  const caloriesChartData = useMemo(() => {
    return dietEntries
      .filter((entry) => entry.calories !== null)
      .map((entry) => ({
        label: formatShortDate(entry.date),
        value: Number(entry.calories),
        sublabel: formatFullDate(entry.date),
      }));
  }, [dietEntries]);

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

          <button
            type="button"
            onClick={() => setProgressType("muscle_volume")}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              progressType === "muscle_volume"
                ? "bg-black text-white"
                : "border border-zinc-200 bg-white text-black"
            }`}
          >
            Volume
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
            title={`${selectedExercise || "Exercise"} · ${
              exerciseMetric === "top_weight" ? "Top Weight" : "Total Volume"
            }`}
            data={exerciseChartData}
          />
        </div>
      ) : null}

      {progressType === "body" ? (
        <SimpleLineChart
          title="Bodyweight"
          data={bodyweightChartData}
          valueSuffix=" kg"
        />
      ) : null}

      {progressType === "diet" ? (
        <SimpleLineChart title="Calories" data={caloriesChartData} />
      ) : null}

      {progressType === "muscle_volume" ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-black">
          <h2 className="text-lg font-semibold">Volume</h2>
          <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">
            Muscle volume view can be reconnected after auth filtering.
          </div>
        </section>
      ) : null}
    </div>
  );
}