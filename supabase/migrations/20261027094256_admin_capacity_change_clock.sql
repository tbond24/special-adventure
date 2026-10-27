-- Expiry/concurrent-commit recovery only; ordinary changes record in their trigger.
-- The existing hourly history/job is deliberately preserved.
do $$begin
 if exists(select 1 from cron.job where jobname='vacancy-admin-capacity-clock') then
  raise exception 'Capacity clock job already exists; review before replacing';end if;
end $$;
select cron.schedule('vacancy-admin-capacity-clock','10 seconds',$job$select private.reconcile_admin_capacity_clock();$job$);
