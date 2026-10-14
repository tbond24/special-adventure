// TEST-ONLY HTTP verification against the named non-production Supabase project.
// Uses a publishable key, no service-role credentials and no Auth signup.
const ROOT='https://raauicmfyjpcuhfzknak.supabase.co';
const KEY=process.env.VACANCY_TEST_PUBLISHABLE_KEY;
const EXPECT=process.env.EXPECT_TEST_RADIUS||'none';
if(!KEY?.startsWith('sb_publishable_'))throw Error('Missing test-only publishable key');
async function call(path,body={},method='POST'){
  const r=await fetch(ROOT+'/rest/v1/'+path,{
    method,headers:{apikey:KEY,'Content-Type':'application/json'},
    ...(method==='GET'?{}:{body:JSON.stringify(body)}),
    signal:AbortSignal.timeout(12000)
  });
  const raw=await r.text();
  let data;try{data=JSON.parse(raw)}catch{data=null}
  return {ok:r.ok,status:r.status,data};
}
function check(value,message){if(!value)throw Error('FAILED: '+message);}
const published=await call('rpc/site_appearance_published');
check(published.ok&&Array.isArray(published.data),'real public RPC requires no session');
if(EXPECT==='none')check(published.data.length===0,'default public styles unchanged');
else{
 const row=published.data.find(x=>x.key==='listing-detail/save-button');
 check(row?.config?.all?.radius===Number(EXPECT),'real public style radius matches committed test-only release');
}
console.log('PASS hosted anonymous published settings response; observed rows: '+published.data.length);
const forbidden=await Promise.all([
 call('rpc/admin_appearance_state',{p_element_key:'listing-detail/save-button'}),
 call('rpc/admin_appearance_publish',{p_element_key:'listing-detail/save-button',
   p_expected_published_revision:0,p_expected_draft_version:1,
   p_reason:'Unauthorized anonymous publish',p_request_id:'70000000-0000-4000-8000-000000000001'}),
 call('admin_appearance_drafts?select=actor_id&limit=1',{},'GET'),
 call('admin_change_audit?select=id&limit=1',{},'GET')
]);
check(forbidden.every(x=>!x.ok),'anonymous RPC and table access must be denied');
console.log('PASS denied anonymous editor read, publish, private draft and audit table endpoints');
console.log('ALL HOSTED ANONYMOUS API CONTRACT CHECKS PASSED');
