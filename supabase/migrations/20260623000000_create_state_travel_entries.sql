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
  constraint state_travel_entries_state_code_check check (state_code ~ '^[A-Z]{2}$'),
  constraint state_travel_entries_state_name_check check (char_length(state_name) between 1 and 80),
  constraint state_travel_entries_status_check check (
    status in ('not_visited', 'passed_through', 'visited', 'stayed_overnight', 'lived_there', 'favorite')
  ),
  constraint state_travel_entries_first_visited_year_check check (
    first_visited_year is null or first_visited_year between 1900 and 2100
  ),
  constraint state_travel_entries_favorite_memory_check check (
    favorite_memory is null or char_length(favorite_memory) <= 1000
  ),
  constraint state_travel_entries_vibe_rating_check check (
    vibe_rating is null or vibe_rating between 1 and 5
  )
);

alter table public.state_travel_entries enable row level security;

drop policy if exists "Public can read state travel entries" on public.state_travel_entries;

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

drop trigger if exists set_state_travel_entries_updated_at on public.state_travel_entries;

create trigger set_state_travel_entries_updated_at
before update on public.state_travel_entries
for each row
execute function public.set_updated_at();
