// Build reviewed SQL inputs only. This module never connects to any database.
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const git=(...args)=>execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/').replace(/\/$/,''),...args],{cwd:root,maxBuffer:10*1024*1024});
const sha=value=>createHash('sha256').update(value).digest('hex');
const checkpoint='b57915abeea0e9adcf0e9769a976a085c22d4944';
export function reconciliationPlan(){
 const manifest=JSON.parse(readFileSync(path.join(root,'docs/evidence/admin-release-candidate-execution-20261017.json')));
 assert.equal(manifest.candidates.length,17);
 const candidates=new Set(manifest.candidates.map(c=>path.basename(c.path)));
 const historical=readdirSync(path.join(root,'supabase/migrations')).filter(f=>/^\d+_.+\.sql$/.test(f)&&!candidates.has(f)).sort();
 assert.equal(historical.length,69);
 const entries=historical.map((file,i)=>({path:'supabase/migrations/'+file,kind:'baseline',providerName:'qa_hosted_baseline_'+String(i+1).padStart(3,'0')}));
 entries.push(...manifest.candidates.map(c=>({path:c.path,kind:'candidate',providerName:'qa_hosted_release_'+String(c.ordinal).padStart(2,'0'),expectedSha256:c.sha256})));
 return entries.map((entry,i)=>{
  const original=git('show',checkpoint+':'+entry.path).toString('utf8');
  assert.equal(readFileSync(path.join(root,entry.path),'utf8').replace(/\r\n/g,'\n'),original,'Canonical SQL changed');
  let sql=original,omittedPrivateAssignment=false;
  if(entry.path.endsWith('/20260906132736_operations_analytics_and_expiry.sql')){
   const text="insert into public.admin_users(user_id) values ('11111111-1111-4111-8111-111111111111') on conflict do nothing;";
   assert.equal(sql.split(text).length,2);sql=sql.replace(text,'-- Hosted test replay omits the manifested historical private account assignment.');omittedPrivateAssignment=true;
  }
  if(entry.expectedSha256)assert.equal(sha(original),entry.expectedSha256);
  return {...entry,ordinal:i+1,sourceSha256:sha(original),replaySha256:sha(sql),omittedPrivateAssignment,sql};
 });
}
if(process.argv.includes('--prepare')){
 const plan=reconciliationPlan(),dir=path.join(root,'work/hosted-release/steps');mkdirSync(dir,{recursive:true});
 for(const entry of plan)writeFileSync(path.join(dir,String(entry.ordinal).padStart(3,'0')+'.json'),JSON.stringify(entry));
 console.log(JSON.stringify({prepared:plan.length,project:'raauicmfyjpcuhfzknak',canonicalCandidatesUnchanged:true}));
}else if(process.argv.includes('--step')){
 const index=Number(process.argv[process.argv.indexOf('--step')+1]);assert(Number.isInteger(index)&&index>=1&&index<=86);
 process.stdout.write(JSON.stringify(reconciliationPlan()[index-1]));
}else if(process.argv.includes('--plan')){
 const plan=reconciliationPlan();console.log(JSON.stringify({checkpoint,project:'raauicmfyjpcuhfzknak',historical:69,candidates:17,omissions:plan.filter(x=>x.omittedPrivateAssignment).length,maxSqlBytes:Math.max(...plan.map(x=>Buffer.byteLength(x.sql))),entries:plan.map(({sql,...rest})=>rest)}));
}
