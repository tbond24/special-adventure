// Explicit dependency acceptance, on the disposable Linux stack only.
// This uses the runner's real SQL/Auth/REST clients; no report or log DTOs.
export function assertActivityEnvironment(root,env=process.env,platform=process.platform){
  if(root!=='http://127.0.0.1:54321'||env.CI!=='true'||
     env.VACANCY_DISPOSABLE_STACK!=='1'||platform!=='linux'){
    throw Error('Activity-log acceptance requires the exact disposable Linux CI stack');
  }
}

export async function verifyActivityLogAndReports(h){
  const {ROOT,sql,request,check,pass,evidence,owner,operator,viewer,suspended}=h;
  assertActivityEnvironment(ROOT);
  const listing='55555555-5555-4555-8555-555555555555';
  const unit='66666666-6666-4666-8666-666666666666';
  const property='77777777-7777-4777-8777-777777777777';
  const result={environment:'disposable Linux CI; genuine Auth and PostgREST',completed:false};
  evidence.activityLogReports=result;
  const catalog=JSON.parse(await sql(`select json_build_object(
    'rls',(select relrowsecurity from pg_class where oid='public.listing_activity_log'::regclass),
    'triggers',(select json_agg(json_build_object('name',tgname,'enabled',tgenabled,'table',tgrelid::regclass::text) order by tgname)
      from pg_trigger where not tgisinternal and tgfoid='private.record_listing_activity()'::regprocedure),
    'definer',(select prosecdef from pg_proc where oid='private.record_listing_activity()'::regprocedure),
    'definition',pg_get_functiondef('private.record_listing_activity()'::regprocedure));`));
  check(catalog.rls===true&&catalog.definer===true,'Activity log RLS and guarded trigger function exist');
  check(catalog.triggers?.length===3&&['properties','rooms','vacancies'].every(table=>
    catalog.triggers.some(t=>t.table===table&&t.name==='listing_activity_'+table&&t.enabled==='O')),
    'All three real activity triggers must exist and be enabled');
  check(!/\b(?:new|old)\.status/i.test(catalog.definition)&&catalog.definition.includes('to_jsonb(new)'),
    'Final activity function must retain the existing property/room-safe status repair');
  pass('Recovered activity-log schema replays with RLS, three enabled triggers and the subsequent status repair');

  const initial=JSON.parse(await sql(`select coalesce(json_agg(json_build_object(
    'entity_type',entity_type,'action',action,'old_status',old_status,'new_status',new_status) order by id),'[]')
    from public.listing_activity_log where entity_id in ('${property}','${unit}','${listing}');`));
  check(['property','unit','listing'].every(type=>initial.some(x=>x.entity_type===type&&x.action==='created')),
    'Real seed inserts must have recorded all three entity types');
  check(initial.some(x=>x.entity_type==='listing'&&x.action==='created'&&x.old_status===null&&x.new_status==='active'),
    'Actual initial publication must be available to dependent reports');
  const before=Number(await sql('select count(*) from public.listing_activity_log;'));
  const logFingerprint=()=>sql("select md5(coalesce(jsonb_agg(to_jsonb(l) order by id),'[]'::jsonb)::text) from public.listing_activity_log l;");
  const beforeFingerprint=await logFingerprint();
  const existingLogId=await sql(`select id from public.listing_activity_log where entity_id='${listing}' order by id limit 1;`);
  check(/^\d+$/.test(existingLogId),'Known synthetic activity row required for mutation denial');
  const changes=(await sql(`begin;
    update public.properties set updated_at=now() where id='${property}';
    update public.rooms set updated_at=now() where id='${unit}';
    update public.vacancies set updated_at=now() where id='${listing}';
    select json_build_object('after_noop',(select count(*) from public.listing_activity_log));
    update public.properties set title=title||' changed in rollback test' where id='${property}';
    update public.rooms set description=description||' changed in rollback test' where id='${unit}';
    update public.vacancies set status='paused' where id='${listing}';
    select json_build_object('rows',(select json_agg(json_build_object('entity_type',entity_type,
      'action',action,'old_status',old_status,'new_status',new_status) order by id)
      from (select * from public.listing_activity_log order by id desc limit 3) latest));
    rollback;`)).split('\n').filter(Boolean).map(row=>JSON.parse(row));
  check(changes.length===2&&changes[0].after_noop===before,
    'Timestamp-only property/unit/listing writes must not create activity');
  const changed=changes[1].rows;
  check(changed?.length===3&&['property','unit','listing'].every(type=>changed.some(row=>row.entity_type===type))&&
    changed.some(row=>row.entity_type==='listing'&&row.action==='status_changed'&&
      row.old_status==='active'&&row.new_status==='paused'),
    'Corrected trigger must log all entity changes and actual old/new listing status');
  check(Number(await sql('select count(*) from public.listing_activity_log;'))===before,
    'Rolled-back changes and their activity log rows must both disappear');
  pass('Activity logging records real property/unit/status changes, ignores timestamp-only writes and rolls back with data');

  const read=actor=>request('rest/v1/listing_activity_log?select=entity_type,action,new_status&order=id&limit=10',
    {method:'GET',token:actor?.session?.access_token});
  for(const actor of [owner,operator]){
    const out=await read(actor);
    check(out.ok&&Array.isArray(out.data)&&out.data.some(x=>x.entity_type==='listing'),
      'Genuine AAL2 '+actor.role+' reads activity log through RLS');
  }
  for(const actor of [viewer,suspended,{session:owner.aal1Session},null]){
    const out=await read(actor);
    check((out.ok&&Array.isArray(out.data)&&out.data.length===0)||
      (!out.ok&&[401,403].includes(out.status)),'Unprivileged/AAL1 actor must not read activity rows');
  }
  for(const actor of [owner,operator,viewer,suspended,{session:owner.aal1Session},null]){
    for(const method of ['POST','PATCH','DELETE']){
      const body=method==='POST'?{entity_type:'listing',entity_id:listing,action:'updated'}:{action:'updated'};
      const out=await request('rest/v1/listing_activity_log?id=eq.'+existingLogId,{
        method,token:actor?.session?.access_token,...(method==='DELETE'?{}:{body})});
      check(!out.ok&&[401,403].includes(out.status)&&out.data?.code==='42501',
        'Direct activity log '+method+' must be denied: HTTP '+out.status+' code '+out.data?.code);
    }
  }
  check(Number(await sql('select count(*) from public.listing_activity_log;'))===before,
    'Direct REST denial tests must leave log unchanged');
  check(await logFingerprint()===beforeFingerprint,'Direct REST attempts must preserve exact synthetic log content');
  pass('Real activity-log REST reads enforce MFA/admin RLS and all direct client writes are denied');

  const dates=JSON.parse(await sql("select json_build_object('p_from',now()-interval '1 day','p_to',now()+interval '1 minute');"));
  const reports=[['admin_lister_marketing',dates],['admin_connected_journeys',{
    ...dates,p_source:null,p_campaign:null,p_device:null,p_stage:null,p_offset:0}]];
  for(const actor of [owner,operator]){
    const legacy=await request('rest/v1/rpc/'+reports[0][0],{token:actor.session.access_token,body:reports[0][1]});
    check(legacy.ok&&Array.isArray(legacy.data?.publications)&&legacy.data.publications.some(x=>x.vacancy_id===listing)&&
      Number.isFinite(Date.parse(legacy.data.generated_at)),
      'Legacy lister report must execute against actual first-publication activity');
    const connected=await request('rest/v1/rpc/'+reports[1][0],{token:actor.session.access_token,body:reports[1][1]});
    check(connected.ok&&connected.data?.schemaVersion===2&&Array.isArray(connected.data.details)&&
      connected.data.details.length<=50&&connected.data.rate===null,
      'Version-2 connected report must execute with bounded detail and unavailable unproven rate');
  }
  for(const actor of [viewer,suspended,{session:owner.aal1Session},null]){
    for(const [name,body] of reports){
      const out=await request('rest/v1/rpc/'+name,{token:actor?.session?.access_token,body});
      check(!out.ok&&[400,401,403].includes(out.status),'Unprivileged/AAL1 report invocation denied');
    }
  }
  result.completed=true;result.initialEntityTypes=3;result.enabledTriggers=3;
  result.reportContracts=['admin_lister_marketing','admin_connected_journeys'];
  result.directWriteDenials=18;result.genuineAuth=true;
  pass('Both existing lister reports execute through genuine Owner/Operator HTTP sessions; nonadmin and AAL1 remain denied');
}
