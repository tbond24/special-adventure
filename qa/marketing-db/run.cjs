// No dependency install and no network access. --prepare only writes a local SQL bundle.
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const output=path.resolve(root,'../marketing-checkpoint-artifacts/database');
const guard=`
do $$ begin
  if current_database()<>'vacancy_marketing_test'
    or host(inet_server_addr())<>'127.0.0.1' or inet_server_port()<>55432
    or current_setting('server_version_num')::int/10000<>17
    or shobj_description((select oid from pg_database where datname=current_database()),'pg_database')
       is distinct from 'vacancy-marketing-synthetic-only'
  then raise exception 'Refusing unverified database target'; end if;
  if exists(select 1 from pg_tables where schemaname='public')
    or exists(select 1 from pg_roles where rolname in ('anon','authenticated'))
  then raise exception 'Requires a fresh dedicated cluster, not an existing app database'; end if;
end $$;
select current_database(),inet_server_addr(),inet_server_port(),version();
`;
const recovery=read('docs/rollback/admin-marketing-report-function.sql');
const snapshot=`
create temp table qa_function_before as
select pg_get_functiondef(oid) as definition,proowner,proacl,proconfig,prosecdef
from pg_proc where oid='public.admin_lister_marketing(timestamptz,timestamptz)'::regprocedure;
`;
const security=`
select public.qa_assert(not has_function_privilege('anon','public.admin_lister_marketing(timestamptz,timestamptz)','execute'),'anonymous execute revoked');
select public.qa_assert(has_function_privilege('authenticated','public.admin_lister_marketing(timestamptz,timestamptz)','execute'),'authenticated grant retained');
select public.qa_assert((select row(p.proowner,p.proacl,p.proconfig,p.prosecdef) is not distinct from row(b.proowner,b.proacl,b.proconfig,b.prosecdef)
 from pg_proc p cross join qa_function_before b where p.oid='public.admin_lister_marketing(timestamptz,timestamptz)'::regprocedure),'owner, grants, search path and security preserved');
`;
const recoveryChecks=`
select public.qa_assert((select pg_get_functiondef('public.admin_lister_marketing(timestamptz,timestamptz)'::regprocedure)=definition from qa_function_before),'recovery restores exact function definition');
${security}
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","aal":"aal2"}',false);
select public.qa_assert(not (public.admin_lister_marketing('2026-01-01 00:00Z','2026-01-02 00:00Z') ? 'generated_at'),'authorized recovered function works without generated_at');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","aal":"aal1"}',false);
do $$ begin
  perform public.admin_lister_marketing('2026-01-01 00:00Z','2026-01-02 00:00Z');
  raise exception 'FAIL: recovered function permits AAL1';
exception when insufficient_privilege then raise notice 'PASS: recovered function still denies AAL1'; end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","aal":"aal2"}',false);
do $$ begin
  perform public.admin_lister_marketing('2026-01-01 00:00Z','2026-01-02 00:00Z');
  raise exception 'FAIL: recovered function permits non-admin';
exception when insufficient_privilege then raise notice 'PASS: recovered function still denies non-admin'; end $$;
reset role;
set role anon;
select set_config('request.jwt.claims','{}',false);
do $$ begin
  perform public.admin_lister_marketing('2026-01-01 00:00Z','2026-01-02 00:00Z');
  raise exception 'FAIL: recovered function permits anonymous';
exception when insufficient_privilege then raise notice 'PASS: recovered function still denies anonymous'; end $$;
reset role;
`;
const sql=['\\set ON_ERROR_STOP on',guard,read('qa/marketing-db/schema.sql'),
  read('supabase/migrations/20260922014919_stage77_admin_mfa.sql'),recovery,snapshot,
  read('supabase/migrations/20261004231152_admin_marketing_generated_at.sql'),security,
  read('qa/marketing-db/checks.sql'),recovery,recoveryChecks].join('\n');
fs.mkdirSync(output,{recursive:true});
const bundle=path.join(output,'verify-marketing.sql');fs.writeFileSync(bundle,sql);
if(process.argv.includes('--prepare')) {
  console.log('Prepared only; no database connected: '+bundle);process.exit(0);
}
const index=process.argv.indexOf('--psql'),psql=index>=0?process.argv[index+1]:null;
if(!psql||!path.isAbsolute(psql)||!fs.existsSync(psql))throw Error('Supply --prepare, or an approved absolute --psql path to installed PostgreSQL 17 tooling.');
// Explicit loopback parameters defeat connection-string/service environment defaults.
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.toUpperCase().startsWith('PG')));
// If local SCRAM credentials are used, provide them through an explicit local PGPASSFILE.
if(process.env.VACANCY_QA_PGPASSFILE)env.PGPASSFILE=process.env.VACANCY_QA_PGPASSFILE;
const result=spawnSync(psql,['--no-psqlrc','--no-password','--host=127.0.0.1','--port=55432','--username=vacancy_qa','--dbname=vacancy_marketing_test','--file',bundle],{env,encoding:'utf8',timeout:180000,stdio:['ignore','pipe','pipe']});
fs.writeFileSync(path.join(output,'database-stdout.txt'),result.stdout||'');
fs.writeFileSync(path.join(output,'database-stderr.txt'),result.stderr||String(result.error||''));
console.log(result.stdout||'');console.error(result.stderr||'');
if(result.error||result.status!==0)throw result.error||Error('Database verification failed; inspect saved evidence.');
