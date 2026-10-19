// Real Chromium asset decoding and DOM controls; synthetic backend, no network.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';

const browser=await chromium.launch({headless:true});
const checks=[];
try{
 const page=await browser.newPage();
 const html='<main id="app"><div id="favicon"></div><section id="icons"><input id="iconSearch"><div id="iconSlots"></div><div id="iconEditor"></div><select data-icon-proposal></select><div data-icon-catalog-draft></div><button data-new-icon-proposal>New</button></section></main>';
 await page.route('**/*',route=>route.request().isNavigationRequest()&&route.request().url()==='http://127.0.0.1:8774/'?route.fulfill({contentType:'text/html',body:html}):route.abort());
 await page.goto('http://127.0.0.1:8774/');
 await page.evaluate(()=>{
  location.hash='admin';window.currentUser={id:'synthetic-owner'};
  window.escapeHtml=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  window.renderAdmin=async()=>{};
  window.__writes=[];window.__states={};
  window.VACANCY_BACKEND={assuranceLevel:()=> 'aal2',session:()=>({user:currentUser}),
   adminAppearanceState:async key=>structuredClone(__states[key]||{published:{revision:0,config:{}},draft:null,canPublish:true}),
   adminIconProposals:async()=>[],siteIconOverrides:async()=>[],siteIconSlots:async()=>[],
   adminAppearanceSaveDraft:async(...args)=>{__writes.push(args);return {version:1,config:args[1]};}};
  const decode=Image.prototype.decode,text=File.prototype.text;
  window.__pending=[];window.__hold=null;window.__settled=0;
  const wait=async(kind,value)=>{if(__hold===kind)await new Promise((resolve,reject)=>__pending.push({resolve,reject}));return value;};
  Image.prototype.decode=async function(){await decode.call(this);return wait('image');};
  File.prototype.text=async function(){return wait('svg',await text.call(this));};
  window.__release=(reject=false)=>{__hold=null;for(const p of __pending.splice(0))reject?p.reject(Error('Superseded upload failed')):p.resolve();};
  window.__mountFavicon=()=>mountVacancyFaviconDraft(document.querySelector('#favicon'));
 });
 for(const name of ['admin-presentation-draft','site-icon-library','admin-favicon-draft','admin-icon-draft'])await page.addScriptTag({content:await readFile('app/src/'+name+'.js','utf8')});
 await page.evaluate(async()=>{
  const lib=VACANCY_ICON_LIBRARY,NS='http://www.w3.org/2000/svg';
  await mountVacancyIconDrafts(document.querySelector('#icons'),{slots:['find','wifi'],labels:new Map([['find','Find'],['wifi','Wifi']]),overrides:new Map(),refresh:async()=>{},validPath:lib.validPath,svgPathData:lib.svgPathData,listingOptions:()=>[],
   makeNodes:c=>{const node=document.createElementNS(NS,'path');node.setAttribute('d',c.path_d||'M1 1 L2 2');return [node];}});
  await __mountFavicon();
  for(const input of document.querySelectorAll('input[type=file]')){
   const handler=input.onchange;input.onchange=async function(...args){try{return await handler.apply(this,args);}finally{__settled++;}};
  }
 });
 const favicon=page.locator('#favicon'),icon=page.locator('#iconEditor'),catalog=page.locator('[data-icon-catalog-draft]');
 const svg={name:'synthetic.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 3 L20 20"/></svg>')};
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=64;return c.toDataURL('image/png').split(',')[1];});
 const image={name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')};
 let settled=0;
 async function begin(kind,input,file){settled=await page.evaluate(kind=>{__hold=kind;return __settled;},kind);await input.setInputFiles(file);await expect.poll(()=>page.evaluate(()=>__pending.length)).toBe(1);}
 async function finish(reject=false){await page.evaluate(reject=>__release(reject),reject);await expect.poll(()=>page.evaluate(()=>__settled)).toBe(settled+1);}
 const noFavicon=()=>expect(favicon.locator('[data-brand-preview] img')).toHaveCount(0);
 for(const [name,action] of [
  ['compiled favicon',()=>favicon.getByText('Use compiled tab icon (draft)',{exact:true}).click()],
  ['favicon reset',()=>favicon.locator('[data-brand-reset]').click()],
  ['favicon reload',()=>favicon.locator('[data-brand-reload]').click()]
 ]){
  await begin('image',favicon.getByLabel('Choose favicon image'),image);await action();await finish();await noFavicon();
  await expect(favicon.locator('[data-brand-save]')).toBeDisabled();checks.push(name+' supersedes pending decode');
 }
 for(const [name,action] of [
  ['built-in icon',()=>icon.locator('[data-icon-source]').selectOption('wifi')],
  ['compiled icon',()=>icon.locator('[data-icon-original]').click()],
  ['icon reset',()=>icon.locator('[data-brand-reset]').click()]
 ]){
  await begin('svg',icon.locator('[data-icon-upload]'),svg);await action();await finish();
  await expect(icon.locator('[data-icon-source]')).toHaveValue(name==='built-in icon'?'wifi':'');
  await expect(icon.locator('[data-brand-preview] path')).not.toHaveAttribute('d','M3 3 L20 20');checks.push(name+' supersedes pending file read');
 }
 await begin('svg',catalog.locator('[data-catalog-file]'),svg);await catalog.locator('[data-brand-reset]').click();await finish();
 await expect(catalog.locator('[data-brand-preview] svg')).toHaveCount(0);checks.push('catalogue reset supersedes pending file read');
 // Typing the proposal name is compatible with its pending asset choice.
 await begin('svg',catalog.locator('[data-catalog-file]'),svg);await catalog.locator('[data-catalog-label]').fill('Synthetic latest name');await finish();
 await expect(catalog.locator('[data-brand-preview] path')).toHaveAttribute('d','M3 3 L20 20');
 await expect(catalog.locator('[data-catalog-label]')).toHaveValue('Synthetic latest name');checks.push('pending catalogue upload preserves newer label edits');
 // Starting a save invalidates a pending upload even after its RPC has settled.
 await icon.locator('[data-icon-source]').selectOption('wifi');
 await begin('svg',icon.locator('[data-icon-upload]'),svg);await icon.locator('[data-brand-save]').click();
 await expect(icon.locator('[data-brand-status]')).toContainText('Private draft saved');await finish();
 await expect(icon.locator('[data-icon-source]')).toHaveValue('wifi');
 await expect(icon.locator('[data-brand-save]')).toBeDisabled();checks.push('completed save supersedes pending asset');
 await page.evaluate(()=>{if(__writes.length!==1||__writes[0][1].source_slot!=='wifi')throw Error('Unexpected save');__writes=[];});
 await begin('image',favicon.getByLabel('Choose favicon image'),image);await favicon.locator('[data-brand-reset]').click();await finish(true);
 await expect(favicon.locator('[data-brand-status]')).not.toContainText('Superseded upload failed');checks.push('superseded failure cannot replace current status');
 await begin('image',favicon.getByLabel('Choose favicon image'),image);
 await page.evaluate(()=>{currentUser={id:'another-synthetic-actor'};document.querySelector('#favicon').vacancyDraftCleanup();});await finish();
 await expect(favicon.locator('input')).toHaveCount(0);checks.push('account disposal rejects pending asset completion');
 assert.deepEqual(await page.evaluate(()=>__writes),[],'Late asset completions must not save or publish anything');
 checks.push('one deliberate synthetic save only; late completions have zero backend writes; external requests blocked');
 const report={completed:true,kind:'Real Chromium asset/DOM regression with synthetic backend; not hosted authorization acceptance',checks,externalRequestsAllowed:0,deliberateSyntheticSaves:1,lateCompletionWrites:0,publications:0};
 await mkdir('work/full-stack-evidence',{recursive:true});await writeFile('work/full-stack-evidence/admin-asset-races.json',JSON.stringify(report,null,2));
 console.log('PASS '+checks.length+' asset lifecycle checks');
}finally{await browser.close();}
