"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type WeeklySplitRow = {
  id: string;
  day_of_week: string;
  label: string;
  targets: Record<string, number>;
};

type ExerciseRow = {
  id: string;
  name: string;
  muscle_group: string;
};

type WorkoutEntryRow = {
  id: string;
  date: string;
  exercise_name: string;
  muscle_group: string;
  weight: number | null;
  reps: number | null;
  sets: number;
};

const MUSCLE_GROUPS = [
  "Back",
  "Chest",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Legs",
  "Abs",
  "Other",
];

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
  if (!dateString) return "Loading date...";
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

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export default function WorkoutPage() {
  const supabase = createClient();

  const [selectedDate, setSelectedDate] = useState("");

  const [weeklySplit, setWeeklySplit] = useState<WeeklySplitRow[]>([]);
  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseRow[]>([]);
  const [entries, setEntries] = useState<WorkoutEntryRow[]>([]);

  const [exerciseName, setExerciseName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("Back");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [sets, setSets] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  const [previousEntry, setPreviousEntry] = useState<WorkoutEntryRow | null>(
    null,
  );

  const selectedDayName = useMemo(
    () => getDayName(selectedDate),
    [selectedDate],
  );

  const todaysPlan = useMemo(() => {
    return (
      weeklySplit.find((row) => row.day_of_week === selectedDayName) ?? {
        id: "fallback",
        day_of_week: selectedDayName,
        label: "Custom Training Day",
        targets: {},
      }
    );
  }, [weeklySplit, selectedDayName]);

  const progressCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach((entry) => {
      counts[entry.muscle_group] = (counts[entry.muscle_group] || 0) + 1;
    });
    return counts;
  }, [entries]);

  const existingExerciseMatch = useMemo(() => {
    const normalized = normalizeName(exerciseName);
    return exerciseLibrary.find(
      (exercise) => normalizeName(exercise.name) === normalized,
    );
  }, [exerciseName, exerciseLibrary]);

  useEffect(() => {
    async function loadWeeklySplit() {
      const { data, error } = await supabase
        .from("weekly_split")
        .select("id, day_of_week, label, targets")
        .order("day_of_week", { ascending: true });

      if (!error && data) {
        setWeeklySplit(data as WeeklySplitRow[]);
      }
    }

    loadWeeklySplit();
  }, [supabase]);

  useEffect(() => {
    setSelectedDate(getTodayISO());
  }, []);

  useEffect(() => {
    async function loadExerciseLibrary() {
      const { data, error } = await supabase
        .from("exercises")
        .select("id, name, muscle_group")
        .order("name", { ascending: true });

      if (!error && data) {
        setExerciseLibrary(data as ExerciseRow[]);
      }
    }

    loadExerciseLibrary();
  }, [supabase]);

  useEffect(() => {
    if (!selectedDate) return;

    async function loadEntriesForDate() {
      const { data, error } = await supabase
        .from("workout_entries")
        .select("id, date, exercise_name, muscle_group, weight, reps, sets")
        .eq("date", selectedDate)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setEntries(data as WorkoutEntryRow[]);
      }
    }

    loadEntriesForDate();
  }, [selectedDate, supabase]);

  useEffect(() => {
    if (!selectedDate) return;

    if (!existingExerciseMatch) {
      setPreviousEntry(null);
      return;
    }

    const exerciseNameToSearch = existingExerciseMatch.name;

    async function loadPreviousPerformance() {
      const { data, error } = await supabase
        .from("workout_entries")
        .select("id, date, exercise_name, muscle_group, weight, reps, sets")
        .eq("exercise_name", exerciseNameToSearch)
        .lt("date", selectedDate)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error) {
        setPreviousEntry((data as WorkoutEntryRow | null) ?? null);
      }
    }

    loadPreviousPerformance();
  }, [existingExerciseMatch, selectedDate, supabase]);

  useEffect(() => {
    if (existingExerciseMatch) {
      setMuscleGroup(existingExerciseMatch.muscle_group);
    }
  }, [existingExerciseMatch]);

  function handleStartEdit(entry: WorkoutEntryRow) {
    setEditingEntryId(entry.id);
    setExerciseName(entry.exercise_name);
    setMuscleGroup(entry.muscle_group);
    setWeight(entry.weight?.toString() ?? "");
    setReps(entry.reps?.toString() ?? "");
    setSets(entry.sets?.toString() ?? "");
    setError("");
  }

  function handleCancelEdit() {
    setEditingEntryId(null);
    setExerciseName("");
    setMuscleGroup("Back");
    setWeight("");
    setReps("");
    setSets("");
    setPreviousEntry(null);
    setError("");
  }

  async function refreshEntriesForDate(dateToLoad: string) {
    const { data, error } = await supabase
      .from("workout_entries")
      .select("id, date, exercise_name, muscle_group, weight, reps, sets")
      .eq("date", dateToLoad)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setEntries(data as WorkoutEntryRow[]);
    }
  }

  async function refreshExercises() {
    const { data, error } = await supabase
      .from("exercises")
      .select("id, name, muscle_group")
      .order("name", { ascending: true });

    if (!error && data) {
      setExerciseLibrary(data as ExerciseRow[]);
    }
  }

  async function handleAddExercise() {
    setError("");

    const trimmedName = exerciseName.trim();
    if (!trimmedName) {
      setError("Exercise name is required.");
      return;
    }

    if (!muscleGroup) {
      setError("Muscle group is required.");
      return;
    }

    if (!sets || Number(sets) <= 0) {
      setError("Sets must be greater than 0.");
      return;
    }

    const duplicateExists = entries.some(
      (entry) =>
        entry.id !== editingEntryId &&
        normalizeName(entry.exercise_name) === normalizeName(trimmedName)
    );

    if (duplicateExists) {
      setError("That exercise is already logged for this day.");
      return;
    }

    setLoading(true);

    try {
      let finalExerciseName = trimmedName;
      let finalMuscleGroup = muscleGroup;

      const matchingExercise = exerciseLibrary.find(
        (exercise) => normalizeName(exercise.name) === normalizeName(trimmedName)
      );

      if (!matchingExercise) {
        const { error: insertExerciseError } = await supabase.from("exercises").insert({
          name: trimmedName,
          muscle_group: muscleGroup,
        });

        if (insertExerciseError) {
          setError(insertExerciseError.message);
          setLoading(false);
          return;
        }

        await refreshExercises();
      } else {
        finalExerciseName = matchingExercise.name;
        finalMuscleGroup = matchingExercise.muscle_group;
      }

      if (editingEntryId) {
        const { error: updateWorkoutError } = await supabase
          .from("workout_entries")
          .update({
            date: selectedDate,
            exercise_name: finalExerciseName,
            muscle_group: finalMuscleGroup,
            weight: weight === "" ? null : Number(weight),
            reps: reps === "" ? null : Number(reps),
            sets: Number(sets),
          })
          .eq("id", editingEntryId);

        if (updateWorkoutError) {
          setError(updateWorkoutError.message);
          setLoading(false);
          return;
        }
      } else {
        const { error: insertWorkoutError } = await supabase.from("workout_entries").insert({
          date: selectedDate,
          exercise_name: finalExerciseName,
          muscle_group: finalMuscleGroup,
          weight: weight === "" ? null : Number(weight),
          reps: reps === "" ? null : Number(reps),
          sets: Number(sets),
        });

        if (insertWorkoutError) {
          setError(insertWorkoutError.message);
          setLoading(false);
          return;
        }
      }

      await refreshEntriesForDate(selectedDate);

      setEditingEntryId(null);
      setExerciseName("");
      setWeight("");
      setReps("");
      setSets("");
      setPreviousEntry(null);
      setMuscleGroup("Back");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteEntry(entryId: string) {
    const { error } = await supabase
      .from("workout_entries")
      .delete()
      .eq("id", entryId);

    if (!error) {
      await refreshEntriesForDate(selectedDate);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-zinc-500">Training Log</p>
        <h1 className="text-3xl font-semibold tracking-tight">Workout</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Log what you actually did, while still seeing the plan for the day.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="text-lg font-semibold">Selected Date</h2>
            <div className="mt-4 space-y-2">
              <label className="text-sm text-zinc-600">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none"
              />
            </div>
            <div className="mt-4 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
              {formatLongDate(selectedDate)}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5">
            <h2 className="text-lg font-semibold">Today’s Plan</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Pulled from your weekly split in Supabase.
            </p>

            <div className="mt-4 rounded-xl bg-zinc-50 p-4">
              <p className="font-medium">{todaysPlan.label}</p>

              {Object.keys(todaysPlan.targets || {}).length > 0 ? (
                <div className="mt-3 space-y-2 text-sm text-zinc-700">
                  {Object.entries(todaysPlan.targets).map(([group, count]) => (
                    <div
                      key={group}
                      className="flex items-center justify-between"
                    >
                      <span>{group}</span>
                      <span>{count} exercises</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-zinc-500">
                  No target exercises for this day.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5">
            <h2 className="text-lg font-semibold">Progress</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Logged exercises for the selected date.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {Object.keys(todaysPlan.targets || {}).length > 0 ? (
                Object.entries(todaysPlan.targets).map(([group, count]) => (
                  <div key={group} className="rounded-xl bg-zinc-50 p-4">
                    <p className="text-sm text-zinc-500">{group}</p>
                    <p className="mt-1 text-xl font-semibold">
                      {progressCounts[group] || 0} / {count}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">
                  Nothing to track for this day’s split yet.
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="text-lg font-semibold">Add Exercise</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Choose an existing exercise or type a new one.
            </p>

            <div className="mt-4 grid gap-4">
              <div className="space-y-2">
                <label className="text-sm text-zinc-600">Exercise</label>
                <input
                  type="text"
                  list="exercise-options"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  placeholder="Lat Pulldown"
                  className="w-full rounded-xl border px-3 py-2 outline-none"
                />
                <datalist id="exercise-options">
                  {exerciseLibrary.map((exercise) => (
                    <option key={exercise.id} value={exercise.name} />
                  ))}
                </datalist>
              </div>

              {previousEntry ? (
                <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
                  Last time: {previousEntry.weight ?? "—"} ×{" "}
                  {previousEntry.reps ?? "—"} · {previousEntry.sets} sets ·{" "}
                  {formatShortDate(previousEntry.date)}
                </div>
              ) : (
                <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-500">
                  No previous performance found yet.
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm text-zinc-600">Muscle Group</label>
                <select
                  value={muscleGroup}
                  onChange={(e) => setMuscleGroup(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 outline-none"
                >
                  {MUSCLE_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-600">Weight</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="140"
                    className="w-full rounded-xl border px-3 py-2 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-600">Reps</label>
                  <input
                    type="number"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    placeholder="9"
                    className="w-full rounded-xl border px-3 py-2 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-600">Sets</label>
                  <input
                    type="number"
                    value={sets}
                    onChange={(e) => setSets(e.target.value)}
                    placeholder="3"
                    className="w-full rounded-xl border px-3 py-2 outline-none"
                  />
                </div>
              </div>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="flex gap-3">
                <button
                  onClick={handleAddExercise}
                  disabled={loading}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {loading ? "Saving..." : editingEntryId ? "Save Changes" : "Add Exercise"}
                </button>

                {editingEntryId ? (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="rounded-xl border px-4 py-2 text-sm font-medium"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5">
            <h2 className="text-lg font-semibold">Logged Exercises</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Entries for {formatLongDate(selectedDate)}.
            </p>

            <div className="mt-4 space-y-3">
              {entries.length > 0 ? (
                entries.map((entry) => (
                  <div key={entry.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{entry.exercise_name}</p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {entry.muscle_group} · {entry.weight ?? "—"} ×{" "}
                          {entry.reps ?? "—"} · {entry.sets} sets
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStartEdit(entry)}
                          className="rounded-lg border px-3 py-1.5 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="rounded-lg border px-3 py-1.5 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-4 text-sm text-zinc-500">
                  No exercises logged for this date yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
