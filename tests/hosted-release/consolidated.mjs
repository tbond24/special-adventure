import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {check} from '../hosted-admin/support.mjs';
import {command} from './ci-support.mjs';
check(process.platform==='linux'&&process.env.CI==='true'&&process.env.VACANCY_HOSTED_CI==='1','Reviewed Linux CI only');
const bundle=JSON.parse(process.env.VACANCY_HOSTED_WINDOW||'null');
delete process.env.VACANCY_HOSTED_WINDOW;
check(bundle?.commit===process.env.GITHUB_SHA&&/^[a-f0-9]{40}$/.test(bundle.commit),'Exact reviewed source required');
check(Date.now()<Date.parse(bundle.window.expires),'Window expired');
const dir=new URL('../../work/hosted-release/',import.meta.url),out=new URL('../../work/hosted-evidence/',import.meta.url);
await mkdir(dir,{recursive:true});await mkdir(out,{recursive:true});
for(const name of ['window','lab'])await writeFile(new URL(name+'.json',dir),JSON.stringify(bundle[name]),{flag:'wx',mode:0o600});
const stages=[];let cleanup;
try{
 for(const file of ['run.mjs','admin-browser.mjs']){
  const code=await new Promise((resolve,reject)=>{
   const p=spawn(process.execPath,['tests/hosted-release/'+file,'--execute-isolated'],{stdio:'inherit',timeout:23*60*1000});
   p.once('error',reject);p.once('exit',c=>resolve(c));
  });
  stages.push({file,code});check(code===0,'Consolidated stage failed: '+file);
 }
 const zoom=JSON.parse(await readFile(new URL('admin-native-zoom.json',dir),'utf8'));
 check(zoom.factor===2&&zoom.actualHostedBackend,'Actual hosted native zoom required');
}finally{
 try{cleanup=await command('cleanup');check(cleanup.clean&&cleanup.preservation,'Verified cleanup');await command('close');}
 catch{cleanup={clean:false};process.exitCode=1;}
 const files=['evidence.json','browser-evidence.json','mixed-pilot.json','admin-browser-evidence.json','admin-native-zoom.json'];
 for(const name of files){try{
  const content=await readFile(new URL(name,dir),'utf8');
  // No credential-bearing files, traces, request bodies or arbitrary directory globs.
  for(const secret of [bundle.window.nonce,bundle.lab.secret,bundle.lab.shareableUrl])check(!secret||!content.includes(secret),'Artifact secret rejection');
  check(!/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(content),'Artifact JWT rejection');
  await writeFile(new URL(name,out),content);
 }catch(error){if(error.code!=='ENOENT')throw error;}}
 await writeFile(new URL('consolidated.json',out),JSON.stringify({commit:bundle.commit,deployedSource:bundle.lab.source,deployment:bundle.lab.deployment,stages,cleanup,completed:stages.length===2&&stages.every(s=>s.code===0)&&cleanup.clean,productionTouched:false,purchase:false,externalMail:false},null,2));
}
