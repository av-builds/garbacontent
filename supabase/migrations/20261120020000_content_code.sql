-- FI = Full Ismaili (suitable for main prayer hall and everywhere)
-- CG = Clean Gujarati (Hindu references removed and verified; anywhere except prayer hall)
-- UG = Unfiltered Gujarati (may contain Gujarati/Hindu references; unknown)
-- IG = Ismaili and Gujarati mix (cleanliness unknown; treated as Gujarati)
alter table public.tracks
  add column content_code text check (content_code in ('FI', 'UG', 'CG', 'IG'));

alter table public.tracks drop constraint tracks_file_type_check;
alter table public.tracks
  add constraint tracks_file_type_check check (file_type in ('mp3', 'm4a', 'mp4', 'mpeg'));
