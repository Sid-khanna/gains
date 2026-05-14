"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ProfileRow = {
  id: string;
  user_id: string;
  app_name: string | null;
  calorie_max: number | null;
  protein_target: number | null;
  carbs_target: number | null;
  fat_target: number | null;
};

type WeeklySplitRow = {
  id: string;
  user_id: string;
  day_of_week: string;
  label: string;
  targets: Record<string, number> | null;
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

const DEFAULT_SPLIT: Record<
  string,
  { label: string; targets: Record<string, number> }
> = {
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

  const [userId, setUserId] = useState<string | null>(null);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [appName, setAppName] = useState("Gains");
  const [calorieMax, setCalorieMax] = useState("2200");
  const [proteinTarget, setProteinTarget] = useState("180");
  const [carbsTarget, setCarbsTarget] = useState("");
  const [fatTarget, setFatTarget] = useState("");

  const [weeklySplit, setWeeklySplit] = useState<
    {
      id: string;
      day_of_week: string;
      label: string;
      targets: Record<string, number>;
    }[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSplit, setSavingSplit] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
      } else {
        setLoading(false);
      }
    }

    getUser();
  }, [supabase]);

  useEffect(() => {
    async function loadSettings() {
      if (!userId) return;

      setLoading(true);
      setError("");
      setMessage("");

      const [profileResponse, splitResponse] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, user_id, app_name, calorie_max, protein_target, carbs_target, fat_target"
          )
          .eq("user_id", userId)
          .maybeSingle(),

        supabase
          .from("weekly_split")
          .select("id, user_id, day_of_week, label, targets")
          .eq("user_id", userId),
      ]);

      if (!profileResponse.error && profileResponse.data) {
        const profile = profileResponse.data as ProfileRow;

        setProfileId(profile.id);
        setAppName(profile.app_name ?? "Gains");
        setCalorieMax(profile.calorie_max?.toString() ?? "2200");
        setProteinTarget(profile.protein_target?.toString() ?? "180");
        setCarbsTarget(profile.carbs_target?.toString() ?? "");
        setFatTarget(profile.fat_target?.toString() ?? "");
      }

      if (!splitResponse.error && splitResponse.data) {
        const rows = splitResponse.data as WeeklySplitRow[];

        const normalized = DAY_ORDER.map((day) => {
          const existing = rows.find((row) => row.day_of_week === day);

          return {
            id: existing?.id ?? `temp-${day}`,
            day_of_week: day,
            label: existing?.label ?? DEFAULT_SPLIT[day].label,
            targets: (existing?.targets ??
              DEFAULT_SPLIT[day].targets) as Record<string, number>,
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
  }, [supabase, userId]);

  async function handleSaveProfile() {
    if (!userId) {
      setError("You must be logged in.");
      return;
    }

    setSavingProfile(true);
    setError("");
    setMessage("");

    const profilePayload = {
      app_name: appName.trim() || "Gains",
      calorie_max: calorieMax === "" ? 2200 : Number(calorieMax),
      protein_target: proteinTarget === "" ? 180 : Number(proteinTarget),
      carbs_target: carbsTarget === "" ? null : Number(carbsTarget),
      fat_target: fatTarget === "" ? null : Number(fatTarget),
    };

    try {
      if (profileId) {
        const { error } = await supabase
          .from("profiles")
          .update(profilePayload)
          .eq("id", profileId)
          .eq("user_id", userId);

        if (error) {
          setError(error.message);
          return;
        }

        setMessage("Profile updated.");
      } else {
        const { data, error } = await supabase
          .from("profiles")
          .insert({
            ...profilePayload,
            user_id: userId,
          })
          .select("id")
          .single();

        if (error) {
          setError(error.message);
          return;
        }

        setProfileId(data.id);
        setMessage("Profile created.");
      }
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveSplit() {
    if (!userId) {
      setError("You must be logged in.");
      return;
    }

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
              user_id: userId,
              day_of_week: row.day_of_week,
              label: row.label,
              targets: cleanedTargets,
            })
            .select("id")
            .single();

          if (error) {
            setError(error.message);
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
            .eq("id", row.id)
            .eq("user_id", userId);

          if (error) {
            setError(error.message);
            return;
          }
        }
      }

      setMessage("Weekly split updated.");
    } finally {
      setSavingSplit(false);
    }
  }

  function updateSplitLabel(day: string, value: string) {
    setWeeklySplit((prev) =>
      prev.map((row) =>
        row.day_of_week === day ? { ...row, label: value } : row
      )
    );
  }

  function updateSplitTarget(day: string, muscleGroup: string, value: string) {
    setWeeklySplit((prev) =>
      prev.map((row) => {
        if (row.day_of_week !== day) return row;

        return {
          ...row,
          targets: {
            ...row.targets,
            [muscleGroup]: value === "" ? 0 : Number(value),
          },
        };
      })
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 text-black">
        <h1 className="text-3xl font-semibold">Settings</h1>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500">
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-black">
      <div>
        <p className="text-sm text-zinc-500">App Settings</p>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your targets and weekly split.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-black">
        <h2 className="text-lg font-semibold">Profile Targets</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-5">
          <div className="space-y-2">
            <label className="text-sm text-zinc-600">App Name</label>
            <input
              value={appName}
              onChange={(event) => setAppName(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-600">Calorie Max</label>
            <input
              type="number"
              value={calorieMax}
              onChange={(event) => setCalorieMax(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-600">Protein Target</label>
            <input
              type="number"
              value={proteinTarget}
              onChange={(event) => setProteinTarget(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-600">
              Carbs Target Optional
            </label>
            <input
              type="number"
              value={carbsTarget}
              onChange={(event) => setCarbsTarget(event.target.value)}
              placeholder="250"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-600">
              Fat Target Optional
            </label>
            <input
              type="number"
              value={fatTarget}
              onChange={(event) => setFatTarget(event.target.value)}
              placeholder="70"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="mt-4 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {savingProfile ? "Saving..." : "Save Profile"}
        </button>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-black">
        <h2 className="text-lg font-semibold">Weekly Split</h2>

        <div className="mt-4 space-y-4">
          {weeklySplit.map((row) => (
            <div
              key={row.day_of_week}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="grid gap-4 md:grid-cols-[160px,1fr]">
                <div>
                  <p className="font-medium">{row.day_of_week}</p>
                </div>

                <div className="space-y-3">
                  <input
                    value={row.label}
                    onChange={(event) =>
                      updateSplitLabel(row.day_of_week, event.target.value)
                    }
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
                  />

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {MUSCLE_GROUPS.map((group) => (
                      <div key={group} className="space-y-1">
                        <label className="text-xs text-zinc-500">{group}</label>
                        <input
                          type="number"
                          min="0"
                          value={row.targets[group] ?? 0}
                          onChange={(event) =>
                            updateSplitTarget(
                              row.day_of_week,
                              group,
                              event.target.value
                            )
                          }
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSaveSplit}
          disabled={savingSplit}
          className="mt-4 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {savingSplit ? "Saving..." : "Save Split"}
        </button>
      </section>
    </div>
  );
}