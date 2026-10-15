const {test,expect}=require('@playwright/test');
const path=require('node:path');
const fs=require('node:fs');
const activitySource=path.resolve(__dirname,'../app/src/admin-activity-favicon.js');
test.use({trace:'off',screenshot:'off'});

async function start(page,{hidden=false}={}){
  await page.route('**/*',route=>route.request().url()==='http://127.0.0.1:8776/activity-test'
    ?route.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':"connect-src 'none'"},
      body:'<!doctype html><main id="host"><section data-admin-section="activity"></section></main>'})
    :route.abort());
  await page.goto('http://127.0.0.1:8776/activity-test#admin');
  await page.clock.install({time:new Date('2026-10-15T10:30:00Z')});
  await page.clock.pauseAt(new Date('2026-10-15T10:31:00Z'));
  await page.evaluate(hidden=>{
    window.currentUser={id:'synthetic-admin-a'};
    window.account='synthetic-admin-a';window.aal='aal2';window.tabHidden=false;
    Object.defineProperty(document,'hidden',{get:()=>window.tabHidden});
    window.escapeHtml=value=>{const node=document.createElement('span');node.textContent=value;return node.innerHTML;};
    window.reads=[];
    window.response=label=>({generated_at:new Date().toISOString(),browsers_recent:4,
      accounts_created:2,sources:[{source:label,sessions:3}],
      actions:[{event_name:'location_started',events:7}],recent:[]});
    window.VACANCY_BACKEND={assuranceLevel:()=>window.aal,session:()=>({user:{id:window.account}}),
      recentActivity:({signal})=>new Promise((resolve,reject)=>window.reads.push({signal,resolve,reject}))};
    document.querySelector('[data-admin-section]').hidden=hidden;
  },hidden);
  await page.addScriptTag({path:activitySource});
  await page.evaluate(()=>mountVacancyAdminTools(document.querySelector('#host')));
}
const readCount=page=>page.evaluate(()=>reads.length);
const finish=(page,label,index=0)=>page.evaluate(({label,index})=>reads[index].resolve(response(label)),{label,index});
const status=page=>page.locator('[data-recent-activity] [role=status]');
const body=page=>page.locator('[data-activity-body]');

test('one aggregate, no duplicate mounts or overlapping pending reads; normal visible cadence',async({page})=>{
  await start(page);
  expect(await readCount(page)).toBe(1);
  await page.evaluate(()=>mountVacancyAdminTools(document.querySelector('#host')));
  await page.clock.runFor(10000);
  await page.evaluate(()=>document.querySelector('[data-recent-activity] button').onclick());
  expect(await readCount(page)).toBe(1);
  await finish(page,'Recorded synthetic campaign');
  await expect(body(page)).toContainText('Recorded synthetic campaign');
  await expect(body(page)).toContainText('Browser IDs seen in the last 5 minutes');
  await expect(status(page)).toContainText('Report generated');
  await page.clock.runFor(29999);expect(await readCount(page)).toBe(1);
  await page.clock.runFor(1);expect(await readCount(page)).toBe(2);
});

test('hidden section starts no read; hiding cancels; a late obsolete result cannot overwrite resumed data',async({page})=>{
  await start(page,{hidden:true});
  await page.clock.runFor(90000);expect(await readCount(page)).toBe(0);
  await page.evaluate(()=>document.querySelector('[data-admin-section]').hidden=false);
  await expect.poll(()=>readCount(page)).toBe(1);
  await page.evaluate(()=>document.querySelector('[data-admin-section]').hidden=true);
  await expect.poll(()=>page.evaluate(()=>reads[0].signal.aborted)).toBe(true);
  await page.clock.runFor(90000);expect(await readCount(page)).toBe(1);
  await page.evaluate(()=>document.querySelector('[data-admin-section]').hidden=false);
  await expect.poll(()=>readCount(page)).toBe(2);
  await finish(page,'Newest synthetic result',1);
  await finish(page,'Obsolete result',0);
  await expect(body(page)).toContainText('Newest synthetic result');
  await expect(body(page)).not.toContainText('Obsolete result');
});

test('background document cancels the read and resumes once without a second timer',async({page})=>{
  await start(page);
  await page.evaluate(()=>{window.tabHidden=true;document.dispatchEvent(new Event('visibilitychange'));});
  expect(await page.evaluate(()=>reads[0].signal.aborted)).toBe(true);
  await page.clock.runFor(120000);expect(await readCount(page)).toBe(1);
  await page.evaluate(()=>{window.tabHidden=false;document.dispatchEvent(new Event('visibilitychange'));document.dispatchEvent(new Event('visibilitychange'));});
  expect(await readCount(page)).toBe(2);
  await finish(page,'Foreground data',1);
  await expect(body(page)).toContainText('Foreground data');
  await page.clock.runFor(30000);expect(await readCount(page)).toBe(3);
});

test('back-forward cache suspension cancels and restored page refreshes once',async({page})=>{
  await start(page);
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
  expect(await page.evaluate(()=>reads[0].signal.aborted)).toBe(true);
  await page.clock.runFor(90000);expect(await readCount(page)).toBe(1);
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
  expect(await readCount(page)).toBe(2);
  await finish(page,'Restored page',1);await finish(page,'Before suspension');
  await expect(body(page)).toContainText('Restored page');
});

for(const change of ['route','identity','stored account','AAL']){
  test(`${change} change clears prior report and discards pending results`,async({page})=>{
    await start(page);await finish(page,'Old account report');
    await expect(body(page)).toContainText('Old account report');
    await page.locator('[data-recent-activity] button').click();
    await page.evaluate(change=>{
      if(change==='route')location.hash='#home';
      if(change==='identity')currentUser={id:'synthetic-admin-b'};
      if(change==='stored account')window.account='synthetic-admin-b';
      if(change==='AAL')window.aal='aal1';
      window.dispatchEvent(new Event('storage'));
    },change);
    await expect(status(page)).toContainText('Activity unavailable');
    expect(await page.evaluate(()=>reads[1].signal.aborted)).toBe(true);
    await finish(page,'Late old-account result',1);
    await expect(body(page)).toBeEmpty();
    await page.clock.runFor(300000);expect(await readCount(page)).toBe(2);
  });
}

test('account change without an event is checked before painting the response',async({page})=>{
  await start(page);
  await page.evaluate(()=>{currentUser={id:'synthetic-admin-b'};reads[0].resolve(response('Stale account'));});
  await expect(status(page)).toContainText('Activity unavailable');
  await expect(body(page)).toBeEmpty();
});

test('unmount cancels and releases old refresh; remount starts one new owned lifecycle',async({page})=>{
  await start(page);
  await page.evaluate(()=>{
    const host=document.querySelector('#host');
    host.replaceChildren();
    const section=document.createElement('section');section.dataset.adminSection='activity';host.append(section);
    mountVacancyAdminTools(host);mountVacancyAdminTools(host);
  });
  expect(await readCount(page)).toBe(2);
  expect(await page.evaluate(()=>reads[0].signal.aborted)).toBe(true);
  await finish(page,'Disconnected old response');
  await finish(page,'New mount result',1);
  await expect(body(page)).toContainText('New mount result');
  await page.clock.runFor(30000);expect(await readCount(page)).toBe(3);
});

test('detaching the panel alone cancels its observer-owned read and timer',async({page})=>{
  await start(page);
  await page.evaluate(()=>document.querySelector('#host').replaceChildren());
  await expect.poll(()=>page.evaluate(()=>reads[0].signal.aborted)).toBe(true);
  await finish(page,'Detached response');
  await page.clock.runFor(300000);expect(await readCount(page)).toBe(1);
});

test('timeout unblocks manual retry even when the backend ignores cancellation',async({page})=>{
  await start(page);
  await page.clock.runFor(15000);
  await expect(status(page)).toContainText('timed out');
  expect(await page.evaluate(()=>reads[0].signal.aborted)).toBe(true);
  await expect(page.locator('[data-recent-activity] button')).toBeEnabled();
  await page.locator('[data-recent-activity] button').click();
  await finish(page,'Successful retry',1);await finish(page,'Late timed-out read');
  await expect(body(page)).toContainText('Successful retry');
  await expect(body(page)).not.toContainText('Late timed-out read');
});

test('failures retain stale results and back off to five minutes; success restores 30 seconds',async({page})=>{
  await start(page);await finish(page,'Last known result');
  await page.locator('[data-recent-activity] button').click();
  for(const [index,delay] of [[1,60000],[2,120000],[3,240000],[4,300000],[5,300000]]){
    await page.evaluate(index=>reads[index].reject(Error('Synthetic unavailable response')),index);
    await expect(status(page)).toContainText('Previous results are stale');
    await expect(body(page)).toContainText('Last known result');
    await page.clock.runFor(delay-1);expect(await readCount(page)).toBe(index+1);
    await page.clock.runFor(1);expect(await readCount(page)).toBe(index+2);
  }
  await finish(page,'Recovered data',6);
  await expect(body(page)).toContainText('Recovered data');
  await page.clock.runFor(30000);expect(await readCount(page)).toBe(8);
});

test('missing measurements show unavailable, not a fabricated zero',async({page})=>{
  await start(page);
  await page.evaluate(()=>reads[0].resolve({...response('Incomplete'),browsers_recent:null}));
  await expect(status(page)).toContainText('Activity unavailable. Invalid activity response');
  await expect(body(page)).toBeEmpty();
});

test('actual backend activity method forwards cancellation to a fetch double',async({page})=>{
  await start(page,{hidden:true});
  await page.addScriptTag({content:fs.readFileSync(path.resolve(__dirname,'../app/src/backend.js'),'utf8')
    .replaceAll('https://xtutkwiivqkgkqjpkxvj.supabase.co','http://127.0.0.1:8776')
    .replace(/const KEY = '[^']*';/,"const KEY = 'synthetic-noncredential';")});
  // Use a local-only fetch double; inspect its native AbortSignal rather than
  // making any hosted API request or loading real Auth state.
  await page.evaluate(()=>{
    localStorage.clear();
    window.fetch=(url,options)=>{
      if(url!=='http://127.0.0.1:8776/rest/v1/rpc/admin_recent_activity')throw Error('Unexpected service');
      window.activityFetchSignal=options.signal;
      return new Promise((resolve,reject)=>options.signal.addEventListener('abort',
        ()=>reject(new DOMException('Synthetic network cancellation','AbortError')),{once:true}));
    };
    window.readAbort=new AbortController();
    window.activityOutcome='pending';
    VACANCY_BACKEND.recentActivity({signal:readAbort.signal})
      .then(()=>window.activityOutcome='unexpected success',error=>window.activityOutcome=error.name);
  });
  await expect.poll(()=>page.evaluate(()=>!!window.activityFetchSignal)).toBe(true);
  await page.evaluate(()=>readAbort.abort());
  await expect.poll(()=>page.evaluate(()=>activityOutcome)).toBe('AbortError');
  expect(await page.evaluate(()=>activityFetchSignal.aborted)).toBe(true);
});
