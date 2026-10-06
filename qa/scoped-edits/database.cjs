const fs=require('fs'),{spawnSync}=require('child_process');const runtime='C:/Users/PC/Documents/Codex/vacancy-marketing-postgres-test-20261005';
const png="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAzklEQVR4AeyVsQ2EQBADEX3RCP33AbkTyyLCnpc+ON0GeDwL53Nfz/L/PMZ/ABgX4MAADBgnwAqMC8BLkBVgBcYJsALjAux9BbRwVkCJrJ0xYK1xzYsBSmTtjAFrjWteDFAia2cMWGtc82KAElk7Y0B74y4fBjhC7fcY0N6wy4cBjlD7PQa0N+zyYYAj1H6PAe0Nu3wY4Ai132NAW8NpHgxIibXNY0Bbo2keDEiJtc1jQFujaR4MSIm1zWNAW6NpHgxIibXNY8DfG/36/C8AAAD//4VhMwMAAAAGSURBVAMAW9elwR27evIAAAAASUVORK5CYII=";
const migration=fs.readFileSync('supabase/migrations/20261006135232_scoped_activity_unique_clicks_favicon.sql','utf8');const baseline=fs.readFileSync('supabase/migrations/20261002085303_owner_metrics_exclude_self_and_unread.sql','utf8');
const sql=`do $$ begin if current_database()<>'vacancy_marketing_test' or host(inet_server_addr())<>'127.0.0.1' or inet_server_port()<>55432 or shobj_description((select oid from pg_database where datname=current_database()),'pg_database') is distinct from 'vacancy-marketing-synthetic-only' then raise exception 'Wrong target';end if;end $$;
begin;
alter table public.analytics_events add column if not exists route text;
alter table public.analytics_events alter column created_at set default now();
create table if not exists auth.users(id uuid primary key,created_at timestamptz,is_anonymous boolean);
create table if not exists public.conversations(id uuid primary key,vacancy_id uuid);
create table if not exists public.conversation_members(conversation_id uuid,user_id uuid,last_read_at timestamptz);
create table if not exists public.messages(id uuid primary key,conversation_id uuid,sender_id uuid,created_at timestamptz);
${baseline}
create temp table baseline_function as select pg_get_functiondef('public.owner_dashboard_metrics(timestamptz,timestamptz)'::regprocedure) definition;
${migration}
insert into public.properties values(md5('scope-property')::uuid,md5('scope-owner')::uuid);
insert into public.rooms values(md5('scope-room')::uuid,md5('scope-property')::uuid);
insert into public.vacancies values(md5('scope-v1')::uuid,md5('scope-room')::uuid),(md5('scope-v2')::uuid,md5('scope-room')::uuid);
insert into public.analytics_events(event_name,vacancy_id,visitor_id,user_id,created_at) values
 ('vacancy_opened',md5('scope-v1')::uuid,md5('browser1')::uuid,null,'2026-10-01Z'),
 ('vacancy_opened',md5('scope-v1')::uuid,md5('browser1')::uuid,null,'2026-10-02Z'),
 ('vacancy_opened',md5('scope-v2')::uuid,md5('browser1')::uuid,null,'2026-10-02Z'),
 ('vacancy_opened',md5('scope-v1')::uuid,null,md5('visitor1')::uuid,'2026-10-01Z'),
 ('vacancy_opened',md5('scope-v1')::uuid,md5('other-device')::uuid,md5('visitor1')::uuid,'2026-10-02Z'),
 ('vacancy_opened',md5('scope-v1')::uuid,null,null,'2026-10-02Z'),
 ('vacancy_opened',md5('scope-v1')::uuid,null,md5('scope-owner')::uuid,'2026-10-02Z'),
 ('vacancy_opened',md5('scope-v1')::uuid,null,'00000000-0000-4000-8000-000000000001','2026-10-02Z'),
 ('vacancy_opened',md5('scope-v1')::uuid,md5('end-boundary')::uuid,null,'2026-10-03Z');
set role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',md5('scope-owner')::uuid,'aal','aal1')::text,true);
select public.qa_assert((public.owner_dashboard_metrics('2026-10-01Z','2026-10-03Z')->>'clicks')::int=3,'period unique clicks: repeated days/devices deduplicated; separate listings count separately; owner/admin excluded; exclusive end');
select public.qa_assert((public.owner_dashboard_metrics('2026-10-01Z','2026-10-03Z')->>'unidentified_click_events')::int=1,'unidentified historical clicks reported separately');
select public.qa_assert((public.owner_dashboard_metrics('2026-10-02Z','2026-10-03Z')->>'clicks')::int=3,'narrowed period deduplicates independently');
do $$ begin perform public.admin_recent_activity();raise exception 'FAIL non-admin';exception when insufficient_privilege then raise notice 'PASS non-admin activity denied';end $$;
do $$ begin perform public.admin_set_favicon(null,0);raise exception 'FAIL non-admin favicon';exception when insufficient_privilege then raise notice 'PASS non-admin favicon denied';end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","aal":"aal1"}',true);
do $$ begin perform public.admin_recent_activity();raise exception 'FAIL AAL1';exception when insufficient_privilege then raise notice 'PASS AAL1 activity denied';end $$;
do $$ begin perform public.admin_favicon();raise exception 'FAIL AAL1 favicon';exception when insufficient_privilege then raise notice 'PASS AAL1 favicon denied';end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","aal":"aal2"}',true);
select public.qa_assert(public.admin_recent_activity()->>'generated_at' is not null,'AAL2 admin activity allowed');
select public.qa_assert((public.admin_set_favicon('${png}',0)->>'revision')::int=1,'AAL2 favicon write allowed');
create temp table first_report as select public.admin_recent_activity() report;
select pg_sleep(0.01);
select public.qa_assert((public.admin_recent_activity()->>'generated_at')::timestamptz>(select (report->>'generated_at')::timestamptz from first_report),'report timestamp generated afresh');

do $$ begin perform public.admin_set_favicon(null,0);raise exception 'FAIL revision';exception when raise_exception then if SQLERRM like 'FAIL%' then raise;end if;raise notice 'PASS stale favicon revision denied';end $$;
do $$ begin perform public.admin_set_favicon('data:image/svg+xml,<svg/>',1);raise exception 'FAIL format';exception when raise_exception then if SQLERRM like 'FAIL%' then raise;end if;raise notice 'PASS unsafe favicon rejected';end $$;
reset role;
grant insert on public.analytics_events to anon,authenticated;
grant usage,select on sequence public.analytics_events_id_seq to anon,authenticated;
create policy scoped_anon_insert on public.analytics_events for insert to anon with check(user_id is null);
create policy scoped_auth_insert on public.analytics_events for insert to authenticated with check(user_id=auth.uid());
set role anon;
select set_config('request.jwt.claims','{}',true);
select public.track_listing_open(md5('scope-v1')::uuid,md5('scoped-anon-browser')::uuid);
reset role;
select public.qa_assert(exists(select 1 from public.analytics_events where visitor_id=md5('scoped-anon-browser')::uuid and user_id is null and event_name='vacancy_opened'),'anonymous click RPC records browser ID using existing insert-policy contract');
set role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',md5('scope-owner')::uuid,'aal','aal1')::text,true);
select public.track_listing_open(md5('scope-v1')::uuid,md5('scoped-auth-browser')::uuid);
reset role;
select public.qa_assert(exists(select 1 from public.analytics_events where visitor_id=md5('scoped-auth-browser')::uuid and user_id=md5('scope-owner')::uuid),'authenticated click RPC derives user identity from claims');
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","aal":"aal2"}',true);
select public.qa_assert(public.admin_set_favicon(null,1,true)->>'png' is null,'restore original favicon after valid PNG save');
set role anon;
select set_config('request.jwt.claims','{}',true);
select public.qa_assert((select revision from public.site_favicon)=2,'public can read current favicon');
do $$ begin perform public.admin_recent_activity();raise exception 'FAIL anon';exception when insufficient_privilege then raise notice 'PASS anonymous activity denied';end $$;
do $$ begin perform public.admin_favicon();raise exception 'FAIL anon favicon';exception when insufficient_privilege then raise notice 'PASS anonymous favicon admin denied';end $$;
do $$ begin update public.site_favicon set png=null;raise exception 'FAIL public write';exception when insufficient_privilege then raise notice 'PASS direct favicon mutation denied';end $$;
reset role;
${baseline}
select public.qa_assert((select definition from baseline_function)=pg_get_functiondef('public.owner_dashboard_metrics(timestamptz,timestamptz)'::regprocedure),'owner function recovery exact');
rollback;
select public.qa_assert(to_regclass('public.site_favicon') is null,'test migration rolled back');
`;
fs.writeFileSync('qa/scoped-edits/database.sql',sql);const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.toUpperCase().startsWith('PG')));env.PGPASSFILE=runtime+'/pgpass.conf';const r=spawnSync(runtime+'/runtime/pgsql/bin/psql.exe',['-X','-h','127.0.0.1','-p','55432','-U','vacancy_qa','-w','-d','vacancy_marketing_test','-v','ON_ERROR_STOP=1','-f','qa/scoped-edits/database.sql'],{env,encoding:'utf8',timeout:60000});fs.writeFileSync('qa/scoped-edits/database-results.txt',(r.stdout||'')+'\n'+(r.stderr||''));console.log(r.stderr);if(r.status!==0)process.exit(1);
