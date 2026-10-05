// Local synthetic query experiment only. All database changes roll back.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const out=path.resolve(root,'../marketing-checkpoint-artifacts/database-investigation'); fs.mkdirSync(out,{recursive:true});
const runtime='C:/Users/PC/Documents/Codex/vacancy-marketing-postgres-test-20261005';
const original=fs.readFileSync(path.join(root,'supabase/migrations/20261004231152_admin_marketing_generated_at.sql'),'utf8');
const candidate=original.replace(/first_active.created_at=\([\s\S]*?\) as is_first_property_publication/, 'first_active.created_at=property_first.first_at as is_first_property_publication').replace('      left join lateral (',`      left join (
        select other_r.property_id,min(log.created_at) as first_at
        from public.listing_activity_log log
        join public.vacancies other_v on other_v.id=log.entity_id
        join public.rooms other_r on other_r.id=other_v.room_id
        where log.entity_type='listing' and log.new_status='active'
          and log.old_status is distinct from 'active'
        group by other_r.property_id
      ) property_first on property_first.property_id=p.id
      left join lateral (`);
if(candidate===original) throw Error('replacement failed');
fs.writeFileSync(path.join(out,'candidate-local-only.sql'),candidate);
const guard=`do $$ begin if current_database()<>'vacancy_marketing_test' or host(inet_server_addr())<>'127.0.0.1' or inet_server_port()<>55432 or shobj_description((select oid from pg_database where datname=current_database()),'pg_database') is distinct from 'vacancy-marketing-synthetic-only' then raise exception 'Wrong target'; end if; end $$;`;
function run(name,sql){
 const file=path.join(out,name+'.sql');fs.writeFileSync(file,guard+'\n'+sql);
 const env={...process.env};for(const k of Object.keys(env))if(k.startsWith('PG'))delete env[k];env.PGPASSFILE=runtime+'/pgpass.conf';
 const r=spawnSync(runtime+'/runtime/pgsql/bin/psql.exe',['-X','-h','127.0.0.1','-p','55432','-U','vacancy_qa','-w','-d','vacancy_marketing_test','-v','ON_ERROR_STOP=1','-f',file],{env,encoding:'utf8',maxBuffer:30e6});
 fs.writeFileSync(path.join(out,name+'.txt'),r.stdout+'\n'+r.stderr); if(r.status!==0)throw Error(name+' failed: '+r.stderr);console.log(name+' completed');return r.stdout;
}
const claims=`select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","aal":"aal2"}',true);`;
const call=`public.admin_lister_marketing('2026-01-01 00:00Z','2026-01-02 00:00Z')`;
const indexes=`create index if not exists rooms_property_idx on public.rooms(property_id);create index if not exists vacancies_room_idx on public.vacancies(room_id);`;
function measure(label){return `do $$ declare t timestamptz; j jsonb; begin for i in 1..3 loop t:=clock_timestamp();j:=${call};insert into timings values('${label}',i,extract(epoch from clock_timestamp()-t)*1000,octet_length(j::text));end loop;insert into answers values('${label}',j);end $$;`;}
function plan(fn){return 'explain (analyze,buffers,format json) '+fn.slice(fn.indexOf('select jsonb_build_object('),fn.indexOf(') into result;')+1).replaceAll('p_from',"'2026-01-01 00:00Z'::timestamptz").replaceAll('p_to',"'2026-01-02 00:00Z'::timestamptz")+';';}
const results=[];
for(const [name,n,p,history] of [['small',20,10,true],['growing',200,40,true],['one-thousand',1000,200,true],['near-limit',5000,1000,true],['extreme-one-property',5001,1,false],['narrow-window',5000,1000,true]].filter(x=>!process.argv[2]||x[0]===process.argv[2])){
 const seed=`truncate public.analytics_events,public.listing_activity_log,public.vacancies,public.rooms,public.properties;
 insert into properties select md5('p'||i)::uuid,'00000000-0000-4000-8000-000000000001' from generate_series(1,${p}) i;
 insert into rooms select md5('r'||i)::uuid,md5('p'||(1+(i-1)%${p}))::uuid from generate_series(1,${n}) i;
 insert into vacancies select md5('v'||i)::uuid,md5('r'||i)::uuid from generate_series(1,${n}) i;
 insert into listing_activity_log(entity_type,entity_id,old_status,new_status,created_at) select 'listing',md5('v'||i)::uuid,null,'active','2026-01-01 12:00Z'::timestamptz+ i*interval '1 second' from generate_series(1,${n}) i;
 ${history?`insert into listing_activity_log(entity_type,entity_id,old_status,new_status,created_at) select 'listing',md5('v'||i)::uuid,s.old,s.new,'2026-01-01 15:00Z'::timestamptz+s.h*interval '1 hour' from generate_series(1,${n}) i cross join (values('active','active',0),('active','paused',1),('paused','active',2)) s(old,new,h);
 insert into analytics_events(event_id,event_name,user_id,vacancy_id,created_at,source) select md5('e'||i)::uuid,'listing_submitted','00000000-0000-4000-8000-000000000001',md5('v'||i)::uuid,'2026-01-01 11:59Z','synthetic' from generate_series(1,${n}) i;`:''}
 analyze;`;
 const narrow=name==='narrow-window'?`update listing_activity_log set created_at=created_at-interval '7 days' where entity_id not in(select md5('v'||i)::uuid from generate_series(1,20)i);update analytics_events set created_at=created_at-interval '7 days' where vacancy_id not in(select md5('v'||i)::uuid from generate_series(1,20)i);analyze;`:'';
 const sql=`begin;set local statement_timeout='120s';${claims}
 create temp table timings(variant text,iteration int,ms numeric,uncompressed_bytes int) on commit drop;
 create temp table answers(variant text,j jsonb) on commit drop;
 ${seed}${narrow}${original}${measure('fixture-original')}${indexes}analyze;${measure('existing-indexes')}
 ${name==='extreme-one-property'?plan(original):''}
 ${candidate}${measure('grouped-candidate')}${name==='extreme-one-property'?plan(candidate):''}
 select public.qa_assert((select count(distinct (j-'generated_at'))=1 from answers),'same complete report contents across variants');
 select 'MEASURE '||row_to_json(t)::text from timings t;rollback;`;
 const output=run(name,sql);for(const line of output.split('\n'))if(line.trim().startsWith('MEASURE '))results.push({scenario:name,listings:n,properties:p,history_rows:n*(history?4:1),...JSON.parse(line.trim().slice(8))});
 fs.writeFileSync(path.join(out,process.argv[2]?'measurements-'+process.argv[2]+'.json':'measurements.json'),JSON.stringify(results,null,2));
}
run('candidate-correctness',`begin;${indexes}
create temp table before_fn as select pg_get_functiondef(oid) def,proowner,proacl,proconfig,prosecdef from pg_proc where oid='public.admin_lister_marketing(timestamptz,timestamptz)'::regprocedure;
${candidate}
select public.qa_assert((select row(p.proowner,p.proacl,p.proconfig,p.prosecdef) is not distinct from row(b.proowner,b.proacl,b.proconfig,b.prosecdef) from pg_proc p cross join before_fn b where p.oid='public.admin_lister_marketing(timestamptz,timestamptz)'::regprocedure),'security configuration unchanged');
truncate public.analytics_events,public.listing_activity_log,public.vacancies,public.rooms,public.properties;
${fs.readFileSync(path.join(__dirname,'checks.sql'),'utf8')}
rollback;
select public.qa_assert(position('property_first' in pg_get_functiondef('public.admin_lister_marketing(timestamptz,timestamptz)'::regprocedure))=0,'candidate rolled back');`);
