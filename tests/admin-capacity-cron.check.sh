#!/usr/bin/env bash
# Disposable CI cluster ONLY. No hosted URL, password or customer data.
set -euo pipefail
psql_test() { sudo -u postgres psql -p 55439 -d postgres -v ON_ERROR_STOP=1 "$@"; }
psql_test <<'SQL'
create schema private;
create table private.capacity_cron_probe(at timestamptz not null default clock_timestamp());
-- The actual aggregate/capture implementation is exercised by the PostgreSQL
-- regression. This stand-in makes background scheduler execution observable.
create function private.capture_admin_capacity_snapshot() returns void language sql as $$
 insert into private.capacity_cron_probe default values;
$$;
SQL
psql_test < supabase/migrations/20261026190214_admin_capacity_hourly_job.sql
test "$(psql_test -Atc "select count(*) from private.capacity_cron_probe")" = 1
test "$(psql_test -Atc "select count(*) from cron.job where jobname='vacancy-admin-capacity-hourly' and schedule='0 * * * *' and active and username='postgres'")" = 1
# Speed up only the disposable test job to prove actual worker execution.
psql_test -c "select cron.alter_job((select jobid from cron.job where jobname='vacancy-admin-capacity-hourly'),schedule:='1 second')"
seen=false
for attempt in {1..20}; do
 if test "$(psql_test -Atc 'select count(*) from private.capacity_cron_probe')" -gt 1; then seen=true;break;fi
 sleep 1
done
test "$seen" = true
psql_test -c "select cron.alter_job((select jobid from cron.job where jobname='vacancy-admin-capacity-hourly'),schedule:='0 * * * *')"
test "$(psql_test -Atc "select schedule from cron.job where jobname='vacancy-admin-capacity-hourly'")" = '0 * * * *'
# The migration must reject a collision instead of overwriting an existing job.
if psql_test < supabase/migrations/20261026190214_admin_capacity_hourly_job.sql; then
 echo 'FAIL: duplicate job was accepted';exit 1
fi
psql_test -c "select cron.alter_job((select jobid from cron.job where jobname='vacancy-admin-capacity-hourly'),active:=false)"
test "$(psql_test -Atc "select active from cron.job where jobname='vacancy-admin-capacity-hourly'")" = f
test "$(psql_test -Atc 'select count(*) from private.capacity_cron_probe')" -gt 1
echo 'PASS: exact cron migration installs, initializes, registers postgres hourly job, runs a real background worker, rejects replacement and disables without deleting history. Disposable probe collector only; no hosted activation.'
