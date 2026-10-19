// Explicit local PostgreSQL transaction/receipt rehearsal, never provider apply_migration.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir,access} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const project='vacancy-disposable-admin',container='supabase_db_'+project;
const work=path.join(root,'work/candidate-upgrade'),artifacts=path.join(root,'work/full-stack-evidence');
const sha=b=>createHash('sha256').update(b).digest('hex');
export function assertCandidateEnvironment(env=process.env,platform=process.platform){
  assert(platform==='linux'&&env.CI==='true'&&env.VACANCY_DISPOSABLE_STACK==='1'&&env.VACANCY_CANDIDATE_UPGRADE_REHEARSAL==='1'&&!env.DOCKER_HOST&&(!env.DOCKER_CONTEXT||env.DOCKER_CONTEXT==='default'),'Exact isolated Linux CI candidate-rehearsal opt-in required; remote Docker forbidden');
}
export function candidateTransaction(candidate,source,{fail=false}={}){
  assert.match(candidate.sourceVersion,/^\d{14}$/);assert.match(candidate.migrationName,/^[a-z][a-z0-9_]+$/);
  assert.equal(candidate.path,'supabase/migrations/'+candidate.sourceVersion+'_'+candidate.migrationName+'.sql');
  assert.equal(sha(source),candidate.sha256,'Canonical candidate digest mismatch');
  assert(!source.includes('$vacancy_receipt_source$'));
  // Source itself is intact; only the synthetic executor's transaction/receipt surround it.
  return 'begin;\n'+source+"\nset local standard_conforming_strings=on;\ninsert into supabase_migrations.schema_migrations(version,name,statements) values ('"+candidate.sourceVersion+"','"+candidate.migrationName+"',ARRAY[$vacancy_receipt_source$"+source+'$vacancy_receipt_source$]);\n'+(fail?'create table public.vacancy_release_failure_probe(id integer); insert into public.vacancy_release_failure_probe values(1); select 1/0;\n':'')+'commit;\n';
}
async function command(program,args,{input,allowFailure=false}={}){
  return new Promise((resolve,reject)=>{
    const child=execFile(program,args,{cwd:root,timeout:240000,maxBuffer:12*1024*1024},(error,stdout,stderr)=>{
      if(error&&!allowFailure)reject(Error('Local candidate-rehearsal command failed: '+program+' '+args[0]));
      else resolve({ok:!error,stdout,divisionByZero:/division by zero/.test(stderr)});
    });child.stdin.on('error',()=>{});child.stdin.end(input);
  });
}
async function sql(query,options){return command('docker',['--context','default','exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:query,...options});}
const value=async query=>(await sql(query)).stdout.trim();
const receiptSnapshot="select md5(coalesce(jsonb_agg(to_jsonb(m) order by version)::text,'')) from supabase_migrations.schema_migrations m";
const presentationSnapshot="select jsonb_build_object('display',(select jsonb_agg(jsonb_build_array(slot,enabled) order by slot) from public.listing_display_options),'favicon',(select jsonb_build_array(png,previous_png,revision) from public.site_favicon where id))";
export async function runCandidateUpgrade(){
  assertCandidateEnvironment();
  const info={startedAt:new Date().toISOString(),kind:'Synthetic local PostgreSQL transaction/receipt rehearsal, not managed provider behavior',checks:[],candidates:[],productionData:false,productionMutation:false,externalMail:false,completed:false};
  const pass=label=>{info.checks.push(label);console.log('PASS '+label);};
  let started=false,phase='isolation';
  try{
    const endpoint=JSON.parse((await command('docker',['--context','default','context','inspect','default','--format','{{json .Endpoints.docker.Host}}'])).stdout);
    assert.equal(endpoint,'unix:///var/run/docker.sock');
    const prior=(await command('docker',['--context','default','ps','-a','--filter','name='+project,'--format','{{.ID}}'])).stdout.trim();
    assert.equal(prior,'','Refuse to adopt or remove an existing disposable project');
    const volumes=(await command('docker',['--context','default','volume','ls','--format','{{.Name}}'])).stdout.trim().split('\n');
    assert(!volumes.some(name=>name.endsWith('_'+project)),'Refuse to adopt existing project volumes');
    try{await access(work);throw Error('Refuse to overwrite existing rehearsal work');}catch(e){if(e.code!=='ENOENT')throw e;}
    await mkdir(path.join(work,'supabase/migrations'),{recursive:true});await mkdir(artifacts,{recursive:true});
    await writeFile(path.join(work,'supabase/config.toml'),await readFile(new URL('./config.toml',import.meta.url)));
    const manifest=JSON.parse(await readFile(new URL('../../docs/evidence/admin-release-candidate-execution-20261017.json',import.meta.url),'utf8'));
    assert.equal(manifest.candidates.length,17);
    const candidateFiles=new Set(manifest.candidates.map(c=>path.basename(c.path)));
    const historical=(await readdir(new URL('../../supabase/migrations/',import.meta.url))).filter(f=>/^\d+_.+\.sql$/.test(f)&&!candidateFiles.has(f)).sort();
    assert.equal(historical.length,69);
    for(const file of historical){
      let body=await readFile(new URL('../../supabase/migrations/'+file,import.meta.url),'utf8');
      if(file==='20260906132736_operations_analytics_and_expiry.sql'){
        const omitted="insert into public.admin_users(user_id) values ('11111111-1111-4111-8111-111111111111') on conflict do nothing;";
        assert.equal(body.split(omitted).length,2);body=body.replace(omitted,'-- Synthetic rehearsal omits the previously manifested private account assignment.');
      }
      await writeFile(path.join(work,'supabase/migrations',file),body);
    }
    phase='historical replay';started=true;
    await command('supabase',['start','--workdir',work,'--yes','--exclude','realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor']);
    assert.equal(await value('select count(*) from supabase_migrations.schema_migrations'),'69');
    assert.equal(await value("select to_regclass('public.admin_access_roles') is null and (select count(*) from auth.users)=0"),'t');
    pass('Exactly 69 historical migrations replay without candidate schema or synthetic account assignment');
    await sql("update public.listing_display_options set enabled=slot not in (select slot from public.listing_display_options order by slot limit 2); update public.site_favicon set png=null,previous_png=null,revision=0 where id;");
    const originalReceipts=await value(receiptSnapshot),originalPresentation=await value(presentationSnapshot);
    const original=JSON.parse(originalPresentation);assert.equal(original.display.length,10);assert.equal(original.display.filter(x=>x[1]).length,8);
    info.historicalReceiptFingerprint=originalReceipts;info.syntheticInitialPresentation=original;
    pass('Synthetic adoption starts with eight enabled/two disabled displays and compiled-default null favicon');
    phase='failed first candidate';
    const first=manifest.candidates[0],firstSource=await readFile(path.join(root,first.path),'utf8');
    const failure=await sql(candidateTransaction(first,firstSource,{fail:true}),{allowFailure:true});
    assert(!failure.ok&&failure.divisionByZero);
    assert.equal(await value("select to_regclass('public.admin_access_roles') is null and to_regclass('public.admin_change_audit') is null and to_regclass('public.vacancy_release_failure_probe') is null"),'t');
    assert.equal(await value(receiptSnapshot),originalReceipts);assert.equal(await value(presentationSnapshot),originalPresentation);
    info.failureInjection={divisionByZeroObserved:true,ddlReceiptProbeAndDataRolledBack:true};
    pass('Failure after exact first-candidate DDL/receipt rolls back schema, receipt and probe while preserving baseline values');
    phase='seventeen candidate transactions';
    for(const candidate of manifest.candidates){
      assert.equal(await value("select count(*) from supabase_migrations.schema_migrations where version='"+candidate.sourceVersion+"' or name='"+candidate.migrationName+"'"),'0','Receipt absence required before execution');
      const source=await readFile(path.join(root,candidate.path),'utf8');
      const result=await sql(candidateTransaction(candidate,source));
      // Acknowledgement deliberately ignored for the final committed candidate.
      // This models reconciliation with a missing client response, not an actual network timeout.
      if(candidate.ordinal!==17)assert(result.ok);
      const rows=JSON.parse(await value("select coalesce(jsonb_agg(jsonb_build_object('version',version,'name',name,'sha256',encode(sha256(convert_to(statements[1],'UTF8')),'hex'))),'[]') from supabase_migrations.schema_migrations where version='"+candidate.sourceVersion+"'"));
      assert.equal(rows.length,1);assert.equal(rows[0].name,candidate.migrationName);assert.equal(rows[0].sha256,candidate.sha256);
      info.candidates.push({ordinal:candidate.ordinal,...rows[0],clientAcknowledgementUsed:candidate.ordinal!==17});
    }
    assert.equal(await value('select count(*) from supabase_migrations.schema_migrations'),'86');
    const versions=manifest.candidates.map(c=>"'"+c.sourceVersion+"'").join(',');
    assert.equal(await value(receiptSnapshot+" where version not in ("+versions+")"),originalReceipts);
    pass('All seventeen exact candidate transactions commit once with matching source/receipt hashes and untouched 69 historical receipts');
    info.discardedAcknowledgement={candidate:17,reconciledByExactReceiptAndHash:true,replayed:false,actualNetworkTimeout:false};
    pass('Discarded final acknowledgement reconciles committed receipt/hash without replaying a non-idempotent candidate');
    phase='post-upgrade adoption and guards';
    assert.equal(await value(presentationSnapshot),originalPresentation);
    assert.equal(await value("select count(*) from public.admin_appearance_current where element_key like 'listing-display/%' and config=initial_config and projection_state=private.presentation_projection(element_key)"),'10');
    assert.equal(await value("select config='{}'::jsonb and initial_config='{}'::jsonb and legacy_initial_config is null from public.admin_appearance_current where element_key='site-favicon'"),'t');
    assert.equal(await value("select (select count(*) from public.admin_access_roles)=0 and (select count(*) from public.admin_change_audit)=0 and (select count(*) from public.admin_appearance_revisions)=0 and (select count(*) from private.renter_analytics_events)=0 and not (select collection_enabled from private.renter_analytics_settings where id)"),'t');
    pass('Full canonical upgrade preserves ten exact display values/default favicon without publication, audit, Owner bootstrap or renter activation');
    const guards=JSON.parse(await value("select jsonb_build_object('private_helpers',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('analytics_allowed','analytics_batch','analytics_budget','analytics_excluded_user','analytics_ingest','analytics_label','analytics_route','analytics_write_v1','analytics_write_v2') and not has_function_privilege('anon',p.oid,'EXECUTE') and not has_function_privilege('authenticated',p.oid,'EXECUTE')), 'no_direct_writes',not has_table_privilege('anon','public.analytics_events','INSERT') and not has_table_privilege('authenticated','public.analytics_events','INSERT'))"));
    assert.equal(guards.private_helpers,9);assert(guards.no_direct_writes);info.securityGuards=guards;
    pass('Final private analytics helpers and direct event insertion remain closed to browser roles');
    info.completed=true;
  }catch(e){info.failure={phase,message:e.message};throw e;}
  finally{
    if(started){const stopped=await command('supabase',['stop','--workdir',work,'--project-id',project,'--no-backup','--yes'],{allowFailure:true});info.disposableStackRemoved=stopped.ok;if(!stopped.ok)info.completed=false;}
    info.finishedAt=new Date().toISOString();
    await mkdir(artifacts,{recursive:true});await writeFile(path.join(artifacts,'candidate-upgrade.json'),JSON.stringify(info,null,2)+'\n');
    assert(!started||info.disposableStackRemoved,'Candidate rehearsal cleanup failed');
  }
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))await runCandidateUpgrade();
