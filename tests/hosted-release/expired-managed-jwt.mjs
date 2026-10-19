// Actual managed JWT expiry with an isolated, temporary Auth lifetime; sends no email.
import fs from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
import {ROOT,api,claims,check} from '../hosted-admin/support.mjs';
import {cli} from './managed-mail-config.mjs';
const dir='work/release-remaining/',w=JSON.parse(fs.readFileSync(dir+'mail-window.json'));
check(process.argv[2]==='--execute-isolated'&&Date.now()<Date.parse(w.expires),'Explicit active test window');
const initial=fs.readFileSync(dir+'checkpoint.toml','utf8').match(/^jwt_expiry\s*=\s*(\d+)/m)?.[1];
check(initial&&Number(initial)>=300,'Captured original lifetime required');
const folder=dir+'expiry-config';fs.mkdirSync(folder+'/supabase',{recursive:true});
const target='raauicmfyjpcuhfzknak',args=['--project-ref',target,'--workdir',folder,'--output-format','json'];
let changed=false,actor,token,request;const evidence=[];
const broker=async(action,body={})=>{const r=await fetch(ROOT+'/functions/v1/qa-managed-mail-window',{method:'POST',headers:{'Content-Type':'application/json','x-qa-window':w.nonce},body:JSON.stringify({action,...body}),signal:AbortSignal.timeout(30000)});check(r.ok,'Fixed expiry fixture '+action);return r.json();};
function config(seconds){fs.writeFileSync(folder+'/supabase/config.toml','project_id = "vacancy-expiry-test-only"\n[auth]\njwt_expiry = '+seconds+'\n');}
const pass=label=>{evidence.push({status:'PASS',label});console.log('PASS '+label);};
try{
 config(60);const review=cli(['config','diff',...args],{log:'expiry-diff.json'});check(review.code===0,'Expiry config review');
 const diff=JSON.parse(review.output.split(/\r?\n/).find(x=>x.startsWith('{')));
 check(diff.changes.filter(x=>x.declared).every(x=>x.path.join('.')==='auth.jwt_expiry'),'Only token lifetime changes');
 changed=true;check(cli(['config','push',...args,'--yes'],{log:'expiry-push.json'}).code===0,'Temporary isolated lifetime');
 // Wait for the provider to return the new configuration; no speculative Auth retries.
 for(let i=0;i<30;i++){
  const r=cli(['config','diff',...args],{log:'expiry-readback.json'}),d=JSON.parse(r.output.split(/\r?\n/).find(x=>x.startsWith('{')));
  if(!d.changes.some(x=>x.declared))break;
  check(i<29,'Provider lifetime propagation timed out');await new Promise(r=>setTimeout(r,2000));
 }
 const password=randomBytes(40).toString('base64url');actor={...await broker('create',{password}),password};request=api(actor.key);
 fs.writeFileSync(dir+'expiry-actor.json',JSON.stringify(actor),{flag:'wx',mode:0o600});
 const recovery=await broker('recovery',{id:actor.id});
 const result=await request('auth/v1/verify',{body:{type:'recovery',token_hash:recovery.token_hash}});check(result.ok,'Genuine managed recovery token');
 token=result.data.access_token;const c=claims(token);check(c.exp-c.iat>=60&&c.exp-c.iat<=120,'Actual bounded signed lifetime');
 check((await request('auth/v1/user',{token,method:'GET'})).ok,'Live recovery token accepted');
 const edge=async()=>{const r=await fetch(ROOT+'/functions/v1/secure-password-reset',{method:'POST',headers:{apikey:actor.key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({password:'short'})});return r.status;};
 check(await edge()===400,'Live recovery token reaches weak-password validation');pass('Genuine provider-signed recovery JWT accepted before actual expiry');
 const wait=Math.max(0,c.exp*1000-Date.now()+2000);check(wait<=125000,'Bounded expiry wait');await new Promise(r=>setTimeout(r,wait));
 const auth=await request('auth/v1/user',{token,method:'GET'}),edgeStatus=await edge();
 const expiredReason=/expired/i.test(String(auth.data?.msg||auth.data?.message||auth.data?.error_description||''));
 fs.writeFileSync(dir+'expiry-boundary-observation.json',JSON.stringify({authStatus:auth.status,authCode:auth.data?.code||auth.data?.error_code,expiredReason,frozenEdgeStatus:edgeStatus,secondsAfterExpiry:Math.floor(Date.now()/1000)-c.exp},null,2));
 check([401,403].includes(auth.status)&&expiredReason&&edgeStatus===401,'Actually expired token rejected by Auth and frozen Edge');
 pass('Same unmodified managed recovery JWT rejected by Auth and frozen reset Edge after real clock expiry');
 fs.writeFileSync(dir+'expired-jwt-evidence.json',JSON.stringify({completed:true,actualProviderToken:true,tokenModified:false,tokenSha256:createHash('sha256').update(token).digest('hex'),lifetimeSeconds:c.exp-c.iat,waitMs:wait,expiredAuthStatus:auth.status,authExpiredReason:expiredReason,expiredFrozenEdgeStatus:edgeStatus,externalMail:false,evidence},null,2));
}catch(error){console.error('EXPIRY CHECK FAILED: '+String(error.message).slice(0,200));process.exitCode=1;}
finally{
 try{
 if(actor){
  const sql=`begin;do $$ begin if not exists(select 1 from auth.users where id='${actor.id}'::uuid and raw_app_meta_data->>'vacancy_managed_mail_scope'='${w.run}') then raise exception 'Fixture provenance mismatch';end if;end $$;delete from auth.sessions where user_id='${actor.id}'::uuid;commit;`;
  fs.writeFileSync(dir+'expiry-cleanup.sql',sql);
  check(cli(['db','query','--linked','--project-ref',target,'--workdir','work/release-remaining','--file','expiry-cleanup.sql','--output','json'],{log:'expiry-cleanup-result.json'}).code===0,'Expiry actor session cleanup');
  check((await broker('delete',{id:actor.id})).deleted,'Expiry actor deletion');
 }
 }finally{if(changed){config(initial);check(cli(['config','push',...args,'--yes'],{log:'expiry-restore.json'}).code===0,'Restore original isolated lifetime');}}
}
