create extension if not exists pgcrypto;

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  title text not null,
  duration_seconds integer not null check (duration_seconds >= 0),
  category_minutes integer not null check (category_minutes in (5,20,25,40,50,60)),
  file_name text not null,
  storage_path text,
  file_type text not null check (file_type in ('mp3','m4a','mp4')),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  session_date date not null,
  day_of_week text generated always as ((array['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'])[extract(dow from session_date)::int + 1]) stored,
  target_minutes integer not null default 75,
  start_time time,
  notes text,
  created_at timestamptz not null default now()
);

create table public.session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  track_id uuid not null references public.tracks(id),
  position integer not null,
  pinned boolean not null default false
);
create index on public.session_items(session_id, position);

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger tracks_touch before update on public.tracks
  for each row execute function public.touch_updated_at();

-- RLS. TODO: tighten with Supabase Auth. For now the app-level shared
-- password gate is the only protection; anon may read/write.
alter table public.tracks enable row level security;
alter table public.sessions enable row level security;
alter table public.session_items enable row level security;
create policy "anon all tracks" on public.tracks for all to anon using (true) with check (true);
create policy "anon all sessions" on public.sessions for all to anon using (true) with check (true);
create policy "anon all session_items" on public.session_items for all to anon using (true) with check (true);

insert into storage.buckets (id, name, public) values ('garba-audio','garba-audio',false)
  on conflict (id) do nothing;
create policy "anon audio all" on storage.objects for all to anon
  using (bucket_id = 'garba-audio') with check (bucket_id = 'garba-audio');
