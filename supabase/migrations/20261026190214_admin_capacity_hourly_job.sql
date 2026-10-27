-- Recorded once now, then independently of whether any admin browser is open.
create extension if not exists pg_cron;
do $$begin
  if exists(select 1 from cron.job where jobname='vacancy-admin-capacity-hourly') then
    raise exception 'Capacity job already exists; review before replacing';
  end if;
end $$;
select private.capture_admin_capacity_snapshot();
select cron.schedule('vacancy-admin-capacity-hourly','0 * * * *',
  $job$select private.capture_admin_capacity_snapshot();$job$);
