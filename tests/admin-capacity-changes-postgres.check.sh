#!/usr/bin/env bash
# Fresh disposable cluster port 55439 only; no hosted credentials or URLs.
set -euo pipefail
psql_test() { sudo -u postgres psql -X -p 55439 -d postgres -v ON_ERROR_STOP=1 "$@"; }
psql_test < tests/fixtures/admin-capacity-change-postgres.sql
python3 - <<'PY' | psql_test
import json
for r in json.load(open('tests/fixtures/admin-account-hierarchy-baseline.json')):
 if r['proname'] in ['is_admin','is_active_user']:print(r['definition']+';')
PY
psql_test < supabase/migrations/20261026185940_admin_capacity_snapshots.sql
psql_test < supabase/migrations/20261026190214_admin_capacity_hourly_job.sql
old_history=$(psql_test -Atc "select md5(jsonb_agg(to_jsonb(s) order by hour_at)::text) from private.admin_capacity_snapshots s")
psql_test < supabase/migrations/20261027094055_admin_capacity_change_observations.sql
psql_test < supabase/migrations/20261027094256_admin_capacity_change_clock.sql
test "$(psql_test -Atc "select count(*) from cron.job where jobname='vacancy-admin-capacity-clock' and schedule='10 seconds' and username='postgres' and active")" = 1
# Hold the nonblocking observation lock while 100 synthetic source writes commit.
# Writers must finish without waiting for this lock; queued hints reconcile later.
psql_test -c 'begin;select pg_advisory_xact_lock(196733,27094055);select pg_sleep(8);commit' > /tmp/vacancy-capacity-lock.log &
lock_pid=$!
for attempt in {1..30}; do
 if test "$(psql_test -Atc 'select count(*) from pg_locks where locktype=$$advisory$$ and classid=196733 and objid=27094055 and granted')" -gt 0; then break;fi
 sleep .1
done
worker_pids=()
for worker in {0..9}; do
 file="/tmp/vacancy-capacity-worker-$worker.sql"
 for offset in {0..9}; do
  id=$((100+worker*10+offset))
  echo "insert into storage.objects values($id,'room-media','{\"size\":100}');"
 done > "$file"
 psql_test -f "$file" > "/tmp/vacancy-capacity-worker-$worker.log" &
 worker_pids+=("$!")
done
for pid in "${worker_pids[@]}"; do wait "$pid";done
# If writes blocked on the observation lock, this process would already be gone.
kill -0 "$lock_pid"
test "$(psql_test -Atc 'select count(*) from storage.objects where id>=100')" = 100
test "$(psql_test -Atc 'select count(*) from private.admin_capacity_pending')" -ge 100
wait "$lock_pid"
seen=false
for attempt in {1..25}; do
 if test "$(psql_test -Atc 'select storage_bytes from private.admin_capacity_observations order by id desc limit 1')" = 6010000;then seen=true;break;fi
 sleep 1
done
test "$seen" = true
test "$(psql_test -Atc 'select count(*) from private.admin_capacity_pending')" = 0
psql_test -c "insert into public.vacancies values(99,1,'active',clock_timestamp()+interval '2 seconds')"
test "$(psql_test -Atc 'select live_listings from private.admin_capacity_observations order by id desc limit 1')" = 3
seen=false
for attempt in {1..25}; do
 if test "$(psql_test -Atc 'select live_listings from private.admin_capacity_observations order by id desc limit 1')" = 2;then seen=true;break;fi
 sleep 1
done
test "$seen" = true
test "$(psql_test -Atc "select count(*) from cron.job_run_details where jobid=(select jobid from cron.job where jobname='vacancy-admin-capacity-clock') and status='succeeded'")" -ge 1
if psql_test < supabase/migrations/20261027094256_admin_capacity_change_clock.sql;then echo 'FAIL: duplicate clock job accepted';exit 1;fi
test "$(psql_test -Atc "select md5(jsonb_agg(to_jsonb(s) order by hour_at)::text) from private.admin_capacity_snapshots s")" = "$old_history"
retained=$(psql_test -Atc 'select count(*) from private.admin_capacity_observations')
psql_test < supabase/rollback/admin_capacity_changes_20261027.sql
test "$(psql_test -Atc 'select count(*) from private.admin_capacity_observations')" = "$retained"
test "$(psql_test -Atc "select active from cron.job where jobname='vacancy-admin-capacity-clock'")" = f
test "$(psql_test -Atc "select active from cron.job where jobname='vacancy-admin-capacity-hourly'")" = t
echo 'PASS: actual PostgreSQL concurrency (100 source writes, ten workers) never waits on the observation lock; transactional hints and real scheduled worker reconcile committed totals; clock-only expiry records/pushes without Admin; job collision rejected; old hourly history/job and new observations survive scoped rollback.'
