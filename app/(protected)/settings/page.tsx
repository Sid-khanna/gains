"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/* ---------------- TYPES ---------------- */

type ProfileRow = {
  id: string;
  user_id: string;
  app_name: string | null;
  calorie_max: number | null;
  protein_target: number | null;
};

type WeeklySplitRow = {
  id: string;
  user_id: string;
  day_of_week: string;
  label: string;
  targets: Record<string, number> | null;
};

/* ---------------- CONSTANTS ---------------- */

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

/* ---------------- PAGE ---------------- */

export default function SettingsPage() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [appName, setAppName] = useState("Gains");
  const [calorieMax, setCalorieMax] = useState("2200");
  const [proteinTarget, setProteinTarget] = useState("180");

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

  /* ---------------- GET USER ---------------- */

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) setUserId(user.id);
    }

    getUser();
  }, [supabase]);

  /* ---------------- LOAD SETTINGS ---------------- */

  useEffect(() => {
    async function loadSettings() {
      if (!userId) return;

      setLoading(true);
      setError("");
      setMessage("");

      const [profileResponse, splitResponse] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, user_id, app_name, calorie_max, protein_target")
          .eq("user_id", userId)
          .maybeSingle(),

        supabase
          .from("weekly_split")
          .select("id, user_id, day_of_week, label, targets")
          .eq("user_id", userId),
      ]);

      /* -------- PROFILE -------- */

      if (!profileResponse.error && profileResponse.data) {
        const profile = profileResponse.data as ProfileRow;

        setProfileId(profile.id);
        setAppName(profile.app_name ?? "Gains");
        setCalorieMax(profile.calorie_max?.toString() ?? "2200");
        setProteinTarget(profile.protein_target?.toString() ?? "180");
      }

      /* -------- SPLIT -------- */

      if (!splitResponse.error && splitResponse.data) {
        const rows = splitResponse.data as WeeklySplitRow[];

        const normalized = DAY_ORDER.map((day) => {
          const existing = rows.find((r) => r.day_of_week === day);

          return {
            id: existing?.id ?? `temp-${day}`,
            day_of_week: day,
            label: existing?.label ?? DEFAULT_SPLIT[day].label,
            targets:
              (existing?.targets ?? DEFAULT_SPLIT[day].targets) as Record<
                string,
                number
              >,
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

  /* ---------------- PROFILE SAVE ---------------- */

  async function handleSaveProfile() {
    if (!userId) return;

    setSavingProfile(true);
    setError("");
    setMessage("");

    const payload = {
      user_id: userId,
      app_name: appName.trim() || "Gains",
      calorie_max: calorieMax === "" ? 2200 : Number(calorieMax),
      protein_target: proteinTarget === "" ? 180 : Number(proteinTarget),
    };

    try {
      if (profileId) {
        const { error } = await supabase
          .from("profiles")
          .update(payload)
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
          .insert(payload)
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

  /* ---------------- SPLIT SAVE ---------------- */

  async function handleSaveSplit() {
    if (!userId) return;

    setSavingSplit(true);
    setError("");
    setMessage("");

    try {
      for (const row of weeklySplit) {
        const cleanedTargets = Object.fromEntries(
          Object.entries(row.targets).filter(([, v]) => Number(v) > 0)
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
            prev.map((p) =>
              p.day_of_week === row.day_of_week
                ? { ...p, id: data.id }
                : p
            )
          );
        } else {
          const { error } = await supabase
            .from("weekly_split")
            .update({
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

  /* ---------------- LOADING ---------------- */

  if (loading) {
    return (
      <div className="space-y-6 text-black">
        <h1 className="text-3xl font-semibold">Settings</h1>
        <div className="rounded-2xl border p-5 text-sm text-zinc-500">
          Loading settings...
        </div>
      </div>
    );
  }

  /* ---------------- UI (UNCHANGED) ---------------- */

  return (
    <div className="space-y-6 text-black">
      <h1 className="text-3xl font-semibold">Settings</h1>

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <button onClick={handleSaveProfile}>Save Profile</button>
      <button onClick={handleSaveSplit}>Save Split</button>
    </div>
  );
}