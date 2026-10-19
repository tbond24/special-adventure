import {readFile,writeFile} from 'node:fs/promises';
import {ROOT,check} from '../hosted-admin/support.mjs';
export const automated=process.env.VACANCY_HOSTED_CI==='1';
let next=0,tail=Promise.resolve(),count=0;
export function gate(){
 const task=tail.then(async()=>{check(++count<=1000,'Bounded backend request budget exceeded');const wait=Math.max(0,next-Date.now());if(wait)await new Promise(r=>setTimeout(r,wait));next=Date.now()+260;});
 tail=task.catch(()=>{});return task;
}
if(automated){const raw=globalThis.fetch;globalThis.fetch=async(input,options)=>{if(new URL(typeof input==='string'?input:input.url).origin===ROOT)await gate();return raw(input,options);};}
export async function command(action){
 const window=JSON.parse(await readFile(new URL('../../work/hosted-release/window.json',import.meta.url),'utf8'));
 const r=await fetch(ROOT+'/functions/v1/qa-hosted-release-window',{method:'POST',headers:{'Content-Type':'application/json','x-qa-window':window.nonce},body:JSON.stringify({action:'fixture',phase:action}),signal:AbortSignal.timeout(90000)});
 check(r.ok,'Bounded automatic fixture '+action+' HTTP '+r.status);return r.json();
}
export async function automaticBarrier(name,dir){
 if(!automated)return false;
 const result=await command(name);
 if(name==='media-cleanup')await writeFile(new URL(name+'.ready',dir),JSON.stringify(result));
 return true;
}
export async function routeIsolated(route,lab){
 const origin=new URL(route.request().url()).origin;
 if(origin===lab)return route.continue();
 if(origin!==ROOT)return route.abort();
 await gate();return route.continue();
}
export const requestCount=()=>count;
