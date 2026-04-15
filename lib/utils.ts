import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// --- Workout utility types (structural — compatible with page-local types) ---

type LoggedSet = { weight: number | null; reps: number | null };
type WorkoutEntry = {
  date: string;
  muscle_group?: string;
  sets_data: LoggedSet[] | null;
};

// --- Set metric helpers ---

export function getTopWeight(setsData: LoggedSet[] | null): number {
  if (!setsData || setsData.length === 0) return 0;
  return setsData.reduce((max, set) => Math.max(max, set.weight ?? 0), 0);
}

export function getTotalVolume(setsData: LoggedSet[] | null): number {
  if (!setsData || setsData.length === 0) return 0;
  return setsData.reduce((sum, set) => {
    const weight = set.weight ?? 0;
    const reps = set.reps ?? 0;
    return sum + weight * reps;
  }, 0);
}

// --- Date helpers ---

export function getWeekStartISO(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

// --- Performance analysis helpers ---

export function getProgressDelta(
  curr: LoggedSet[] | null,
  prev: LoggedSet[] | null,
  metric: "top_weight" | "volume"
): { delta: number; direction: "up" | "down" | "same" } {
  const fn = metric === "top_weight" ? getTopWeight : getTotalVolume;
  const delta = fn(curr) - fn(prev);
  return {
    delta,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "same",
  };
}

/**
 * Detects whether an exercise has plateaued.
 * @param entries  Sorted ascending by date (oldest first).
 * @param sessionCount  Number of recent sessions to evaluate (default 4).
 * @param threshold  Minimum fractional volume increase to count as progress (default 2.5%).
 * @returns true if none of the last sessionCount adjacent pairs show improvement.
 */
export function detectPlateau(
  entries: WorkoutEntry[],
  sessionCount = 4,
  threshold = 0.025
): boolean {
  if (entries.length < sessionCount) return false;
  const recent = entries.slice(-sessionCount);
  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1];
    const curr = recent[i];
    const prevVol = getTotalVolume(prev.sets_data);
    const currVol = getTotalVolume(curr.sets_data);
    const weightImproved =
      getTopWeight(curr.sets_data) > getTopWeight(prev.sets_data);
    const volImproved = prevVol > 0 && currVol > prevVol * (1 + threshold);
    if (weightImproved || volImproved) return false;
  }
  return true;
}

const UPPER_BODY = new Set(["Chest", "Shoulders", "Biceps", "Triceps"]);
const COMPOUND_LOWER = new Set(["Back", "Legs"]);

/**
 * Suggests the next weight to attempt based on the last session's sets.
 * If every set hit targetReps, bumps by 2.5 kg (upper body) or 5 kg (lower body).
 * Otherwise returns the current top weight (same weight suggested).
 */
export function getSuggestedWeight(
  setsData: LoggedSet[] | null,
  muscleGroup: string,
  targetReps = 8
): number | null {
  if (!setsData || setsData.length === 0) return null;
  const validSets = setsData.filter((s) => s.weight !== null);
  if (validSets.length === 0) return null;
  const topWeight = getTopWeight(setsData);
  const allHitTarget = validSets.every(
    (s) => s.reps !== null && s.reps >= targetReps
  );
  if (!allHitTarget) return topWeight;
  if (UPPER_BODY.has(muscleGroup)) return topWeight + 2.5;
  if (COMPOUND_LOWER.has(muscleGroup)) return topWeight + 5;
  return topWeight;
}

/**
 * Aggregates total training volume (weight × reps) per muscle group
 * for entries whose date falls within [weekStart, weekEnd] (inclusive, ISO strings).
 */
export function computeWeeklyMuscleVolume(
  entries: WorkoutEntry[],
  weekStart: string,
  weekEnd: string
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const entry of entries) {
    if (entry.date < weekStart || entry.date > weekEnd) continue;
    const group = entry.muscle_group ?? "Other";
    result[group] = (result[group] ?? 0) + getTotalVolume(entry.sets_data);
  }
  return result;
}
