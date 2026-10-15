const {test,expect}=require('@playwright/test');
const path=require('node:path');
const fs=require('node:fs');
const base='http://127.0.0.1:8776';
test.use({trace:'off',screenshot:'off'});
async function start(page,{operator=false,unavailable=false}={}){
  await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  await page.route(base+'/display-test',route=>route.fulfill({contentType:'text/html',body:
    '<!doctype html><html data-card-services="on"><body><p>DEVELOPMENT · SYNTHETIC COMPONENT TEST</p><main id="app"><nav id="adminSectionMenu"><button data-section="icons">Appearance</button><button data-section="overview">Overview</button></nav><select class="admin-section-select"><option value="icons">Appearance</option><option value="overview">Overview</option></select><a id="leave" href="#home">Leave admin</a><div id="display"></div></main></body></html>'}));
  await page.goto(base+'/display-test#admin');
  await page.evaluate(({operator,unavailable})=>{
    window.currentUser={id:'synthetic-owner'};
    window.escapeHtml=value=>{const n=document.createElement('span');n.textContent=value;return n.innerHTML;};
    window.card=()=>'<article class="listing-card" data-open-card="synthetic"><button class="heart-action saved" data-save="synthetic" aria-pressed="true" onclick="parent.D.business++">Save</button><div class="listing-price">Synthetic price</div><span class="service-card-pill">Wi-Fi</span></article>';
    const copy=x=>JSON.parse(JSON.stringify(x));
    window.D={published:{revision:0,config:{all:{enabled:true}}},draft:null,history:[],publicEnabled:true,
      calls:[],publicReads:[],applied:new Map(),business:0,apply:0,failSave:false,failPublish:false,failPropagation:false,lostAck:false,unavailable};
    const d=window.D;
    window.VACANCY_BACKEND={assuranceLevel:()=> 'aal2',session:()=>({user:{id:currentUser.id}}),activeVacancies:async()=>[{id:'synthetic-public-listing'}],
      adminAppearanceState:async()=>{if(d.unavailable)throw Error('Synthetic schema unavailable');return {published:copy(d.published),draft:copy(d.draft),canPublish:!operator};},
      adminAppearanceSaveDraft:async(key,config,version,revision)=>{
        d.calls.push(['save',key,version,revision]);if(d.failSave)throw Error('Synthetic save failure');
        if(version!==(d.draft?.version||0)||revision!==d.published.revision)throw Error('Synthetic conflict');
        d.draft={version:version+1,baseRevision:revision,config:copy(config)};return copy(d.draft);
      },
      adminAppearancePublish:async(key,revision,version,reason,id)=>{
        d.calls.push(['publish',key,revision,version,reason,id]);
        if(operator)throw Error('Synthetic Owner permission required');
        if(d.applied.has(id))return copy(d.applied.get(id));
        if(d.failPublish)throw Error('Synthetic audit rejection');
        if(revision!==d.published.revision||version!==d.draft?.version)throw Error('Synthetic conflict');
        d.published={revision:revision+1,config:copy(d.draft.config)};d.publicEnabled=d.published.config.all?.enabled??true;
        d.history.unshift({...copy(d.published),reason});d.draft=null;
        const result={revision:d.published.revision};d.applied.set(id,result);
        if(d.lostAck){d.lostAck=false;throw Error('Synthetic lost acknowledgement');}return result;
      },
      siteAppearancePublished:async(options)=>{d.publicReads.push(['appearance',options]);return d.failPropagation?[]:[{key:'listing-display/card-services',...copy(d.published)}];},
      listingDisplayOptions:async(options)=>{d.publicReads.push(['display',options]);return [{slot:'card-services',enabled:d.publicEnabled}];},
      adminAppearanceHistory:async()=>copy(d.history),
      adminAppearanceRestoreDraft:async(key,revision,version,current)=>{
        if(operator)throw Error('Synthetic Owner permission required');
        if(version!==(d.draft?.version||0)||current!==d.published.revision)throw Error('Synthetic conflict');
        d.draft={version:version+1,baseRevision:current,config:copy(d.history.find(x=>x.revision===revision).config)};return copy(d.draft);
      }};
    document.querySelector('#adminSectionMenu').onclick=e=>{window.section=e.target.dataset.section;};
    document.querySelector('.admin-section-select').onchange=e=>{window.section=e.target.value;};
  },{operator,unavailable});
  await page.addScriptTag({path:path.resolve(__dirname,'../app/src/admin-display-draft.js')});
  await page.evaluate(()=>mountVacancyDisplayDraft(document.querySelector('#display'),async()=>{D.apply++;document.documentElement.dataset.cardServices=D.publicEnabled?'on':'off';}));
  if(!unavailable)await expect(page.locator('[data-display-enabled]')).toBeEnabled();
}
const status=page=>page.locator('[data-display-status]');
async function draft(page,value){
  await page.locator('[data-display-enabled]').setChecked(value);
  await page.locator('[data-display-save]').click();await expect(status(page)).toContainText('Private draft saved');
}
async function publish(page){
  await page.locator('[data-display-review]').click();
  await page.locator('[data-display-reason]').fill('Synthetic display review');
  await page.locator('[data-display-publish]').click();
}

test('private preview/save has no public mutation; reviewed publication verifies anonymous contracts',async({page})=>{
  await start(page);await page.locator('summary').click();
  await page.locator('[data-display-enabled]').uncheck();
  await expect(page.frameLocator('[data-display-preview]').locator('.service-card-pill')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.dataset.cardServices)).toBe('on');
  expect(await page.evaluate(()=>D.calls.length)).toBe(0);
  await page.locator('[data-display-save]').click();await expect(status(page)).toContainText('Private draft saved');
  expect(await page.evaluate(()=>D.publicEnabled)).toBe(true);
  await publish(page);await expect(status(page)).toContainText('verified in public settings');
  expect(await page.evaluate(()=>D.publicEnabled)).toBe(false);
  expect(await page.evaluate(()=>D.publicReads.every(x=>x[1].anonymous===true))).toBe(true);
  expect(await page.evaluate(()=>D.business)).toBe(0);
  expect(await page.locator('[data-display-preview]').getAttribute('sandbox')).toBe('');
  await expect(page.frameLocator('[data-display-preview]').locator('[data-save],[onclick]')).toHaveCount(0);
});

test('Operator can draft and inspect history but cannot publish or restore',async({page})=>{
  await start(page,{operator:true});await draft(page,false);
  await expect(page.locator('[data-display-review]')).toBeDisabled();
  await page.evaluate(()=>D.history=[{revision:1,config:{all:{enabled:true}},reason:'Synthetic previous'}]);
  await page.locator('[data-display-history]').click();
  await expect(page.locator('[data-display-restore]')).toBeDisabled();
  expect(await page.evaluate(()=>D.calls.some(x=>x[0]==='publish'))).toBe(false);
});

test('conflict and failed save keep edits; unavailable schema has a working reload',async({page})=>{
  await start(page,{unavailable:true});await expect(status(page)).toContainText('unavailable');
  await page.evaluate(()=>D.unavailable=false);await page.locator('[data-display-reload]').click();
  await expect(page.locator('[data-display-enabled]')).toBeEnabled();
  await page.locator('[data-display-enabled]').uncheck();
  await page.evaluate(()=>D.failSave=true);await page.locator('[data-display-save]').click();
  await expect(status(page)).toContainText('save failure');await expect(page.locator('[data-display-enabled]')).not.toBeChecked();
  await page.evaluate(()=>{D.failSave=false;D.published.revision++;});
  await page.locator('[data-display-save]').click();await expect(status(page)).toContainText('conflict');
  await expect(page.locator('[data-display-enabled]')).not.toBeChecked();
  expect(await page.evaluate(()=>D.publicEnabled)).toBe(true);
});

test('history restore creates a private draft and requires a new publication',async({page})=>{
  await start(page);await draft(page,false);await publish(page);
  await expect(status(page)).toContainText('verified in public settings');
  await draft(page,true);await publish(page);await expect(status(page)).toContainText('Published revision 2');
  await page.locator('[data-display-history]').click();await page.locator('[data-display-restore="1"]').click();
  await expect(status(page)).toContainText('Earlier version copied to a private draft');
  expect(await page.evaluate(()=>D.publicEnabled)).toBe(true);
  await page.locator('[data-display-reason]').fill('Synthetic reviewed restore');await page.locator('[data-display-publish]').click();
  await expect(status(page)).toContainText('Published revision 3');
  expect(await page.evaluate(()=>D.history.length)).toBe(3);
});

test('lost acknowledgement retries the same publication ID, without a second publication',async({page})=>{
  await start(page);await draft(page,false);await page.evaluate(()=>D.lostAck=true);await publish(page);
  await expect(status(page)).toContainText('lost acknowledgement');
  await page.locator('[data-display-publish]').click();await expect(status(page)).toContainText('verified in public settings');
  expect(await page.evaluate(()=>D.history.length)).toBe(1);
  expect(await page.evaluate(()=>{const a=D.calls.filter(x=>x[0]==='publish');return a.length===2&&a[0][5]===a[1][5];})).toBe(true);
});

test('publication acknowledgement remains distinct from failed public propagation',async({page})=>{
  await start(page);await draft(page,false);await page.evaluate(()=>D.failPropagation=true);await publish(page);
  await expect(status(page)).toContainText('Published revision 1; public propagation is unverified');
  expect(await page.evaluate(()=>D.history.length)).toBe(1);
  await expect(page.locator('[data-display-publish]')).toBeDisabled();
});

test('dirty navigation supports Stay, failed Save, successful Save and Discard',async({page})=>{
  await start(page);await page.locator('[data-display-enabled]').uncheck();await page.locator('#leave').click();
  await expect(page.locator('dialog')).toBeVisible();await page.locator('[data-display-stay]').click();
  await expect(page).toHaveURL(/#admin$/);
  await page.evaluate(()=>D.failSave=true);await page.locator('#leave').click();await page.locator('[data-display-leave-save]').click();
  await expect(page.locator('[data-display-leave-status]')).toContainText('edits are still here');
  await expect(page).toHaveURL(/#admin$/);
  await page.evaluate(()=>D.failSave=false);await page.locator('[data-display-leave-save]').click();await expect(page).toHaveURL(/#home$/);
  await start(page);await page.locator('[data-display-enabled]').uncheck();await page.locator('#leave').click();
  await page.locator('[data-display-discard]').click();await expect(page).toHaveURL(/#home$/);
  expect(await page.evaluate(()=>D.draft)).toBeNull();
});

test('section button/select and programmatic hash navigation preserve dirty values',async({page})=>{
  await start(page);await page.locator('[data-display-enabled]').uncheck();
  await page.locator('[data-section=overview]').click();await expect(page.locator('dialog')).toBeVisible();
  expect(await page.evaluate(()=>window.section)).toBeUndefined();await page.locator('[data-display-stay]').click();
  await page.locator('.admin-section-select').selectOption('overview');await expect(page.locator('dialog')).toBeVisible();
  await page.locator('[data-display-stay]').click();
  await page.evaluate(()=>location.hash='#home');await expect(page.locator('dialog')).toBeVisible();
  await expect(page).toHaveURL(/#admin$/);await page.locator('[data-display-stay]').click();
  await expect(page.locator('[data-display-enabled]')).not.toBeChecked();
});

test('changed account drops a late private response and clears old controls',async({page})=>{
  await start(page);await page.locator('[data-display-enabled]').uncheck();
  await page.evaluate(()=>VACANCY_BACKEND.adminAppearanceSaveDraft=()=>new Promise(resolve=>window.finishSave=resolve));
  await page.locator('[data-display-save]').click();
  await page.evaluate(()=>{currentUser={id:'synthetic-new-account'};finishSave({config:{all:{enabled:false}},version:1});});
  await expect(page.locator('#display')).toBeEmpty();
});

test('component controls remain reachable with no page overflow at this project viewport',async({page},info)=>{
  await start(page);await draft(page,false);await page.locator('[data-display-review]').click();
  await expect(page.locator('[data-display-reason]')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:'test-results/display-draft-synthetic-'+info.project.name+'.png',fullPage:true});
});

test('an older saved draft requires an explicit save against the latest publication',async({page})=>{
  await start(page);
  await page.evaluate(()=>{D.published.revision=2;D.draft={version:1,baseRevision:0,config:{all:{enabled:false}}};});
  await page.locator('[data-display-reload]').click();
  await expect(status(page)).toContainText('older publication');
  await expect(page.locator('[data-display-review]')).toBeDisabled();
  await expect(page.locator('[data-display-save]')).toBeEnabled();
  await page.locator('[data-display-save]').click();await expect(status(page)).toContainText('Private draft saved');
  expect(await page.evaluate(()=>D.draft.baseRevision)).toBe(2);
  await expect(page.locator('[data-display-review]')).toBeEnabled();
});

test('explicit public backend reads omit the stored admin bearer and bypass its refresh',async({page})=>{
  await start(page);
  await page.addScriptTag({content:fs.readFileSync(path.resolve(__dirname,'../app/src/backend.js'),'utf8')
    .replaceAll('https://xtutkwiivqkgkqjpkxvj.supabase.co',base)
    .replace(/const KEY = '[^']*';/,"const KEY = 'synthetic-public-key';")});
  const calls=await page.evaluate(async()=>{
    localStorage.setItem('vacancy-session-v01',JSON.stringify({access_token:'synthetic-private-admin-bearer',refresh_token:'synthetic-refresh'}));
    const calls=[];window.fetch=async(url,options)=>{calls.push({url,authorization:options.headers.Authorization,cache:options.cache});return new Response('[]');};
    await VACANCY_BACKEND.siteAppearancePublished({anonymous:true});
    await VACANCY_BACKEND.listingDisplayOptions({anonymous:true});return calls;
  });
  expect(calls).toHaveLength(2);
  expect(calls.every(call=>call.authorization==='Bearer synthetic-public-key'&&call.cache==='no-store')).toBe(true);
  expect(calls.every(call=>!call.url.includes('/auth/'))).toBe(true);
});
