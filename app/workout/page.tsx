"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type WeeklySplitRow = {
  id: string;
  day_of_week: string;
  label: string;
  targets: Record<string, number> | null;
};

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

function formatSetsInline(sets: LoggedSet[] | null | undefined) {
  if (!sets || sets.length === 0) return "No sets logged";
  return sets
    .map((set) => `${set.weight ?? "—"} × ${set.reps ?? "—"}`)
    .join(" · ");
}

function sanitizeSets(
  sets: { weight: string; reps: string }[]
): LoggedSet[] {
  return sets
    .map((set) => ({
      weight: set.weight === "" ? null : Number(set.weight),
      reps: set.reps === "" ? null : Number(set.reps),
    }))
    .filter((set) => set.weight !== null || set.reps !== null);
}

export default function WorkoutPage() {
  const supabase = createClient();

  const [selectedDate, setSelectedDate] = useState("");

  const [weeklySplit, setWeeklySplit] = useState<WeeklySplitRow[]>([]);
  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseRow[]>([]);
  const [entries, setEntries] = useState<WorkoutEntryRow[]>([]);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  const [exerciseName, setExerciseName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("Back");
  const [setRows, setSetRows] = useState([
    { weight: "", reps: "" },
    { weight: "", reps: "" },
    { weight: "", reps: "" },
  ]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [previousEntry, setPreviousEntry] = useState<WorkoutEntryRow | null>(null);

  const selectedDayName = useMemo(() => getDayName(selectedDate), [selectedDate]);

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

  const filteredExerciseOptions = useMemo(() => {
    const normalized = normalizeName(exerciseName);
    if (!normalized) return exerciseLibrary.slice(0, 8);
    return exerciseLibrary
      .filter((exercise) =>
        normalizeName(exercise.name).includes(normalized)
      )
      .slice(0, 8);
  }, [exerciseLibrary, exerciseName]);

  const existingExerciseMatch = useMemo<ExerciseRow | null>(() => {
    const normalized = normalizeName(exerciseName);
    const match = exerciseLibrary.find(
      (exercise) => normalizeName(exercise.name) === normalized
    );
    return match ?? null;
  }, [exerciseName, exerciseLibrary]);

  useEffect(() => {
    setSelectedDate(getTodayISO());
  }, []);

  useEffect(() => {
    async function loadWeeklySplit() {
      const { data, error } = await supabase
        .from("weekly_split")
        .select("id, day_of_week, label, targets");

      if (!error && data) {
        setWeeklySplit(data as WeeklySplitRow[]);
      }
    }

    loadWeeklySplit();
  }, [supabase]);

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
        .select("id, date, exercise_name, muscle_group, sets_data")
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
        .select("id, date, exercise_name, muscle_group, sets_data")
        .eq("exercise_name", exerciseNameToSearch)
        .lt("date", selectedDate)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error) {
        const previous = (data as WorkoutEntryRow | null) ?? null;
        setPreviousEntry(previous);

        if (previous && !editingEntryId) {
          const nextRows =
            previous.sets_data && previous.sets_data.length > 0
              ? previous.sets_data.map((set) => ({
                  weight: set.weight?.toString() ?? "",
                  reps: set.reps?.toString() ?? "",
                }))
              : [
                  { weight: "", reps: "" },
                  { weight: "", reps: "" },
                  { weight: "", reps: "" },
                ];

          setSetRows(nextRows);
        }
      }
    }

    loadPreviousPerformance();
  }, [existingExerciseMatch, selectedDate, supabase, editingEntryId]);

  useEffect(() => {
    if (existingExerciseMatch && !editingEntryId) {
      setMuscleGroup(existingExerciseMatch.muscle_group);
    }
  }, [existingExerciseMatch, editingEntryId]);

  async function refreshEntriesForDate(dateToLoad: string) {
    const { data, error } = await supabase
      .from("workout_entries")
      .select("id, date, exercise_name, muscle_group, sets_data")
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

  function resetForm() {
    setEditingEntryId(null);
    setExerciseName("");
    setMuscleGroup("Back");
    setSetRows([
      { weight: "", reps: "" },
      { weight: "", reps: "" },
      { weight: "", reps: "" },
    ]);
    setPreviousEntry(null);
    setError("");
  }

  function handleStartEdit(entry: WorkoutEntryRow) {
    setEditingEntryId(entry.id);
    setExerciseName(entry.exercise_name);
    setMuscleGroup(entry.muscle_group);
    setSetRows(
      entry.sets_data && entry.sets_data.length > 0
        ? entry.sets_data.map((set) => ({
            weight: set.weight?.toString() ?? "",
            reps: set.reps?.toString() ?? "",
          }))
        : [{ weight: "", reps: "" }]
    );
    setError("");
  }

  function handleCancelEdit() {
    resetForm();
  }

  function handleSetRowChange(
    index: number,
    field: "weight" | "reps",
    value: string
  ) {
    setSetRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      )
    );
  }

  function handleAddSetRow() {
    setSetRows((prev) => [...prev, { weight: "", reps: "" }]);
  }

  function handleRemoveSetRow(index: number) {
    setSetRows((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSaveExercise() {
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

    const cleanedSets = sanitizeSets(setRows);

    if (cleanedSets.length === 0) {
      setError("Add at least one set with weight or reps.");
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
            sets_data: cleanedSets,
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
          sets_data: cleanedSets,
        });

        if (insertWorkoutError) {
          setError(insertWorkoutError.message);
          setLoading(false);
          return;
        }
      }

      await refreshEntriesForDate(selectedDate);
      resetForm();
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
    <div className="space-y-6 text-black">
      <div>
        <p className="text-sm text-zinc-500">Training Log</p>
        <h1 className="text-3xl font-semibold tracking-tight">Workout</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Log what you actually did, while still seeing the plan for the day.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-black">
            <h2 className="text-lg font-semibold">Selected Date</h2>
            <div className="mt-4 space-y-2">
              <label className="text-sm text-zinc-600">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
              />
            </div>
            <div className="mt-4 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
              {formatLongDate(selectedDate)}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-black">
            <h2 className="text-lg font-semibold">Today’s Plan</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Pulled from your weekly split in Supabase.
            </p>

            <div className="mt-4 rounded-xl bg-zinc-50 p-4">
              <p className="font-medium">{todaysPlan.label}</p>

              {Object.keys(todaysPlan.targets || {}).length > 0 ? (
                <div className="mt-3 space-y-2 text-sm text-zinc-700">
                  {Object.entries(todaysPlan.targets || {}).map(([group, count]) => (
                    <div key={group} className="flex items-center justify-between">
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

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-black">
            <h2 className="text-lg font-semibold">Progress</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Logged exercises for the selected date.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {Object.keys(todaysPlan.targets || {}).length > 0 ? (
                Object.entries(todaysPlan.targets || {}).map(([group, count]) => (
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
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-black">
            <h2 className="text-lg font-semibold">Add Exercise</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Choose an existing exercise or type a new one.
            </p>

            <div className="mt-4 grid gap-4">
              <div className="space-y-2">
                <label className="text-sm text-zinc-600">Exercise</label>
                <input
                  type="text"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  placeholder="Lat Pulldown"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
                />

                {exerciseName.trim() ? (
                  <div className="rounded-xl border border-zinc-200 bg-white p-2">
                    <div className="flex flex-wrap gap-2">
                      {filteredExerciseOptions.length > 0 ? (
                        filteredExerciseOptions.map((exercise) => (
                          <button
                            key={exercise.id}
                            type="button"
                            onClick={() => {
                              setExerciseName(exercise.name);
                              setMuscleGroup(exercise.muscle_group);
                            }}
                            className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-black"
                          >
                            {exercise.name}
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-500">
                          No matching saved exercises.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              {previousEntry ? (
                <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
                  <p className="font-medium text-black">
                    Last time · {formatShortDate(previousEntry.date)}
                  </p>
                  <div className="mt-2 space-y-1">
                    {(previousEntry.sets_data || []).map((set, index) => (
                      <p key={index}>
                        Set {index + 1}: {set.weight ?? "—"} × {set.reps ?? "—"}
                      </p>
                    ))}
                  </div>
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
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
                >
                  {MUSCLE_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-zinc-600">Sets</label>
                  <button
                    type="button"
                    onClick={handleAddSetRow}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm"
                  >
                    Add Set
                  </button>
                </div>

                {setRows.map((row, index) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-[1fr,1fr,auto]"
                  >
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-600">Weight</label>
                      <input
                        type="number"
                        value={row.weight}
                        onChange={(e) =>
                          handleSetRowChange(index, "weight", e.target.value)
                        }
                        placeholder="160"
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-zinc-600">Reps</label>
                      <input
                        type="number"
                        value={row.reps}
                        onChange={(e) =>
                          handleSetRowChange(index, "reps", e.target.value)
                        }
                        placeholder="8"
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveSetRow(index)}
                        className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="flex gap-3">
                <button
                  onClick={handleSaveExercise}
                  disabled={loading}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {loading ? "Saving..." : editingEntryId ? "Save Changes" : "Add Exercise"}
                </button>

                {editingEntryId ? (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-black">
            <h2 className="text-lg font-semibold">Logged Exercises</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Entries for {formatLongDate(selectedDate)}.
            </p>

            <div className="mt-4 space-y-3">
              {entries.length > 0 ? (
                entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-zinc-200 bg-white p-4 text-black"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{entry.exercise_name}</p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {entry.muscle_group}
                        </p>
                        <div className="mt-2 space-y-1 text-sm text-zinc-700">
                          {(entry.sets_data || []).map((set, index) => (
                            <p key={index}>
                              Set {index + 1}: {set.weight ?? "—"} × {set.reps ?? "—"}
                            </p>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStartEdit(entry)}
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-4 text-sm text-zinc-500">
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