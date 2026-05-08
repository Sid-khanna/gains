"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getTopWeight,
  getTotalVolume,
  getWeekStartISO,
  getProgressDelta,
  detectPlateau,
  computeWeeklyMuscleVolume,
} from "@/lib/utils";

/* -------------------- TYPES -------------------- */

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

/* -------------------- HELPERS -------------------- */

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

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function getMonthStart(dateString: string) {
  return `${dateString.slice(0, 7)}-01`;
}

/* -------------------- CHART -------------------- */

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

  const points = data.map((p, i) => {
    const x =
      data.length === 1
        ? width / 2
        : padding + (i * (width - padding * 2)) / (data.length - 1);

    const y =
      height -
      padding -
      ((p.value - minValue) / range) * (height - padding * 2);

    return { ...p, x, y };
  });

  const poly = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-black">
      <h2 className="text-lg font-semibold">{title}</h2>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full">
          <polyline
            fill="none"
            stroke="black"
            strokeWidth="3"
            points={poly}
          />

          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4" fill="black" />
              <text
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                fontSize="11"
                fill="#3f3f46"
              >
                {p.value}
                {valueSuffix}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}

/* -------------------- PAGE -------------------- */

export default function ProgressPage() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);

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

  const [dietMetric, setDietMetric] = useState<
    "calories" | "protein" | "carbs" | "fat"
  >("calories");

  const [dietGranularity, setDietGranularity] = useState<
    "daily" | "weekly" | "monthly"
  >("daily");

  /* -------------------- GET USER -------------------- */

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) setUserId(user.id);
    }

    getUser();
  }, [supabase]);

  /* -------------------- LOAD DATA -------------------- */

  useEffect(() => {
    async function load() {
      if (!userId) return;

      const [ex, wo, body, diet] = await Promise.all([
        supabase
          .from("exercises")
          .select("*")
          .eq("user_id", userId)
          .order("name"),

        supabase
          .from("workout_entries")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: true }),

        supabase
          .from("body_entries")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: true }),

        supabase
          .from("diet_entries")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: true }),
      ]);

      if (ex.data) setExerciseLibrary(ex.data);
      if (wo.data) setWorkoutEntries(wo.data);
      if (body.data) setBodyEntries(body.data);
      if (diet.data) setDietEntries(diet.data);

      if (ex.data?.length && !selectedExercise) {
        setSelectedExercise(ex.data[0].name);
      }
    }

    load();
  }, [supabase, userId]);

  /* -------------------- REST OF YOUR LOGIC (UNCHANGED) -------------------- */

  const selectedExerciseEntries = useMemo(() => {
    return workoutEntries.filter(
      (e) => e.exercise_name === selectedExercise
    );
  }, [workoutEntries, selectedExercise]);

  const exerciseChartData = useMemo(() => {
    return selectedExerciseEntries.map((e) => ({
      label: formatShortDate(e.date),
      value:
        exerciseMetric === "top_weight"
          ? getTopWeight(e.sets_data)
          : getTotalVolume(e.sets_data),
      sublabel: formatFullDate(e.date),
    }));
  }, [selectedExerciseEntries, exerciseMetric]);

  /* -------------------- UI -------------------- */

  return (
    <div className="space-y-6 text-black">
      <h1 className="text-3xl font-semibold">Progress</h1>

      <section className="flex gap-3">
        <button onClick={() => setProgressType("exercise")}>Exercise</button>
        <button onClick={() => setProgressType("body")}>Body</button>
        <button onClick={() => setProgressType("diet")}>Diet</button>
        <button onClick={() => setProgressType("muscle_volume")}>
          Volume
        </button>
      </section>

      {progressType === "exercise" && (
        <SimpleLineChart
          title="Exercise Progress"
          data={exerciseChartData}
        />
      )}
    </div>
  );
}