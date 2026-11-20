alter table public.tracks
  add column song_type text not null default 'Garba'
  check (song_type in ('Garba', 'Ismaili Songs', 'Central Asian Content'));
