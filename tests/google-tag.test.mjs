import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {isolatedText} from '../scripts/dev-server.mjs';

const root=path.resolve(process.env.VACANCY_GOOGLE_TAG_ROOT||'app');
const id='G-SL2NP26QHM',require=createRequire(import.meta.url);
const pages=await Promise.all(['index.html','404.html'].map(name=>readFile(path.join(root,name),'utf8')));
const preferences=await readFile(path.join(root,'src/analytics-preferences.js'),'utf8');
function checkTag(html){
 const head=html.match(/<head>([\s\S]*?)<\/head>/)?.[1];assert.ok(head);
 assert.equal((html.match(/src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-SL2NP26QHM"/g)||[]).length,1);
 assert.equal((html.match(/gtag\('config', 'G-SL2NP26QHM'\)/g)||[]).length,1);
 const preferencesAt=head.indexOf('analytics-preferences.js');
 assert.ok(preferencesAt>=0&&preferencesAt<head.indexOf('<!-- Google tag'));
 assert.ok(head.indexOf('<!-- Google tag')<head.indexOf('<title>'));
 assert.match(head,/<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js/);
}
function browser({hash='#home',stored=false,blocked=false,dnt,gpc}={}){
 const events=new Map(),values=new Map(stored?[['vacancy-analytics-disabled','true']]:[]);
 const context={location:{hash,reload(){}},navigator:{doNotTrack:dnt,globalPrivacyControl:gpc},
  localStorage:{getItem(k){if(blocked)throw Error('Denied');return values.get(k)||null;},setItem(k,v){if(blocked)throw Error('Denied');values.set(k,v);}},
  addEventListener(name,fn){events.set(name,fn);}};
 context.window=context;vm.createContext(context);vm.runInContext(preferences,context);
 return {context,events,values};
}

test('shared app and recovery heads install the requested tag once, after opt-out bootstrap',()=>{
 for(const html of pages){checkTag(html);const {context}=browser();
  const block=html.match(/<!-- Google tag \(gtag\.js\) -->[\s\S]*?<!-- End Google tag -->/)[0];
  vm.runInContext(block.match(/<script>([\s\S]*?)<\/script>/)[1],context);
  assert.equal(context.dataLayer.length,2);assert.equal(context.dataLayer[0][0],'js');
  assert.equal(context.dataLayer[1][0],'config');assert.equal(context.dataLayer[1][1],id);
 }
});

test('Google disable switch follows existing exclusion, privacy signals and unavailable storage',async()=>{
 assert.equal(browser().context['ga-disable-'+id],false);
 for(const options of [{stored:true},{hash:'#admin'},{hash:'#admin/overview'},{hash:'#admin?section=overview'},{hash:'#admin',blocked:true},{dnt:'1'},{gpc:true}])assert.equal(browser(options).context['ga-disable-'+id],true,JSON.stringify(options));
 const {context,events,values}=browser();context.VACANCY_ANALYTICS_PREFERENCES.exclude();assert.equal(context['ga-disable-'+id],true);
 context.location.hash='#home';events.get('hashchange')();assert.equal(context['ga-disable-'+id],true);
 const another=browser();another.values.set('vacancy-analytics-disabled','true');another.events.get('storage')({key:'vacancy-analytics-disabled'});assert.equal(another.context['ga-disable-'+id],true);
 const navigation=browser();navigation.context.location.hash='#admin';navigation.events.get('hashchange')();assert.equal(navigation.context['ga-disable-'+id],true);
 assert.equal(values.get('vacancy-analytics-disabled'),'true');
 const recognised=browser(),backend=await readFile(path.join(root,'src/backend.js'),'utf8');
 recognised.context.currentUser=async()=>({id:'synthetic-admin',is_anonymous:false});
 recognised.context.rest=async()=>[{user_id:'synthetic-admin'}];
 const membership=backend.split('\n').find(line=>line.includes('async function adminMembership('));assert.ok(membership);
 vm.runInContext(membership,recognised.context);assert.equal(await recognised.context.adminMembership(),true);
 assert.equal(recognised.context['ga-disable-'+id],true);
});

test('preview strips Google loader/config and rejects an unbounded loader',()=>{
 for(const html of pages){const result=isolatedText(html);assert.ok(!result.includes('googletagmanager.com'));assert.ok(!result.includes("gtag('config'"));}
 assert.throws(()=>isolatedText('<script async src="https://www.googletagmanager.com/gtag/js?id='+id+'"></script>'),/Google tag remains/);
});

test('listing success, missing, expired and failed lookup inherit exactly one tag without hosted requests',async()=>{
 const source=await readFile(path.join(root,'api/listing-page.js'),'utf8');
 const listing={rent_amount:12000,rent_currency:'KES',rent_period:'month',rooms:{name:'Synthetic unit',description:'Synthetic listing',media:[],properties:{city:'Nairobi',country:'Kenya'}}};
 for(const scenario of ['success','missing','expired','failure','invalid']){
  const context={module:{exports:{}},require,__dirname:path.join(root,'api'),URLSearchParams,AbortSignal,console:{error(){}},fetch:async()=>{
   assert.notEqual(scenario,'invalid');if(scenario==='failure')throw Error('Synthetic offline');
   return {ok:true,json:async()=>scenario==='missing'?[]:[{...listing,expires_at:scenario==='expired'?'2000-01-01T00:00:00Z':null}]};
  }};
  vm.runInNewContext(source,context);
  const response={setHeader(){},status(n){this.code=n;return this;},end(html){this.body=html;}};
  await context.module.exports({query:{id:scenario==='invalid'?'invalid':'00000000-0000-4000-8000-000000000001'}},response);
  assert.equal(response.code,scenario==='success'?200:scenario==='failure'?502:404);checkTag(response.body);
 }
});
