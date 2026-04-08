export default function WorkoutPage() {
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
                className="w-full rounded-xl border px-3 py-2 outline-none"
              />
            </div>
            <div className="mt-4 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
              Wednesday · April 8, 2026
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5">
            <h2 className="text-lg font-semibold">Today’s Plan</h2>
            <p className="mt-1 text-sm text-zinc-500">
              This will come from your weekly split.
            </p>

            <div className="mt-4 rounded-xl bg-zinc-50 p-4">
              <p className="font-medium">Chest + Triceps + Abs</p>
              <div className="mt-3 space-y-2 text-sm text-zinc-700">
                <div className="flex items-center justify-between">
                  <span>Chest</span>
                  <span>3 exercises</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Triceps</span>
                  <span>2 exercises</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Abs</span>
                  <span>2 exercises</span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5">
            <h2 className="text-lg font-semibold">Progress</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Later this will update automatically from logged exercises.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Chest</p>
                <p className="mt-1 text-xl font-semibold">0 / 3</p>
              </div>
              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Triceps</p>
                <p className="mt-1 text-xl font-semibold">0 / 2</p>
              </div>
              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Abs</p>
                <p className="mt-1 text-xl font-semibold">0 / 2</p>
              </div>
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
                  placeholder="Lat Pulldown"
                  className="w-full rounded-xl border px-3 py-2 outline-none"
                />
              </div>

              <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
                Last time: 140 × 9 · 3 sets · Apr 6
              </div>

              <div className="space-y-2">
                <label className="text-sm text-zinc-600">Muscle Group</label>
                <select className="w-full rounded-xl border px-3 py-2 outline-none">
                  <option>Back</option>
                  <option>Chest</option>
                  <option>Shoulders</option>
                  <option>Biceps</option>
                  <option>Triceps</option>
                  <option>Legs</option>
                  <option>Abs</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-600">Weight</label>
                  <input
                    type="number"
                    placeholder="140"
                    className="w-full rounded-xl border px-3 py-2 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-600">Reps</label>
                  <input
                    type="number"
                    placeholder="9"
                    className="w-full rounded-xl border px-3 py-2 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-600">Sets</label>
                  <input
                    type="number"
                    placeholder="3"
                    className="w-full rounded-xl border px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <button className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white">
                Add Exercise
              </button>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5">
            <h2 className="text-lg font-semibold">Logged Exercises</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Entries for the selected date will appear here.
            </p>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">Lat Pulldown</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Back · 140 × 9 · 3 sets
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-lg border px-3 py-1.5 text-sm">
                      Edit
                    </button>
                    <button className="rounded-lg border px-3 py-1.5 text-sm">
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-dashed p-4 text-sm text-zinc-500">
                More entries will show here as you log them.
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}