// Genuine GoTrue/Auth/PostgREST checks on the dedicated synthetic test project.
// Never use with production credentials, customer accounts, or live domains.
// No tokens, passwords or authenticator secrets are printed or persisted.
import {createHmac,randomBytes,randomUUID} from 'node:crypto';

const ROOT='https://raauicmfyjpcuhfzknak.supabase.co';
const PUBLISHABLE=process.env.VACANCY_TEST_PUBLISHABLE_KEY;
const RUN=String(process.env.GITHUB_RUN_ID||'manual');
const SCOPE='vacancy-admin-stage2-auth-'+RUN;
if(!PUBLISHABLE?.startsWith('sb_publishable_'))throw Error('Expected a publishable-only test key');
if(!ROOT.includes('raauicmfyjpcuhfzknak.supabase.co'))throw Error('Only the approved test project may be used');

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function assert(ok,message){if(!ok)throw Error('FAILED: '+message);}
async function request(path,{token,body,method='POST'}={}){
  const response=await fetch(ROOT+'/'+path,{
    method,headers:{apikey:PUBLISHABLE,'Content-Type':'application/json',
      ...(token?{Authorization:'Bearer '+token}:{})},
    ...(method==='GET'?{}:{body:JSON.stringify(body??{})}),
    signal:AbortSignal.timeout(15000)
  });
  const raw=await response.text();
  let data;try{data=JSON.parse(raw)}catch{data={message:raw.slice(0,180)}}
  return {status:response.status,ok:response.ok,data};
}
async function rpc(name,token,body){return request('rest/v1/rpc/'+name,{token,body});}
function decodeJwt(value){try{return JSON.parse(Buffer.from(value.split('.')[1],'base64url'))}catch{return {}}}
function base32bytes(secret){
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits=0,value=0;const bytes=[];
  for(const ch of secret.toUpperCase().replace(/[^A-Z2-7]/g,'')){
    value=(value<<5)|alphabet.indexOf(ch);bits+=5;
    if(bits>=8){bytes.push((value>>>(bits-=8))&255);}
  }
  return Buffer.from(bytes);
}
function totp(secret,when=Date.now()){
  const count=Math.floor(when/30000),buffer=Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(count/2**32),0);
  buffer.writeUInt32BE(count>>>0,4);
  const hash=createHmac('sha1',base32bytes(secret)).update(buffer).digest();
  const offset=hash[hash.length-1]&15;
  return String((hash.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');
}
async function enroll(actor){
  const response=await request('auth/v1/factors',{token:actor.token,body:{factor_type:'totp',friendly_name:'Vacancy isolated admin QA'}});
  assert(response.ok&&response.data?.id&&response.data?.totp?.secret,
    actor.role+' authenticator enrollment '+response.status+' '+(response.data?.msg||response.data?.message||''));
  const factor=response.data; // Keep QR/secret in this process only.
  for(const step of [-1,0,1]){
    const challenge=await request('auth/v1/factors/'+factor.id+'/challenge',{token:actor.token,body:{}});
    assert(challenge.ok&&challenge.data.id,'challenge for '+actor.role);
    const verified=await request('auth/v1/factors/'+factor.id+'/verify',{
      token:actor.token,body:{challenge_id:challenge.data.id,code:totp(factor.totp.secret,Date.now()+step*30000)}});
    if(verified.ok&&verified.data?.access_token){
      actor.token=verified.data.access_token;
      assert(decodeJwt(actor.token).aal==='aal2',actor.role+' token must be genuine AAL2');
      console.log('PASS '+actor.role+' GoTrue challenge, TOTP verify and AAL2 JWT');
      return;
    }
    if(step===1)throw Error('Authenticator verify rejected for '+actor.role+': '+verified.status+' '+(verified.data?.msg||verified.data?.message||''));
  }
}
const actors=[];
try{
  for(const role of ['owner','operator','viewer']){
    const email='vacancy-admin-qa-'+RUN+'-'+role+'-'+randomBytes(12).toString('hex')+'@gmail.com';
    const password=randomBytes(30).toString('base64url')+'z9!';
    const out=await request('auth/v1/signup',{body:{
      email,password,data:{vacancy_qa_scope:SCOPE,vacancy_qa_role:role}
    }});
    if(!out.ok||!out.data?.user?.id){
      if(role==='viewer'){console.log('Viewer signup unavailable; owner/operator coverage continues. HTTP '+out.status);continue;}
      throw Error('GoTrue '+role+' signup '+out.status+' '+(out.data?.msg||out.data?.message||'unavailable'));
    }
    actors.push({role,email,password,id:out.data.user.id,token:out.data.access_token||out.data.session?.access_token||null});
    console.log('REGISTERED '+role+' synthetic Auth user for run '+RUN+' (no credentials logged)');
  }
  assert(actors.some(x=>x.role==='owner')&&actors.some(x=>x.role==='operator'),'Owner and Operator must be provisioned');
  const anonState=await rpc('site_appearance_published',null,{});
  assert(anonState.ok&&Array.isArray(anonState.data),'public published-only RPC reads anonymously');
  const protectedAnon=await rpc('admin_appearance_state',null,{p_element_key:'listing-detail/save-button'});
  assert(!protectedAnon.ok,'anonymous protected admin RPC denied');
  console.log('PASS anonymous published-only read, anonymous protected denial');

  // Confirmation and fixed-role assignments are performed separately, inside
  // the *named* test project, by a privileged test fixture SQL update.
  // No database passwords, service keys, or session credentials are exposed.
  console.log('WAITING_FOR_ISOLATED_FIXTURE '+RUN);
  const deadline=Date.now()+210000;
  while(Date.now()<deadline){
    let signedIn=true;
    for(const actor of actors){
      if(actor.token)continue;
      const result=await request('auth/v1/token?grant_type=password',{body:{
        email:actor.email,password:actor.password}});
      if(result.ok&&result.data?.access_token)actor.token=result.data.access_token;
      else signedIn=false;
    }
    if(signedIn){
      const owner=actors.find(x=>x.role==='owner');
      const membership=await request('rest/v1/admin_users?select=user_id&limit=1',{token:owner.token,method:'GET'});
      if(membership.ok&&Array.isArray(membership.data)&&membership.data.some(x=>x.user_id===owner.id))break;
    }
    await wait(4000);
  }
  assert(actors.every(x=>x.token),'Test-only account email confirmation not completed in time');
  console.log('PASS genuine GoTrue password sessions for '+actors.length+' synthetic accounts');
  for(const actor of actors){
    const roles=await rpc('admin_my_capabilities',actor.token,{});
    assert(!roles.ok,actor.role+' cannot read admin capabilities at AAL1');
  }
  console.log('PASS AAL1 admin endpoint denial with actual signed GoTrue JWTs');
  const owner=actors.find(x=>x.role==='owner');
  const operator=actors.find(x=>x.role==='operator');
  await enroll(owner);await enroll(operator);
  const ownerCap=await rpc('admin_my_capabilities',owner.token,{});
  const operatorCap=await rpc('admin_my_capabilities',operator.token,{});
  assert(ownerCap.ok&&ownerCap.data.role==='owner'&&ownerCap.data.appearance_publish===true,'actual AAL2 Owner permissions');
  assert(operatorCap.ok&&operatorCap.data.role==='operator'&&operatorCap.data.appearance_publish===false,'actual AAL2 Operator permissions');
  if(actors.some(x=>x.role==='viewer')){
    const viewer=actors.find(x=>x.role==='viewer');
    const q=await rpc('admin_appearance_state',viewer.token,{p_element_key:'listing-detail/save-button'});
    assert(!q.ok,'signed-in ordinary viewer denied editor read');
  }
  console.log('PASS Owner and Operator real AAL2 capability separation');

  const direct=await request('rest/v1/admin_appearance_drafts?select=actor_id&limit=1',{token:owner.token,method:'GET'});
  assert(!direct.ok,'authenticated Owner cannot directly select private draft table');
  const element='listing-detail/save-button';
  const operatorState=await rpc('admin_appearance_state',operator.token,{p_element_key:element});
  assert(operatorState.ok,'Operator allowed to read editor state with AAL2');
  const opDraft=await rpc('admin_appearance_save_draft',operator.token,{
    p_element_key:element,p_config:{desktop:{height:44}},
    p_expected_draft_version:0,p_expected_published_revision:0});
  assert(opDraft.ok&&opDraft.data.version===1,'Operator can save private draft');
  const opPublish=await rpc('admin_appearance_publish',operator.token,{
    p_element_key:element,p_expected_published_revision:0,p_expected_draft_version:1,
    p_reason:'Operator must not publish test',p_request_id:randomUUID()});
  assert(!opPublish.ok,'Operator cannot publish');
  let publicNow=await rpc('site_appearance_published',null,{});
  assert(publicNow.ok&&publicNow.data.length===0,'Operator private draft cannot leak publicly');
  console.log('PASS direct table denial, private Operator draft and publish rejection');

  const draft=await rpc('admin_appearance_save_draft',owner.token,{
    p_element_key:element,p_config:{all:{radius:14}},
    p_expected_draft_version:0,p_expected_published_revision:0});
  assert(draft.ok&&draft.data.version===1,'Owner saves private draft');
  const reqId=randomUUID();
  const published=await rpc('admin_appearance_publish',owner.token,{
    p_element_key:element,p_expected_published_revision:0,p_expected_draft_version:1,
    p_reason:'Approved synthetic admin styling verification',p_request_id:reqId});
  assert(published.ok&&published.data.revision===1,'Owner publishes rev1');
  const replay=await rpc('admin_appearance_publish',owner.token,{
    p_element_key:element,p_expected_published_revision:0,p_expected_draft_version:1,
    p_reason:'Approved synthetic admin styling verification',p_request_id:reqId});
  assert(replay.ok&&replay.data.alreadyApplied===true,'Owner lost-response retry idempotent');
  publicNow=await rpc('site_appearance_published',null,{});
  assert(publicNow.ok&&publicNow.data?.[0]?.config?.all?.radius===14&&publicNow.data[0].revision===1,
    'anonymous public settings changed only after Owner publish');
  const history=await rpc('admin_appearance_history',owner.token,{p_element_key:element});
  const audit=await rpc('admin_change_audit_recent',owner.token,{p_limit:40});
  assert(history.ok&&history.data?.length===1&&audit.ok&&audit.data.some(x=>x.action==='appearance_published'),
    'published revision and immutable audit accessible to Owner');
  console.log('PASS hosted publish, retry, history, public propagation and audit');

  // Leave test project at code defaults, but preserve audited revision history.
  const toDefaults=await rpc('admin_appearance_save_draft',owner.token,{
    p_element_key:element,p_config:{},p_expected_draft_version:0,p_expected_published_revision:1});
  assert(toDefaults.ok,'Owner can stage compiled defaults');
  const reverted=await rpc('admin_appearance_publish',owner.token,{
    p_element_key:element,p_expected_published_revision:1,p_expected_draft_version:1,
    p_reason:'Restore compiled styles after isolated Auth QA',p_request_id:randomUUID()});
  assert(reverted.ok&&reverted.data.revision===2,'Published defaults as audited second release');
  const finalPublic=await rpc('site_appearance_published',null,{});
  assert(finalPublic.ok&&finalPublic.data?.[0]?.revision===2
    &&JSON.stringify(finalPublic.data?.[0]?.config)==='{}',
    'test project left at compiled public defaults');
  console.log('PASS returned test published styles to compiled defaults with preserved audit');
  console.log('ALL HOSTED AUTH AND PUBLISH CONTRACT CHECKS PASSED');
}catch(error){
  console.error('HOSTED QA BLOCKER: '+String(error?.message||error).replace(/(Bearer\s+)[^\s]+/g,'$1[redacted]').slice(0,450));
  process.exitCode=1;
}
