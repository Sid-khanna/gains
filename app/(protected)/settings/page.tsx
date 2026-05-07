"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ProfileRow = {
  id: string;
  app_name: string | null;
  calorie_max: number | null;
  protein_target: number | null;
};

type WeeklySplitRow = {
  id: string;
  day_of_week: string;
  label: string;
  targets: Record<string, number> | null;
};

type SplitEditorRow = {
  id: string;
  day_of_week: string;
  label: string;
  targets: Record<string, number>;
};

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DEFAULT_SPLIT: Record<string, { label: string; targets: Record<string, number> }> = {
  Monday: {
    label: "Back + Biceps + Shoulders",
    targets: { Back: 3, Biceps: 2, Shoulders: 1 },
  },
  Tuesday: {
    label: "Bouldering",
    targets: {},
  },
  Wednesday: {
    label: "Chest + Triceps + Abs",
    targets: { Chest: 3, Triceps: 2, Abs: 2 },
  },
  Thursday: {
    label: "Rest",
    targets: {},
  },
  Friday: {
    label: "Shoulders + Arms + Abs",
    targets: { Shoulders: 3, Biceps: 2, Triceps: 2, Abs: 2 },
  },
  Saturday: {
    label: "Legs",
    targets: { Legs: 4 },
  },
  Sunday: {
    label: "Bouldering or Rest",
    targets: {},
  },
};

const MUSCLE_GROUPS = [
  "Back",
  "Chest",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Legs",
  "Abs",
];

export default function SettingsPage() {
  const supabase = createClient();

  const [profileId, setProfileId] = useState<string | null>(null);
  const [appName, setAppName] = useState("Gains");
  const [calorieMax, setCalorieMax] = useState("2200");
  const [proteinTarget, setProteinTarget] = useState("180");

  const [weeklySplit, setWeeklySplit] = useState<SplitEditorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSplit, setSavingSplit] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      setError("");
      setMessage("");

      const [profileResponse, splitResponse] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, app_name, calorie_max, protein_target")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("weekly_split")
          .select("id, day_of_week, label, targets"),
      ]);

      if (!profileResponse.error && profileResponse.data) {
        const profile = profileResponse.data as ProfileRow;
        setProfileId(profile.id);
        setAppName(profile.app_name ?? "Gains");
        setCalorieMax(profile.calorie_max?.toString() ?? "2200");
        setProteinTarget(profile.protein_target?.toString() ?? "180");
      }

      if (!splitResponse.error && splitResponse.data) {
        const rows = splitResponse.data as WeeklySplitRow[];

        const normalized = DAY_ORDER.map((day) => {
          const existing = rows.find((row) => row.day_of_week === day);
          return {
            id: existing?.id ?? `temp-${day}`,
            day_of_week: day,
            label: existing?.label ?? DEFAULT_SPLIT[day].label,
            targets: (existing?.targets ?? DEFAULT_SPLIT[day].targets) as Record<string, number>,
          };
        });

        setWeeklySplit(normalized);
      } else {
        setWeeklySplit(
          DAY_ORDER.map((day) => ({
            id: `temp-${day}`,
            day_of_week: day,
            label: DEFAULT_SPLIT[day].label,
            targets: DEFAULT_SPLIT[day].targets,
          }))
        );
      }

      setLoading(false);
    }

    loadSettings();
  }, [supabase]);

  function updateSplitLabel(day: string, value: string) {
    setWeeklySplit((prev) =>
      prev.map((row) =>
        row.day_of_week === day ? { ...row, label: value } : row
      )
    );
  }

  function updateSplitTarget(day: string, muscle: string, value: string) {
    const parsed = value === "" ? 0 : Number(value);

    setWeeklySplit((prev) =>
      prev.map((row) =>
        row.day_of_week === day
          ? {
              ...row,
              targets: {
                ...row.targets,
                [muscle]: Number.isNaN(parsed) ? 0 : parsed,
              },
            }
          : row
      )
    );
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    setError("");
    setMessage("");

    const payload = {
      app_name: appName.trim() === "" ? "Gains" : appName.trim(),
      calorie_max: calorieMax === "" ? 2200 : Number(calorieMax),
      protein_target: proteinTarget === "" ? 180 : Number(proteinTarget),
    };

    try {
      if (profileId) {
        const { error } = await supabase
          .from("profiles")
          .update(payload)
          .eq("id", profileId);

        if (error) {
          setError(error.message);
          setSavingProfile(false);
          return;
        }

        setMessage("Profile settings updated.");
      } else {
        const { data, error } = await supabase
          .from("profiles")
          .insert(payload)
          .select("id")
          .single();

        if (error) {
          setError(error.message);
          setSavingProfile(false);
          return;
        }

        setProfileId(data.id);
        setMessage("Profile settings saved.");
      }
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveSplit() {
    setSavingSplit(true);
    setError("");
    setMessage("");

    try {
      for (const row of weeklySplit) {
        const cleanedTargets = Object.fromEntries(
          Object.entries(row.targets).filter(([, value]) => Number(value) > 0)
        );

        if (row.id.startsWith("temp-")) {
          const { data, error } = await supabase
            .from("weekly_split")
            .insert({
              day_of_week: row.day_of_week,
              label: row.label,
              targets: cleanedTargets,
            })
            .select("id")
            .single();

          if (error) {
            setError(error.message);
            setSavingSplit(false);
            return;
          }

          setWeeklySplit((prev) =>
            prev.map((item) =>
              item.day_of_week === row.day_of_week
                ? { ...item, id: data.id }
                : item
            )
          );
        } else {
          const { error } = await supabase
            .from("weekly_split")
            .update({
              day_of_week: row.day_of_week,
              label: row.label,
              targets: cleanedTargets,
            })
            .eq("id", row.id);

          if (error) {
            setError(error.message);
            setSavingSplit(false);
            return;
          }
        }
      }

      setMessage("Weekly split updated.");
    } finally {
      setSavingSplit(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 text-black">
        <div>
          <p className="text-sm text-zinc-500">Configuration</p>
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500">
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-black">
      <div>
        <p className="text-sm text-zinc-500">Configuration</p>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage app defaults, nutrition targets, and your weekly training split.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-lg font-semibold">App Profile</h2>
            <p className="mt-1 text-sm text-zinc-500">
              These values will later feed into Dashboard, Diet, and other pages.
            </p>

            <div className="mt-4 grid gap-4">
              <div className="space-y-2">
                <label className="text-sm text-zinc-600">App Name</label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Gains"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-600">Calorie Max</label>
                  <input
                    type="number"
                    value={calorieMax}
                    onChange={(e) => setCalorieMax(e.target.value)}
                    placeholder="2200"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-zinc-600">Protein Target</label>
                  <input
                    type="number"
                    value={proteinTarget}
                    onChange={(e) => setProteinTarget(e.target.value)}
                    placeholder="180"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {savingProfile ? "Saving..." : "Save Profile Settings"}
              </button>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Weekly Split</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Edit workout labels and target exercise counts for each day.
                </p>
              </div>

              <button
                onClick={handleSaveSplit}
                disabled={savingSplit}
                className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {savingSplit ? "Saving..." : "Save Split"}
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {weeklySplit.map((row) => (
                <div
                  key={row.day_of_week}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <p className="text-sm font-medium text-zinc-500">
                    {row.day_of_week}
                  </p>

                  <div className="mt-3 space-y-2">
                    <label className="text-sm text-zinc-600">Label</label>
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) =>
                        updateSplitLabel(row.day_of_week, e.target.value)
                      }
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
                    />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {MUSCLE_GROUPS.map((muscle) => (
                      <div key={muscle} className="space-y-2">
                        <label className="text-sm text-zinc-600">{muscle}</label>
                        <input
                          type="number"
                          min="0"
                          value={row.targets[muscle] ?? 0}
                          onChange={(e) =>
                            updateSplitTarget(row.day_of_week, muscle, e.target.value)
                          }
                          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}