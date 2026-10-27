-- Stop only this repair. Preserve all old/new observations, pending hints, tables,
-- denied helper grants, previous live notifications and the original hourly job.
do $$begin
 if exists(select 1 from cron.job where jobname='vacancy-admin-capacity-clock') then
  perform cron.alter_job((select jobid from cron.job where jobname='vacancy-admin-capacity-clock'),active:=false);
 end if;
end $$;
drop trigger if exists vacancy_capacity_observe on storage.objects;
drop trigger if exists vacancy_capacity_observe on public.vacancies;
drop trigger if exists vacancy_capacity_observe on public.rooms;
drop trigger if exists vacancy_capacity_observe on public.properties;
drop trigger if exists vacancy_capacity_observe on public.profiles;
revoke execute on function public.admin_capacity_changes(timestamptz,timestamptz) from authenticated;
revoke execute on function private.admin_capacity_changes_impl(timestamptz,timestamptz) from authenticated;
-- Restore frontend dpl_AvcszD5rUieYjgEAQXeRxinwn2q2, which uses the unchanged v1 API.
