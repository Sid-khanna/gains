# Gains — Fitness Tracking App

## Project Overview

A personal fitness and wellness tracker for logging workouts, daily nutrition, body measurements, and viewing progress over time.

**Core user flows:**
1. Sign up / log in via email authentication
2. Dashboard shows a daily snapshot of training, nutrition, and body metrics
3. Log workouts with exercise history and previous performance lookup
4. Track daily macros (default targets: 2200 cal / 180g protein)
5. Record body weight and waist measurements, compare against prior entries
6. View progress charts across multiple time periods

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 (strict) |
| UI | React 19, shadcn/ui (New York), Radix UI, Lucide icons |
| Styling | Tailwind CSS 3.4, next-themes (dark mode) |
| Database + Auth | Supabase (PostgreSQL + Supabase Auth via `@supabase/ssr`) |
| Linting | ESLint 9 with Next.js config |

## Key Directories

```
app/                  # Next.js App Router pages
  auth/               # Login, sign-up, forgot/update password, OAuth callback
  dashboard/          # Daily snapshot (workout + diet + body)
  workout/            # Exercise logging (CRUD, set tracking)
  diet/               # Daily macro tracking
  body/               # Weight / waist measurements
  progress/           # Analytics and charts
  settings/           # User settings (placeholder)
  layout.tsx          # Root layout — navigation bar + ThemeProvider
components/
  ui/                 # shadcn/ui primitives (Button, Card, Input, …)
  login-form.tsx      # Client-side auth forms
  auth-button.tsx     # Server component: shows user info or login link
lib/
  supabase/
    client.ts         # Browser Supabase client
    server.ts         # Server Supabase client (cookie-based session)
  utils.ts            # cn() helper, hasEnvVars check
```

## Essential Commands

```bash
npm run dev     # Start dev server (http://localhost:3000)
npm run build   # Production build
npm run start   # Run production server
npm run lint    # ESLint check
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

## Database Tables (inferred)

| Table | Key Columns |
|---|---|
| `weekly_split` | `id`, `day_of_week`, `label`, `targets` (JSONB) |
| `workout_entries` | `id`, `date`, `exercise_name`, `muscle_group`, `sets_data` (JSONB) |
| `exercises` | `id`, `name`, `muscle_group` |
| `diet_entries` | `id`, `date`, `calories`, `protein`, `carbs`, `fat` |
| `body_entries` | `id`, `date`, `weight`, `waist`, `notes` |

## Key File References

- Root navigation: `app/layout.tsx:23`
- Dashboard parallel queries: `app/dashboard/page.tsx:158`
- Workout CRUD + set management: `app/workout/page.tsx:98`
- Diet entry form: `app/diet/page.tsx:104`
- Body upsert logic: `app/body/page.tsx:160`
- Browser Supabase client: `lib/supabase/client.ts:1`
- Server Supabase client: `lib/supabase/server.ts:9`
- Auth sign-in flow: `components/login-form.tsx:29`

## Additional Documentation

- [Architectural Patterns](.claude/docs/architectural_patterns.md) — state management, Supabase usage, component and auth patterns
