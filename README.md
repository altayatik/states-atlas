# Altay & Aidi's Road Atlas

A personal 50 states travel atlas built with React, Vite, MapLibre, local static map data, and optional Supabase-backed persistence. The public map currently focuses on clean state-level tracking, while writes are protected by a Supabase Edge Function.

- Source repo: `https://github.com/altayatik/states-atlas`
- Public deployment repo: `https://github.com/altayatik/states`
- Public URL: `https://altayatik.com/states/`
- Editor URL for now: `https://altayatik.com/states/#/edit`
- Preferred future editor URL: `https://altayatik.com/states-edit/`

## Local Dev

```bash
npm install
npm run dev
```

The Vite base path is `/states/`.

## Build

```bash
npm run build
```

## Deploy Frontend

```bash
npm run deploy
```

This deploys the built `dist` directory to GitHub Pages with the `/states/` base path.
The source repo is `altayatik/states-atlas`; the GitHub Pages deployment repo is `altayatik/states` so the public URL resolves at `/states/`.

The current editor route is deployed inside the same app at `/states/#/edit`. To deploy the preferred exact `/states-edit/` URL later without changing this app's public base, create a separate Pages deployment for that path, build with a `/states-edit/` base, and point it at the same source code/editor route.

The public header includes a small icon-only wrench link to `/states/#/edit`. The editor is still protected by the Supabase secret phrase gate.

The public `/states/` page is intentionally simple: header, compact stats, central map, selected detail panel, and achievements. City/metro and national park outlines are zoom-dependent supporting layers; they are hidden at the default view, appear only after zooming in, and do not use persistent text labels.

City and park editor options are powered by `src/data/stateTravelOptions.js`. Those options are curated travel starters, not exhaustive city lists. National park options include official "National Park" units only, not every NPS-managed site. States with no official national parks show a friendly empty message in the editor.

## Supabase Setup

Run the SQL in:

```text
supabase/migrations/20260623000000_create_state_travel_entries.sql
```

It creates `public.state_travel_entries`:

- `id uuid primary key default gen_random_uuid()`
- `state_code text not null unique`
- `state_name text not null`
- `status text not null`
- `first_visited_year int`
- `favorite_memory text`
- `badges text[] not null default '{}'`
- `vibe_rating int`
- `honorable_mention boolean not null default false`
- `cities_visited text[] not null default '{}'`
- `parks_visited text[] not null default '{}'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

RLS is enabled. Public reads are allowed:

```sql
alter table public.state_travel_entries enable row level security;

create policy "Public can read state travel entries"
on public.state_travel_entries
for select
using (true);
```

Direct public inserts, updates, and deletes are not granted. Writes go through the `states-admin` Edge Function using the service role key on the server side only.

The migration also installs the `updated_at` trigger:

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_state_travel_entries_updated_at on public.state_travel_entries;

create trigger set_state_travel_entries_updated_at
before update on public.state_travel_entries
for each row
execute function public.set_updated_at();
```

Reference setup SQL:

```sql
create table if not exists public.state_travel_entries (
  id uuid primary key default gen_random_uuid(),
  state_code text not null unique,
  state_name text not null,
  status text not null,
  first_visited_year int,
  favorite_memory text,
  badges text[] not null default '{}',
  vibe_rating int,
  honorable_mention boolean not null default false,
  cities_visited text[] not null default '{}',
  parks_visited text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint state_code_format check (state_code ~ '^[A-Z]{2}$'),
  constraint state_status_valid check (
    status in (
      'not_visited',
      'passed_through',
      'visited',
      'stayed_overnight',
      'lived_there',
      'favorite'
    )
  ),
  constraint first_visited_year_valid check (
    first_visited_year is null
    or first_visited_year between 1900 and 2100
  ),
  constraint vibe_rating_valid check (
    vibe_rating is null
    or vibe_rating between 1 and 5
  )
);

alter table public.state_travel_entries enable row level security;

drop policy if exists "Public can read state travel entries"
on public.state_travel_entries;

create policy "Public can read state travel entries"
on public.state_travel_entries
for select
using (true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_state_travel_entries_updated_at
on public.state_travel_entries;

create trigger set_state_travel_entries_updated_at
before update on public.state_travel_entries
for each row
execute function public.set_updated_at();

NOTIFY pgrst, 'reload schema';
```

## Supabase Secrets

Set these secrets in Supabase. Do not put real values in GitHub or frontend env files.

```bash
npx supabase secrets set ADMIN_SECRET_PHRASE="your-private-phrase"
npx supabase secrets set ADMIN_TOKEN_SECRET="$(openssl rand -base64 32)"
npx supabase secrets set ALLOWED_ORIGIN="https://altayatik.com"
```

If the project is not linked locally yet:

```bash
npx supabase link --project-ref your-project-ref
```

## Edge Function Deploy

```bash
npx supabase functions deploy states-admin --use-api --no-verify-jwt
```

The function expects:

- `ADMIN_SECRET_PHRASE`
- `ADMIN_TOKEN_SECRET`
- `ALLOWED_ORIGIN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEYS`

## Frontend Environment

Copy `.env.example` to `.env.local` locally:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_or_anon_key
VITE_DEV_EDITOR_PHRASE=
```

Vite bakes `VITE_*` variables into the static build. If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing before `npm run build` or `npm run deploy`, the deployed editor cannot call `states-admin` and will show: `Editor unlock is not configured yet. Check the Supabase function and secrets.`

If Supabase env vars are missing, the app uses localStorage for atlas entries. The editor does not unlock automatically. For local development only, set `VITE_DEV_EDITOR_PHRASE` in `.env.local` to enable a local editor token. Do not set that variable for production.

If Supabase env vars exist, public reads come from Supabase and writes go through the `states-admin` Edge Function. The public `/states/` page is read-only. The editor at `/states/#/edit` gates editing behind the secret phrase and unlocks only when the function returns `{ ok: true, adminToken: "..." }`. The frontend stores only the returned admin token in `sessionStorage` under `statesAtlasAdminToken`.

The editor uses a dropdown-first workflow: choose one state and edit that state inline. Changes autosave when closing the editor form, switching to another state, or returning to the public atlas. City and national park selections are stored as arrays in `cities_visited` and `parks_visited`; the frontend maps those to `citiesVisited` and `parksVisited`.

City and national park selections are editable and shown textually in the selected state detail panel. Existing city/park shapes are simplified visual approximations, not official boundaries, and only some selected cities/parks have local geometry today. Their public map outlines are subtle zoom-only layers, and clicked outlines update the selected detail panel without adding label clutter. Alaska and Hawaii are represented as atlas-style clickable SVG mini-map insets so they remain clean, recognizable, selectable, and status-colored without distorted geometry.

## Security Model

- Public visitors can read atlas data.
- Public visitors cannot directly create, update, or delete travel entries.
- Writes must go through the Supabase Edge Function.
- The real phrase lives only in Supabase secrets.
- The frontend never stores the real phrase in localStorage or sessionStorage.
- The frontend stores only a short-lived admin token in sessionStorage.
- Admin tokens expire after 2 hours.
- Service role keys are used only inside the Edge Function.
- No real secrets belong in GitHub.

## Troubleshooting

If PostgREST schema cache does not see new columns, run:

```sql
NOTIFY pgrst, 'reload schema';
```

If protected writes return `401`, the admin token may have expired or the phrase may be incorrect. The frontend clears failed tokens and asks for the phrase again.

If the editor unlock route returns the configuration message, confirm the `states-admin` function is deployed, the Supabase secrets are set, and `.env.local` contains `VITE_SUPABASE_URL` plus `VITE_SUPABASE_ANON_KEY` before rebuilding the frontend. Then redeploy:

```bash
npx supabase secrets set ADMIN_SECRET_PHRASE="your-private-phrase"
npx supabase functions deploy states-admin --use-api --no-verify-jwt
npm run deploy
```
