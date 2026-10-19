// Local operator only: existing test credential is decrypted in memory for the fixed test CLI target.
import {privateDecrypt,constants,createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root='work/release-remaining/',target='raauicmfyjpcuhfzknak';
export const labUrl='https://vacancy-admin-recovery-lab-20261015-b9le1zztj-tbond24s-projects.vercel.app';
export function testMailSecret(){
 const sealed=JSON.parse(fs.readFileSync(root+'sealed/config.json'));
 assert(sealed.commit==='1e95e367dda41d0f94f92bd6f221f86b45508794','Reviewed encrypted transfer source required');
 assert(sealed.publicKeySha256===createHash('sha256').update(Buffer.from(fs.readFileSync(root+'transfer-public.txt','utf8'),'base64')).digest('hex'),'Ephemeral key fingerprint mismatch');
 const bytes=privateDecrypt({key:fs.readFileSync(root+'transfer-private.pem'),oaepHash:'sha256',padding:constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(sealed.ciphertext,'base64'));
 const data=JSON.parse(bytes);bytes.fill(0);
 assert(/^re_[A-Za-z0-9_-]{10,200}$/.test(data.key)&&/^[^\s@]+@gmail\.com$/.test(data.recipient),'Bounded test-only configuration required');return data;
}
export function cli(args,{secret,log='cli-result.json'}={}){
 assert(args.includes('--project-ref')&&args[args.indexOf('--project-ref')+1]===target,'Fixed test target required');
 const result=spawnSync(path.resolve('work/tools/supabase-2.121.0/supabase.exe'),args,{encoding:'utf8',timeout:120000,windowsHide:true,env:{...process.env,...(secret?{VACANCY_TEST_SMTP_KEY:secret.key}:{})}});
 let output=(result.stdout||'')+'\n'+(result.stderr||'');
 for(const v of [secret?.key,secret?.recipient].filter(Boolean))output=output.split(v).join('[REDACTED]');
 fs.writeFileSync(root+log,output,{mode:0o600});
 return {code:result.status,output};
}
function config(mode){
 const previous=fs.readFileSync(root+'checkpoint.toml','utf8');
 assert(!/^\[auth.email.smtp\]/m.test(previous),'Existing custom SMTP requires a separate checkpoint review');
 const auth=previous.split(/^\[auth\]\s*$/m)[1]?.split(/^\[/m)[0];
 assert(auth,'Auth baseline required');
 const originalUrl=auth.match(/^site_url\s*=\s*(.+)$/m)?.[1],redirects=auth.match(/^additional_redirect_urls\s*=\s*(.+)$/m)?.[1];
 assert(originalUrl&&redirects,'Exact original redirect settings required');
 const enable=mode==='apply';
 return 'project_id = "vacancy-managed-email-test-only"\n[auth]\nsite_url = '+(enable?JSON.stringify(labUrl+'/'):originalUrl)+'\nadditional_redirect_urls = '+(enable?JSON.stringify([labUrl+'/']):redirects)+'\n[auth.email.smtp]\nenabled = '+enable+'\nhost = '+JSON.stringify(enable?'smtp.resend.com':'')+'\nport = 465\nuser = '+JSON.stringify(enable?'resend':'')+'\npass = '+JSON.stringify(enable?'env(VACANCY_TEST_SMTP_KEY)':'')+'\nadmin_email = '+JSON.stringify(enable?'qa-reset@getvacancy.site':'')+'\nsender_name = '+JSON.stringify(enable?'Vacancy isolated test':'')+'\n';
}
const mode=process.argv[2];
if(['--review','--apply','--restore-review','--restore'].includes(mode)){
 assert(!process.env.CI,'Local authenticated operator only');
 const restoring=mode.startsWith('--restore'),folder=root+(restoring?'restore':'mail-config');
 fs.mkdirSync(folder+'/supabase',{recursive:true});
 fs.writeFileSync(folder+'/supabase/config.toml',config(restoring?'restore':'apply'));
 const secret=restoring?undefined:testMailSecret();
 const action=mode.endsWith('review')?'diff':'push';
 if(action==='push'){
  const previous=fs.readFileSync(root+(restoring?'restore-':'')+'diff.json','utf8').split(/\r?\n/).find(x=>x.startsWith('{'));
  const review=JSON.parse(previous);assert(review.target.project_ref===target,'Reviewed target mismatch');
  const allowed=new Set(['auth.site_url','auth.additional_redirect_urls','auth.email.smtp.enabled','auth.email.smtp.host','auth.email.smtp.port','auth.email.smtp.user','auth.email.smtp.admin_email','auth.email.smtp.sender_name']);
  assert(review.changes.every(c=>!c.declared||allowed.has(c.path.join('.'))),'Unexpected declared configuration change');
 }
 const result=cli(['config',action,'--project-ref',target,'--workdir',folder,'--output-format','json',...(action==='push'?['--yes']:[])],{secret,log:(restoring?'restore-':'')+action+'.json'});
 assert(result.code===0,'Test-only config '+action+' failed; redacted diagnostics retained privately');
 console.log(JSON.stringify({testProject:target,action,restoring,diagnosticFile:root+(restoring?'restore-':'')+action+'.json'}));
}
