"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type BodyEntryRow = {
  id: string;
  date: string;
  weight: number | null;
  waist: number | null;
  notes: string | null;
};

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

function formatShortDate(dateString: string) {
  if (!dateString) return "";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function BodyPage() {
  const supabase = createClient();

  const [selectedDate, setSelectedDate] = useState("");
  const [entryId, setEntryId] = useState<string | null>(null);

  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [notes, setNotes] = useState("");

  const [latestEntry, setLatestEntry] = useState<BodyEntryRow | null>(null);
  const [previousEntry, setPreviousEntry] = useState<BodyEntryRow | null>(null);

  const [loadingEntry, setLoadingEntry] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setSelectedDate(getTodayISO());
  }, []);

  useEffect(() => {
    if (!selectedDate) return;

    async function loadBodyEntry() {
      setLoadingEntry(true);
      setMessage("");
      setError("");

      const { data, error } = await supabase
        .from("body_entries")
        .select("id, date, weight, waist, notes")
        .eq("date", selectedDate)
        .maybeSingle();

      if (error) {
        setError(error.message);
        setLoadingEntry(false);
        return;
      }

      const entry = (data as BodyEntryRow | null) ?? null;

      if (entry) {
        setEntryId(entry.id);
        setWeight(entry.weight?.toString() ?? "");
        setWaist(entry.waist?.toString() ?? "");
        setNotes(entry.notes ?? "");
      } else {
        setEntryId(null);
        setWeight("");
        setWaist("");
        setNotes("");
      }

      setLoadingEntry(false);
    }

    loadBodyEntry();
  }, [selectedDate, supabase]);

  useEffect(() => {
    async function loadLatestEntry() {
      const { data, error } = await supabase
        .from("body_entries")
        .select("id, date, weight, waist, notes")
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error) {
        setLatestEntry((data as BodyEntryRow | null) ?? null);
      }
    }

    loadLatestEntry();
  }, [supabase, selectedDate]);

  useEffect(() => {
    if (!selectedDate) return;

    async function loadPreviousEntry() {
      const { data, error } = await supabase
        .from("body_entries")
        .select("id, date, weight, waist, notes")
        .lt("date", selectedDate)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error) {
        setPreviousEntry((data as BodyEntryRow | null) ?? null);
      }
    }

    loadPreviousEntry();
  }, [selectedDate, supabase]);

  async function refreshLatestAndPrevious(dateToUse: string) {
    const { data: latestData } = await supabase
      .from("body_entries")
      .select("id, date, weight, waist, notes")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    setLatestEntry((latestData as BodyEntryRow | null) ?? null);

    const { data: previousData } = await supabase
      .from("body_entries")
      .select("id, date, weight, waist, notes")
      .lt("date", dateToUse)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    setPreviousEntry((previousData as BodyEntryRow | null) ?? null);
  }

  async function handleSave() {
    setLoading(true);
    setMessage("");
    setError("");

    const payload = {
      date: selectedDate,
      weight: weight === "" ? null : Number(weight),
      waist: waist === "" ? null : Number(waist),
      notes: notes.trim() === "" ? null : notes.trim(),
    };

    try {
      if (entryId) {
        const { error } = await supabase
          .from("body_entries")
          .update(payload)
          .eq("id", entryId);

        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }

        setMessage("Body entry updated.");
      } else {
        const { data, error } = await supabase
          .from("body_entries")
          .insert(payload)
          .select("id")
          .single();

        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }

        setEntryId(data.id);
        setMessage("Body entry saved.");
      }

      await refreshLatestAndPrevious(selectedDate);
    } finally {
      setLoading(false);
    }
  }

  const weightNumber = weight === "" ? null : Number(weight);
  const weightChange =
    weightNumber !== null && previousEntry?.weight !== null && previousEntry?.weight !== undefined
      ? Number((weightNumber - previousEntry.weight).toFixed(1))
      : null;

  const waistNumber = waist === "" ? null : Number(waist);
  const waistChange =
    waistNumber !== null && previousEntry?.waist !== null && previousEntry?.waist !== undefined
      ? Number((waistNumber - previousEntry.waist).toFixed(1))
      : null;

  return (
    <div className="space-y-6 text-black">
      <div>
        <p className="text-sm text-zinc-500">Physique Log</p>
        <h1 className="text-3xl font-semibold tracking-tight">Body</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Track bodyweight, waist, and quick notes for the selected day.
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
            <h2 className="text-lg font-semibold">Latest Saved Entry</h2>

            {latestEntry ? (
              <div className="mt-4 rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">{formatShortDate(latestEntry.date)}</p>
                <p className="mt-2 text-lg font-semibold">
                  {latestEntry.weight ?? "—"} kg
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Waist: {latestEntry.waist ?? "—"}
                </p>
                {latestEntry.notes ? (
                  <p className="mt-2 text-sm text-zinc-600">{latestEntry.notes}</p>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">
                No body entries yet.
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-black">
            <h2 className="text-lg font-semibold">Change vs Previous Entry</h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Weight Change</p>
                <p className="mt-1 text-xl font-semibold">
                  {weightChange === null
                    ? "—"
                    : `${weightChange > 0 ? "+" : ""}${weightChange} kg`}
                </p>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Waist Change</p>
                <p className="mt-1 text-xl font-semibold">
                  {waistChange === null
                    ? "—"
                    : `${waistChange > 0 ? "+" : ""}${waistChange}`}
                </p>
              </div>
            </div>

            {previousEntry ? (
              <p className="mt-3 text-sm text-zinc-500">
                Compared against {formatShortDate(previousEntry.date)}.
              </p>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">
                No previous entry available yet.
              </p>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-black">
            <h2 className="text-lg font-semibold">Daily Body Entry</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Save one body entry per day.
            </p>

            <div className="mt-4 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-600">Weight (kg)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="85"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-zinc-600">Waist</label>
                  <input
                    type="number"
                    value={waist}
                    onChange={(e) => setWaist(e.target.value)}
                    placeholder="34"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-zinc-600">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Felt leaner, bloated, strong, slept badly..."
                  rows={5}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-black outline-none"
                />
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