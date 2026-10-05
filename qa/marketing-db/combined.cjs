// Execute exact final migrations on the approved existing local synthetic cluster.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const out=path.resolve(root,'../marketing-checkpoint-artifacts/combined-migrations');fs.mkdirSync(out,{recursive:true});
const runtime='C:/Users/PC/Documents/Codex/vacancy-marketing-postgres-test-20261005';
const generated=read('supabase/migrations/20261004231152_admin_marketing_generated_at.sql');
const optimized=read('supabase/migrations/20261005003252_admin_marketing_property_first_once.sql');
const reverse=read('docs/rollback/admin-marketing-property-first-once.sql');
const checks=read('qa/marketing-db/checks.sql');
const authorization=checks.slice(checks.indexOf('set role anon;'),checks.indexOf("set timezone='Australia/Perth';"));
const call=`public.admin_lister_marketing('2026-01-01 00:00Z','2026-01-02 00:00Z')`;
const snapshot=name=>`create temp table ${name} as select pg_get_functiondef(oid) definition,proowner,proacl,proconfig,prosecdef from pg_proc where oid='public.admin_lister_marketing(timestamptz,timestamptz)'::regprocedure;`;
const security=name=>`select public.qa_assert((select row(p.proowner,p.proacl,p.proconfig,p.prosecdef) is not distinct from row(b.proowner,b.proacl,b.proconfig,b.prosecdef) from pg_proc p cross join ${name} b where p.oid='public.admin_lister_marketing(timestamptz,timestamptz)'::regprocedure),'owner ACL search_path SECURITY DEFINER preserved');
select public.qa_assert(not has_function_privilege('anon','public.admin_lister_marketing(timestamptz,timestamptz)','execute') and has_function_privilege('authenticated','public.admin_lister_marketing(timestamptz,timestamptz)','execute'),'RPC grants preserved');`;
const exact=name=>`select public.qa_assert((select pg_get_functiondef('public.admin_lister_marketing(timestamptz,timestamptz)'::regprocedure)=definition from ${name}),'exact saved function definition restored');${security(name)}`;
const sql=`
do $$ begin if current_database()<>'vacancy_marketing_test' or host(inet_server_addr())<>'127.0.0.1' or inet_server_port()<>55432 or shobj_description((select oid from pg_database where datname=current_database()),'pg_database') is distinct from 'vacancy-marketing-synthetic-only' then raise exception 'Wrong target'; end if;end $$;
${snapshot('initial_function')}
begin;
create index if not exists rooms_property_idx on public.rooms(property_id);
create index if not exists vacancies_room_idx on public.vacancies(room_id);
${generated}
${snapshot('generated_function')}
${read('qa/marketing-db/publication-identity.sql')}
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","aal":"aal2"}',true);
create function pg_temp.canonical(j jsonb) returns jsonb language sql as $$ select jsonb_build_object('events',(select coalesce(jsonb_agg(e order by e->>'id'),'[]'::jsonb) from jsonb_array_elements(j->'events')e),'publications',(select coalesce(jsonb_agg(p order by p->>'vacancy_id'),'[]'::jsonb) from jsonb_array_elements(j->'publications')p)); $$;
create temp table expected as select pg_temp.canonical(${call}) j;
grant select on expected to authenticated;
${optimized}
${security('generated_function')}
${authorization}
do $$ declare j jsonb;begin
 j:=${call};
 perform public.qa_assert(pg_temp.canonical(j)=(select e.j from expected e),'full report equivalent to pre-optimization migration including attribution and property flags');
 perform public.qa_assert(jsonb_array_length(j->'publications')=6,'six listing publications across three properties');
 perform public.qa_assert((select count(distinct p->>'vacancy_id') from jsonb_array_elements(j->'publications')p)=6,'each distinct listing counted once');
 perform public.qa_assert((select count(*) from jsonb_array_elements(j->'publications')p where p->>'property_id'=md5('identity-p1')::uuid::text)=3,'three listings in one property remain three publications');
 perform public.qa_assert((select count(*) from jsonb_array_elements(j->'publications')p where p->>'property_id'=md5('identity-p1')::uuid::text and (p->>'is_first_property_publication')::boolean)=2,'simultaneous property-first ties retain both listings');
 perform public.qa_assert((select count(*) from jsonb_array_elements(j->'publications')p where p->>'property_id'=md5('identity-p2')::uuid::text and not (p->>'is_first_property_publication')::boolean)=2,'two new listings count despite earlier property publication outside range');
 perform public.qa_assert(not exists(select 1 from jsonb_array_elements(j->'publications')p where p->>'vacancy_id' in (md5('identity-v4')::uuid::text,md5('identity-v7')::uuid::text,md5('identity-v8')::uuid::text,md5('identity-v10')::uuid::text)),'republication redundant-active end-boundary and never-active excluded');
 perform public.qa_assert((select array_agg(k order by k) from jsonb_object_keys(j)k)=array['events','generated_at','publications'],'top-level response format unchanged');
end $$;
do $$ begin perform public.admin_lister_marketing(null,'2026-01-02 00:00Z');raise exception 'FAIL null date allowed';exception when invalid_parameter_value then raise notice 'PASS: null date denied';end $$;
do $$ begin perform public.admin_lister_marketing('2026-01-02 00:00Z','2026-01-01 00:00Z');raise exception 'FAIL reversed date allowed';exception when invalid_parameter_value then raise notice 'PASS: reversed date denied';end $$;
do $$ begin perform public.admin_lister_marketing('2026-01-01 00:00Z','2026-06-01 00:00Z');raise exception 'FAIL overlong date allowed';exception when invalid_parameter_value then raise notice 'PASS: overlong date denied';end $$;
reset role;
${reverse}
${exact('generated_function')}
${authorization}
select public.qa_assert(pg_temp.canonical(${call})=(select j from expected),'reverse migration restores report contents');
select public.qa_assert(${call} ? 'generated_at','reverse migration retains generated_at');
reset role;
${optimized}
${security('generated_function')}
truncate public.analytics_events,public.listing_activity_log,public.vacancies,public.rooms,public.properties;
${checks}
-- Benchmark final migration, not a generated candidate, at the independent sentinel.
analyze;
do $$ declare t timestamptz;j jsonb;begin for i in 1..3 loop t:=clock_timestamp();j:=${call};raise notice 'FINAL_TIMING_MS: %',extract(epoch from clock_timestamp()-t)*1000;end loop;end $$;
rollback;
${exact('initial_function')}
`;
const file=path.join(out,'verify-combined.sql');fs.writeFileSync(file,sql);
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.toUpperCase().startsWith('PG')));env.PGPASSFILE=runtime+'/pgpass.conf';
const r=spawnSync(runtime+'/runtime/pgsql/bin/psql.exe',['-X','-h','127.0.0.1','-p','55432','-U','vacancy_qa','-w','-d','vacancy_marketing_test','-v','ON_ERROR_STOP=1','-f',file],{env,encoding:'utf8',timeout:120000,maxBuffer:10e6});
fs.writeFileSync(path.join(out,'stdout.txt'),r.stdout||'');fs.writeFileSync(path.join(out,'stderr.txt'),r.stderr||'');
console.log(r.stderr);if(r.status!==0)throw r.error||Error('Combined migration checks failed');
