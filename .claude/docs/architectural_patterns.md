# Architectural Patterns

Recurring decisions and conventions found across the codebase.

---

## State Management

All pages are Client Components (`"use client"`) and manage state locally with `useState` / `useEffect`. There is no shared state layer (no Redux, Zustand, or React Context).

**Pattern:** Each page owns all the state it needs; sibling pages do not share state.

Example locations:
- `app/workout/page.tsx:98` — multiple `useState` hooks for form fields, entries, UI toggles
- `app/diet/page.tsx:104` — local state for macro inputs and fetched entry
- `app/body/page.tsx:40` — local state for weight/waist inputs and history list

---

## Supabase Data Fetching

### Client-side (all main pages)

Pages import the browser client and call Supabase directly inside `useEffect`:

```
// lib/supabase/client.ts — createBrowserClient() wrapper
const supabase = createClient();

useEffect(() => {
  async function load() {
    const { data, error } = await supabase.from("table").select("...");
    if (!error && data) setState(data);
  }
  load();
}, [supabase]);
```

Key locations: `app/workout/page.tsx:164`, `app/diet/page.tsx:120`, `app/body/page.tsx:80`

### Server-side (auth-aware components)

Server Components use the async server client that reads cookies:

```
// lib/supabase/server.ts — createServerClient() with cookie adapter
const supabase = await createClient();
const { data } = await supabase.auth.getClaims();
```

Key locations: `components/auth-button.tsx:6`, `lib/supabase/server.ts:9`

### Parallel queries (dashboard)

The dashboard fetches all needed data in one `Promise.all` to avoid waterfalls:

```
const [splitRes, workoutRes, dietRes, bodyRes, weekDietRes] = await Promise.all([...]);
```

Location: `app/dashboard/page.tsx:158`

---

## Upsert Pattern

Pages check whether a record exists for the current date before deciding to `insert` or `update`. No Supabase `.upsert()` is used; the check is manual.

Location: `app/body/page.tsx:160`

---

## Row Types

Each page defines its own TypeScript types that mirror the Supabase table columns. Types are local to the file — there is no shared `types/` directory.

```ts
type WorkoutEntryRow = { id: string; date: string; exercise_name: string; ... };
```

Locations: `app/dashboard/page.tsx:7`, `app/workout/page.tsx:1`, `app/body/page.tsx:1`

---

## Authentication Flow

1. `components/login-form.tsx` — client-side `supabase.auth.signInWithPassword()`, then `router.push()`
2. `components/sign-up-form.tsx` — `supabase.auth.signUp()`, redirects to sign-up-success
3. `app/auth/confirm/route.ts` — server Route Handler exchanges the auth code for a session
4. `components/auth-button.tsx` — server component reads session via `supabase.auth.getClaims()`

Sessions are stored in cookies via `@supabase/ssr`; no JWT handling in application code.

---

## Component Structure

- **Pages** (`app/*/page.tsx`): single large Client Component with all state, queries, and JSX.
- **Shared UI**: primitives live in `components/ui/` (shadcn/ui wrappers — Button, Card, Input, Badge, Checkbox, DropdownMenu).
- **Feature components** (`components/login-form.tsx`, etc.): focused on a single responsibility, imported by pages.
- There are no compound component patterns or render-prop patterns.

---

## Date Utilities

Date helper functions (`getTodayISO`, `getDayName`, `formatLongDate`, `formatShortDate`) are duplicated inline in each page rather than imported from a shared module.

If consolidating, the natural home is `lib/utils.ts`.

Location of one canonical set: `app/workout/page.tsx:43`

---

## Derived / Computed Values

`useMemo` is used for values that depend on fetched data (e.g., weight-change delta, filtered exercise list).

Locations: `app/body/page.tsx:209`, `app/workout/page.tsx:142`
