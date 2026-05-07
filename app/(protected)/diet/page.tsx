"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DietEntryRow = {
  id: string;
  date: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

type AverageStats = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  loggedDays: number;
};

const CALORIE_MAX = 2200;
const PROTEIN_TARGET = 180;

function getTodayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function getStartOfWeek(dateString: string) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

function getStartOfMonth(dateString: string) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function formatShortRangeDate(dateString: string) {
  if (!dateString) return "";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
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

export default function DietPage() {
  const supabase = createClient();

  const [selectedDate, setSelectedDate] = useState("");
  const [entryId, setEntryId] = useState<string | null>(null);

  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  const [weekAverage, setWeekAverage] = useState<AverageStats>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    loggedDays: 0,
  });

  const [monthAverage, setMonthAverage] = useState<AverageStats>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    loggedDays: 0,
  });

  const [loading, setLoading] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setSelectedDate(getTodayISO());
  }, []);

  useEffect(() => {
    if (!selectedDate) return;

    async function loadDietEntry() {
      setLoadingEntry(true);
      setMessage("");
      setError("");

      const { data, error } = await supabase
        .from("diet_entries")
        .select("id, date, calories, protein, carbs, fat")
        .eq("date", selectedDate)
        .maybeSingle();

      if (error) {
        setError(error.message);
        setLoadingEntry(false);
        return;
      }

      const entry = (data as DietEntryRow | null) ?? null;

      if (entry) {
        setEntryId(entry.id);
        setCalories(entry.calories?.toString() ?? "");
        setProtein(entry.protein?.toString() ?? "");
        setCarbs(entry.carbs?.toString() ?? "");
        setFat(entry.fat?.toString() ?? "");
      } else {
        setEntryId(null);
        setCalories("");
        setProtein("");
        setCarbs("");
        setFat("");
      }

      setLoadingEntry(false);
    }

    loadDietEntry();
  }, [selectedDate, supabase]);

  useEffect(() => {
    if (!selectedDate) return;

    async function loadAverages() {
      const weekStart = getStartOfWeek(selectedDate);
      const monthStart = getStartOfMonth(selectedDate);

      const { data: weekData, error: weekError } = await supabase
        .from("diet_entries")
        .select("id, date, calories, protein, carbs, fat")
        .gte("date", weekStart)
        .lte("date", selectedDate)
        .order("date", { ascending: true });

      if (!weekError && weekData) {
        setWeekAverage(calculateAverages(weekData as DietEntryRow[]));
      } else {
        setWeekAverage({
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          loggedDays: 0,
        });
      }

      const { data: monthData, error: monthError } = await supabase
        .from("diet_entries")
        .select("id, date, calories, protein, carbs, fat")
        .gte("date", monthStart)
        .lte("date", selectedDate)
        .order("date", { ascending: true });

      if (!monthError && monthData) {
        setMonthAverage(calculateAverages(monthData as DietEntryRow[]));
      } else {
        setMonthAverage({
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          loggedDays: 0,
        });
      }
    }

    loadAverages();
  }, [selectedDate, supabase]);

  async function refreshAverages(dateToUse: string) {
    const weekStart = getStartOfWeek(dateToUse);
    const monthStart = getStartOfMonth(dateToUse);

    const { data: weekData } = await supabase
      .from("diet_entries")
      .select("id, date, calories, protein, carbs, fat")
      .gte("date", weekStart)
      .lte("date", dateToUse);

    setWeekAverage(calculateAverages((weekData as DietEntryRow[]) ?? []));

    const { data: monthData } = await supabase
      .from("diet_entries")
      .select("id, date, calories, protein, carbs, fat")
      .gte("date", monthStart)
      .lte("date", dateToUse);

    setMonthAverage(calculateAverages((monthData as DietEntryRow[]) ?? []));
  }

  async function handleSave() {
    setLoading(true);
    setMessage("");
    setError("");

    const payload = {
      date: selectedDate,
      calories: calories === "" ? null : Number(calories),
      protein: protein === "" ? null : Number(protein),
      carbs: carbs === "" ? null : Number(carbs),
      fat: fat === "" ? null : Number(fat),
    };

    try {
      if (entryId) {
        const { error } = await supabase
          .from("diet_entries")
          .update(payload)
          .eq("id", entryId);

        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }

        setMessage("Diet entry updated.");
      } else {
        const { data, error } = await supabase
          .from("diet_entries")
          .insert(payload)
          .select("id")
          .single();

        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }

        setEntryId(data.id);
        setMessage("Diet entry saved.");
      }

      await refreshAverages(selectedDate);
    } finally {
      setLoading(false);
    }
  }

  const calorieNumber = calories === "" ? 0 : Number(calories);
  const proteinNumber = protein === "" ? 0 : Number(protein);
  const carbsNumber = carbs === "" ? 0 : Number(carbs);
  const fatNumber = fat === "" ? 0 : Number(fat);

  const calorieStatus =
    calorieNumber === 0
      ? "No calories logged yet."
      : calorieNumber <= CALORIE_MAX
      ? "Within calorie target."
      : "Over calorie target.";

  const proteinStatus =
    proteinNumber === 0
      ? "No protein logged yet."
      : proteinNumber >= PROTEIN_TARGET
      ? "Protein target hit."
      : "Protein below target.";

  return (
    <div className="space-y-6 text-black">
      <div>
        <p className="text-sm text-zinc-500">Nutrition Log</p>
        <h1 className="text-3xl font-semibold tracking-tight">Diet</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Track daily macros simply and compare them to your current targets.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
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
            <h2 className="text-lg font-semibold">Current Targets</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Hardcoded for now. Later this will come from Settings.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Calorie Max</p>
                <p className="mt-1 text-xl font-semibold">{CALORIE_MAX}</p>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Protein Target</p>
                <p className="mt-1 text-xl font-semibold">{PROTEIN_TARGET}g</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-black">
            <h2 className="text-lg font-semibold">Status</h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Calories</p>
                <p className="mt-1 text-xl font-semibold">
                  {calorieNumber} / {CALORIE_MAX}
                </p>
                <p className="mt-2 text-sm text-zinc-500">{calorieStatus}</p>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Protein</p>
                <p className="mt-1 text-xl font-semibold">
                  {proteinNumber} / {PROTEIN_TARGET}g
                </p>
                <p className="mt-2 text-sm text-zinc-500">{proteinStatus}</p>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Carbs</p>
                <p className="mt-1 text-xl font-semibold">{carbsNumber}g</p>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Fat</p>
                <p className="mt-1 text-xl font-semibold">{fatNumber}g</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-black">
            <h2 className="text-lg font-semibold">Current Week Average</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {getStartOfWeek(selectedDate)
                ? `${formatShortRangeDate(getStartOfWeek(selectedDate))} – ${formatShortRangeDate(selectedDate)}`
                : "Loading range..."}
              {` · based on ${weekAverage.loggedDays} logged day${weekAverage.loggedDays === 1 ? "" : "s"}`}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Avg Calories</p>
                <p className="mt-1 text-xl font-semibold">{weekAverage.calories}</p>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Avg Protein</p>
                <p className="mt-1 text-xl font-semibold">{weekAverage.protein}g</p>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Avg Carbs</p>
                <p className="mt-1 text-xl font-semibold">{weekAverage.carbs}g</p>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Avg Fat</p>
                <p className="mt-1 text-xl font-semibold">{weekAverage.fat}g</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-black">
            <h2 className="text-lg font-semibold">Current Month Average</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {getStartOfMonth(selectedDate)
                ? `${formatShortRangeDate(getStartOfMonth(selectedDate))} – ${formatShortRangeDate(selectedDate)}`
                : "Loading range..."}
              {` · based on ${monthAverage.loggedDays} logged day${monthAverage.loggedDays === 1 ? "" : "s"}`}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Avg Calories</p>
                <p className="mt-1 text-xl font-semibold">{monthAverage.calories}</p>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Avg Protein</p>
                <p className="mt-1 text-xl font-semibold">{monthAverage.protein}g</p>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Avg Carbs</p>
                <p className="mt-1 text-xl font-semibold">{monthAverage.carbs}g</p>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Avg Fat</p>
                <p className="mt-1 text-xl font-semibold">{monthAverage.fat}g</p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-black">
            <h2 className="text-lg font-semibold">Daily Macros</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Save one macro entry per day.
            </p>

            <div className="mt-4 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-600">Calories</label>
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    placeholder="2100"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-zinc-600">Protein</label>
                  <input
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    placeholder="180"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-zinc-600">Carbs</label>
                  <input
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    placeholder="190"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-zinc-600">Fat</label>
                  <input
                    type="number"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    placeholder="60"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
                  />
                </div>
              </div>

              {loadingEntry ? (
                <div className="rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
                  Loading entry...
                </div>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {message ? (
                <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  {message}
                </div>
              ) : null}

              <button
                onClick={handleSave}
                disabled={loading || !selectedDate}
                className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {loading ? "Saving..." : entryId ? "Update Entry" : "Save Entry"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}