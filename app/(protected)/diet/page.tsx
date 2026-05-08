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
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    }
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

  async function getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user;
  }

  useEffect(() => {
    setSelectedDate(getTodayISO());
  }, []);

  useEffect(() => {
    if (!selectedDate) return;

    async function loadDietEntry() {
      const user = await getCurrentUser();

      if (!user) return;

      setLoadingEntry(true);
      setMessage("");
      setError("");

      const { data, error } = await supabase
        .from("diet_entries")
        .select("id, date, calories, protein, carbs, fat")
        .eq("user_id", user.id)
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
      const user = await getCurrentUser();

      if (!user) return;

      const weekStart = getStartOfWeek(selectedDate);
      const monthStart = getStartOfMonth(selectedDate);

      const { data: weekData, error: weekError } = await supabase
        .from("diet_entries")
        .select("id, date, calories, protein, carbs, fat")
        .eq("user_id", user.id)
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
        .eq("user_id", user.id)
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
    const user = await getCurrentUser();

    if (!user) return;

    const weekStart = getStartOfWeek(dateToUse);
    const monthStart = getStartOfMonth(dateToUse);

    const { data: weekData } = await supabase
      .from("diet_entries")
      .select("id, date, calories, protein, carbs, fat")
      .eq("user_id", user.id)
      .gte("date", weekStart)
      .lte("date", dateToUse);

    setWeekAverage(calculateAverages((weekData as DietEntryRow[]) ?? []));

    const { data: monthData } = await supabase
      .from("diet_entries")
      .select("id, date, calories, protein, carbs, fat")
      .eq("user_id", user.id)
      .gte("date", monthStart)
      .lte("date", dateToUse);

    setMonthAverage(calculateAverages((monthData as DietEntryRow[]) ?? []));
  }

  async function handleSave() {
    const user = await getCurrentUser();

    if (!user) {
      setError("You must be logged in.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    const payload = {
      user_id: user.id,
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
          .eq("id", entryId)
          .eq("user_id", user.id);

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
      </div>
    </div>
  );
}