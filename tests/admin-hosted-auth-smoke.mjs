// Opt-in local runner. Never log credentials, sessions, TOTP or request bodies.
import {randomBytes,randomUUID} from 'node:crypto';
import {readFile,writeFile,access} from 'node:fs/promises';
import {ROOT,ELEMENT,check,claims,api,realMfa} from './hosted-admin/support.mjs';
import {frontendAcceptance} from './hosted-admin/frontend.mjs';
const dir=new URL('../work/hosted-admin/',import.meta.url);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const actors=[];const evidence=[];
const publicationOnly=process.argv.includes('--publication-only');
const frontendOnly=process.argv.includes('--frontend-only');
let key,request,window,initial,changed=false;
const pass=label=>{evidence.push({status:'PASS',label});console.log('PASS '+label);};
async function barrier(name){
  await writeFile(new URL(name+'.needed.json',dir),JSON.stringify({
    run:window.run,actors:actors.map(({id,role})=>({id,role}))},null,2));
  console.log('WAITING '+name+' (safe actor manifest in ignored work/hosted-admin)');
  const deadline=Date.now()+600000;
  while(Date.now()<deadline){try{await access(new URL(name+'.ready',dir));return;}catch{}await pause(1000);}
  throw Error('Isolated fixture coordination timeout: '+name);
}
async function bootstrap(action,actor){
  const res=await fetch(ROOT+'/functions/v1/qa-admin-desktop-window',{
    method:'POST',headers:{'Content-Type':'application/json','x-qa-window':window.nonce},
    body:JSON.stringify({action,role:actor.role,id:actor.id,password:action==='create'?actor.password:undefined}),
    signal:AbortSignal.timeout(30000)});
  let result;try{result=await res.json()}catch{}
  check(res.ok,'Protected Auth bootstrap '+action+' '+actor.role+' HTTP '+res.status);
  return result;
}
const rpc=(name,actor,body={})=>request('rest/v1/rpc/'+name,{token:actor?.session?.access_token,body});
const state=actor=>rpc('admin_appearance_state',actor,{p_element_key:ELEMENT});
const save=(actor,config,version,revision)=>rpc('admin_appearance_save_draft',actor,{
  p_element_key:ELEMENT,p_config:config,p_expected_draft_version:version,p_expected_published_revision:revision});
const publish=(actor,revision,version,reason,id=randomUUID())=>rpc('admin_appearance_publish',actor,{
  p_element_key:ELEMENT,p_expected_published_revision:revision,p_expected_draft_version:version,p_reason:reason,p_request_id:id});
function denied(out,label){
  check(!out.ok&&[401,403].includes(out.status)&&out.data?.code==='42501',label);pass(label);
}
async function deniedEditorSurface(actor,label){
  for(const [name,body] of [
    ['admin_my_capabilities',{}],['admin_access_roles_read',{}],
    ['admin_change_audit_recent',{p_limit:10}],
    ['admin_appearance_state',{p_element_key:ELEMENT}],
    ['admin_appearance_history',{p_element_key:ELEMENT}],
    ['admin_appearance_save_draft',{p_element_key:ELEMENT,p_config:{},p_expected_draft_version:0,p_expected_published_revision:0}],
    ['admin_appearance_publish',{p_element_key:ELEMENT,p_expected_published_revision:0,p_expected_draft_version:1,
      p_reason:'Denied actor must not publish',p_request_id:randomUUID()}],
    ['admin_appearance_restore_draft',{p_element_key:ELEMENT,p_from_revision:1,p_expected_draft_version:0,p_expected_published_revision:0}],
    ['admin_set_access_role',{p_target_user_id:actors[0].id,p_role:'operator',p_reason:'Denied actor must not change access',p_request_id:randomUUID()}]
  ])denied(await rpc(name,actor,body),label+' '+name);
}
try{
  check(process.argv.includes('--execute-isolated'),'Explicit --execute-isolated required');
  window=JSON.parse(await readFile(new URL('window.json',dir),'utf8'));
  check(Date.now()<Date.parse(window.expires),'Protected test window expired');
  for(const role of ['owner','operator','viewer','suspended']){
    const actor={role,password:randomBytes(40).toString('base64url')};
    const fixture=await bootstrap('create',actor);
    Object.assign(actor,{id:fixture.id,email:fixture.email});actors.push(actor);key=fixture.key;
  }
  request=api(key);pass('Confirmed synthetic Auth users without signup/email delivery');
  await barrier('seed');
  for(const actor of actors){
    const login=await request('auth/v1/token?grant_type=password',{body:{email:actor.email,password:actor.password}});
    check(login.ok&&claims(login.data.access_token).aal==='aal1','Genuine AAL1 '+actor.role);
    actor.session=login.data;
    actor.aal1Session=login.data;
    if(!publicationOnly&&!frontendOnly)await deniedEditorSurface(actor,'AAL1 '+actor.role);
    await realMfa(request,actor);pass('GoTrue real TOTP and authenticated AAL2: '+actor.role);
  }
  const owner=actors.find(a=>a.role==='owner'),operator=actors.find(a=>a.role==='operator');
  const publicBefore=await rpc('site_appearance_published');check(publicBefore.ok,'Public style read');
  if(!publicationOnly&&!frontendOnly){
    await deniedEditorSurface(null,'Anonymous');
    await deniedEditorSurface(actors.find(a=>a.role==='viewer'),'AAL2 nonadmin');
    await deniedEditorSurface(actors.find(a=>a.role==='suspended'),'AAL2 suspended admin');
  }
  for(const [actor,role,canPublish] of [[owner,'owner',true],[operator,'operator',false]]){
    const cap=await rpc('admin_my_capabilities',actor);
    check(cap.ok&&cap.data.role===role&&cap.data.appearance_publish===canPublish,'Capability split '+role);
    pass('Real AAL2 capabilities: '+role);
  }
  const directActors=[...actors.map(actor=>[actor,'AAL2 '+actor.role]),
    [{session:owner.aal1Session},'AAL1 owner'],[null,'Anonymous']];
  for(const [actor,label] of publicationOnly||frontendOnly?[]:directActors){
    for(const table of ['admin_access_roles','admin_change_audit','admin_appearance_current',
      'admin_appearance_drafts','admin_appearance_revisions']){
      for(const method of ['GET','POST','PATCH','DELETE']){
        const column=({admin_access_roles:'user_id',admin_change_audit:'id',admin_appearance_current:'element_key',
          admin_appearance_drafts:'actor_id',admin_appearance_revisions:'actor_id'})[table];
        const absent=table==='admin_change_audit'?'-1':table==='admin_appearance_current'?'__qa_absent__':'00000000-0000-4000-8000-000000000099';
        const out=await request('rest/v1/'+table+'?'+column+'=eq.'+absent,{token:actor?.session?.access_token,method,
          ...(method==='POST'||method==='PATCH'?{body:{}}:{})});
        denied(out,label+' direct '+method+' '+table);
      }
    }
  }
  const current=await state(owner);check(current.ok&&!current.data.draft,'Fresh synthetic Owner draft');
  initial=current.data.published;let revision=initial.revision;
  check(revision>0,'Restore acceptance requires an existing published checkpoint');
  await writeFile(new URL('checkpoint.json',dir),JSON.stringify({run:window.run,published:initial}));
  const radius=initial.config?.desktop?.radius===17?19:17;
  if(!frontendOnly){
  check((await save(operator,{desktop:{height:44}},0,revision)).ok,'Operator private draft');
  denied(await publish(operator,revision,1,'Operator forbidden publication'),'AAL2 Operator publish denied');
  denied(await rpc('admin_appearance_restore_draft',operator,{p_element_key:ELEMENT,
    p_from_revision:revision,p_expected_draft_version:1,p_expected_published_revision:revision}),
    'AAL2 Operator restore denied');
  check((await state(owner)).data.draft===null,'Actor drafts private to Owner');
  check(JSON.stringify((await rpc('site_appearance_published')).data)===JSON.stringify(publicBefore.data),
    'Draft hidden from anonymous public read');pass('Per-user drafts and public isolation');
  const invalid=await save(owner,{all:{custom_css:'body{display:none}'}},0,revision);
  check(!invalid.ok&&invalid.data.code==='22023','Arbitrary CSS rejected');pass('Server rejects unregistered style fields');
  check((await save(owner,{desktop:{radius}},0,revision)).ok,'Owner draft');
  const stale=await save(owner,{all:{radius:18}},0,revision);
  check(!stale.ok&&stale.status===409&&stale.data.code==='PT409'&&stale.elapsedMs<10000,
    'Stale draft returns prompt HTTP 409');pass('Optimistic draft conflict returns prompt HTTP 409 without retries');
  // Coordinator installs a rejecting audit trigger scoped ONLY to this Owner.
  const historyBeforeFailure=await rpc('admin_appearance_history',owner,{p_element_key:ELEMENT});
  const auditBeforeFailure=await rpc('admin_change_audit_recent',owner,{p_limit:100});
  check(historyBeforeFailure.ok&&auditBeforeFailure.ok,'Pre-failure history/audit snapshot');
  await barrier('audit-failure-on');
  const rejected=await publish(owner,revision,1,'Forced audit rollback check');
  check(!rejected.ok&&rejected.data?.code==='23514','Scoped audit trigger must reject publication');
  const afterFailure=await state(owner);
  check(afterFailure.ok&&afterFailure.data.published.revision===revision&&afterFailure.data.draft.version===1,
    'Publication and draft preserved after audit failure');
  check(JSON.stringify((await rpc('site_appearance_published')).data)===JSON.stringify(publicBefore.data),
    'No public partial publication');
  check(JSON.stringify((await rpc('admin_appearance_history',owner,{p_element_key:ELEMENT})).data)===
    JSON.stringify(historyBeforeFailure.data),'No partial history row');
  check(JSON.stringify((await rpc('admin_change_audit_recent',owner,{p_limit:100})).data)===
    JSON.stringify(auditBeforeFailure.data),'No partial audit row');
  await barrier('audit-failure-off');pass('Real RPC audit failure rolls back current state, history and draft deletion');
  const requestId=randomUUID(),reason='Synthetic hosted Auth acceptance';
  changed=true; // Unknown/lost response must still trigger checkpoint recovery.
  const committed=await publish(owner,revision,1,reason,requestId);
  check(committed.ok&&committed.data.revision===revision+1,'Owner publish');revision++;
  check((await publish(owner,revision-1,1,reason,requestId)).data.alreadyApplied===true,'Publish retry');
  const mismatch=await publish(owner,revision-1,1,reason+' changed',requestId);
  check(!mismatch.ok&&mismatch.status===409&&mismatch.data.code==='23505','Request ID reuse mismatch');
  const audit=await rpc('admin_change_audit_recent',owner,{p_limit:200});
  check(audit.ok&&audit.data.filter(r=>r.request_id===requestId).length===1,'Exactly one publication audit');
  const history=await rpc('admin_appearance_history',owner,{p_element_key:ELEMENT});
  check(history.ok&&history.data.filter(r=>r.revision===revision).length===1,'Exactly one immutable revision');
  pass('Owner publication, idempotent replay, request mismatch denial, exactly one revision/audit');
  const staleSave=await save(operator,{all:{radius:20}},1,revision-1);
  check(!staleSave.ok&&staleSave.status===409&&staleSave.data.code==='PT409','Stale published revision rejected');
  const staleOwnerPublish=await publish(owner,revision-1,1,'Stale Owner publication must conflict');
  check(!staleOwnerPublish.ok&&staleOwnerPublish.status===409&&staleOwnerPublish.data.code==='PT409',
    'Stale Owner publication returns HTTP 409');pass('Published revision conflict for draft save and Owner publication');
  check((await rpc('site_appearance_published')).data.find(r=>r.key===ELEMENT)?.config.desktop.radius===radius,
    'Anonymous sees real committed publication');pass('Anonymous HTTP published-style propagation');
  }else{
    const staged=await save(owner,{desktop:{radius}},0,revision);check(staged.ok,'Stage frontend appearance fixture');
    changed=true;
    const prepared=await publish(owner,revision,staged.data.version,'Prepare connected frontend acceptance');
    check(prepared.ok,'Publish frontend appearance fixture');revision=prepared.data.revision;
  }
  await frontendAcceptance({key,actors,radius,dir,pass});
  revision=(await state(owner)).data.published.revision;
  const revokeId=randomUUID();
  const revokeBody={p_target_user_id:operator.id,p_role:null,p_reason:'Synthetic access revocation check',p_request_id:revokeId};
  denied(await rpc('admin_set_access_role',operator,revokeBody),'Operator cannot manage access roles');
  check((await rpc('admin_set_access_role',owner,revokeBody)).ok,'Owner revokes synthetic Operator role');
  check((await rpc('admin_set_access_role',owner,revokeBody)).data.already_applied===true,'Access revoke retry');
  check((await rpc('admin_change_audit_recent',owner,{p_limit:100})).data.filter(r=>r.request_id===revokeId).length===1,
    'Exactly one access change audit');pass('Genuine Owner access revocation, idempotent retry and atomic audit');
  denied(await state(operator),'Genuine AAL2 session loses access after role removal');
  const restore=await rpc('admin_appearance_restore_draft',owner,{p_element_key:ELEMENT,
    p_from_revision:initial.revision,p_expected_draft_version:0,p_expected_published_revision:revision});
  check(restore.ok,'Owner restore stages prior revision');
  const duplicateRestore=await rpc('admin_appearance_restore_draft',owner,{p_element_key:ELEMENT,
    p_from_revision:initial.revision,p_expected_draft_version:0,p_expected_published_revision:revision});
  check(!duplicateRestore.ok&&duplicateRestore.status===409&&duplicateRestore.data.code==='PT409',
    'Stale restore retry cannot overwrite draft');
  pass('Restore stays private; stale retry conflicts safely');
  check((await publish(owner,revision,1,'Restore pre-run appearance after isolated verification')).ok,'Audited restoration');
  const final=(await state(owner)).data.published;
  check(JSON.stringify(final.config)===JSON.stringify(initial.config),'Exact pre-run configuration restored');
  changed=false;pass('Audited rollback restores exact pre-run configuration and preserves history');
}catch(error){
  evidence.push({status:'FAIL',label:String(error.message)});
  console.error('HOSTED CHECK FAILED: '+String(error.message).slice(0,220));process.exitCode=1;
}finally{
  if(changed&&request){
    try{
      const owner=actors.find(a=>a.role==='owner');const live=await state(owner);
      check(live.ok,'Recovery state');
      if(JSON.stringify(live.data.published.config)!==JSON.stringify(initial.config)){
        const saved=await save(owner,initial.config,live.data.draft?.version||0,live.data.published.revision);
        check(saved.ok,'Recovery draft');
        check((await publish(owner,live.data.published.revision,saved.data.version,'Recover exact pre-run appearance')).ok,'Recovery publish');
      }
      pass('Failure recovery restored exact pre-run appearance');changed=false;
    }catch{evidence.push({status:'FAIL',label:'Recovery requires coordinator; checkpoint.json preserved'});}
  }
  if(actors.length){
    try{
      if(request)for(const actor of actors)if(actor.session)await request('auth/v1/logout?scope=global',{
        token:actor.session.access_token,body:{}});
      await barrier('cleanup');
      for(const actor of actors)await bootstrap('delete',actor);
      pass('Synthetic Auth users removed after role/profile/draft cleanup');
    }catch{evidence.push({status:'FAIL',label:'Synthetic fixture cleanup requires coordinator'});process.exitCode=1;}
  }
  if(window)await writeFile(new URL('evidence.json',dir),JSON.stringify({
    project:'raauicmfyjpcuhfzknak',run:window.run,publicationOnly,frontendOnly,at:new Date().toISOString(),evidence,
    releaseReady:false,unverified:['Full production-shaped public listing/moderation schema','Actual expired JWT boundary']},null,2));
}
