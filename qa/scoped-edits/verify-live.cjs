const fs=require('fs'),crypto=require('crypto');
(async()=>{
const root='https://getvacancy.site';const files=require('child_process').execFileSync('git',['diff','--name-only','fe72fac','e35ddd9'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(x=>x.startsWith('app/'));
const checks=[];for(const file of files){const r=await fetch(root+'/'+file.slice(4)+'?verify=e35ddd9');const b=Buffer.from(await r.arrayBuffer());checks.push({file,status:r.status,match:r.ok&&b.equals(fs.readFileSync(file))});}
const backend=fs.readFileSync('app/src/backend.js','utf8'),url=backend.match(/const URL = '([^']+)'/)[1],key=backend.match(/const KEY = '([^']+)'/)[1];
for(const name of ['admin_recent_activity','admin_favicon']){const r=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:'{}'});checks.push({api:name,status:r.status,denied:r.status===401||r.status===403});}
const f=await fetch(url+'/rest/v1/site_favicon?select=id,png,revision,updated_at',{headers:{apikey:key}});const body=await f.json();checks.push({api:'public favicon',status:f.status,valid:f.ok&&body.length===1&&body[0].revision===0});
fs.writeFileSync('qa/scoped-edits/live-release-checks.json',JSON.stringify({at:new Date().toISOString(),checks},null,2));console.log(JSON.stringify(checks,null,2));if(checks.some(c=>c.match===false||c.denied===false||c.valid===false))process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1});
