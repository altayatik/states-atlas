# Altay & Aidi's Road Atlas

A personal 50 states travel atlas built with React, Vite, MapLibre, local static map data, and optional Supabase-backed persistence. Public visitors can view the atlas, while writes are protected by a Supabase Edge Function.

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
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

If these are missing, the app uses localStorage fallback. If they exist, reads come from Supabase and writes go through the `states-admin` Edge Function.

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
