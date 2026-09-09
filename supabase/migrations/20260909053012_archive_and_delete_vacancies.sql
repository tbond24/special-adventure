alter table public.vacancies drop constraint if exists vacancies_status_check;
alter table public.vacancies add constraint vacancies_status_check
  check (status in ('draft','active','paused','expired','filled','archived','removed'));

alter table public.properties add column if not exists reference_code text;
alter table public.vacancies add column if not exists reference_code text;
update public.properties set reference_code='VAC-P-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)) where reference_code is null;
update public.vacancies set reference_code='VAC-L-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)) where reference_code is null;
alter table public.properties alter column reference_code set not null;
alter table public.vacancies alter column reference_code set not null;
alter table public.properties alter column reference_code set default ('VAC-P-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)));
alter table public.vacancies alter column reference_code set default ('VAC-L-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)));
create unique index if not exists properties_reference_code_key on public.properties(reference_code);
create unique index if not exists vacancies_reference_code_key on public.vacancies(reference_code);
