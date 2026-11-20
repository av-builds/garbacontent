-- Time groups are not a concept in this app: planning is by total minutes.
alter table public.tracks drop column category_minutes;

-- Relabel by content code + running number (FI1, FI2, CG1 ...), ordered by file name.
with numbered as (
  select id, coalesce(content_code, 'T') || row_number() over (partition by content_code order by file_name) as new_label
  from public.tracks
)
update public.tracks t set label = n.new_label from numbered n where t.id = n.id;
