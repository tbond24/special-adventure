const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const APP='http://127.0.0.1:8765';
const artifacts=process.env.VACANCY_MARKETING_ARTIFACTS?path.resolve(process.env.VACANCY_MARKETING_ARTIFACTS):path.resolve(__dirname,'../../marketing-checkpoint-artifacts');
test.use({timezoneId:'Australia/Perth'});

async function openAdmin(page,{events=1000,publications=8,baseline=false,member=true,aal='aal2',compressed=false}={}) {
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin!==APP) return route.fulfill({status:200,contentType:'application/json',body:url.pathname.includes('/rpc/')?'{}':'[]'});
    if(baseline&&url.pathname==='/src/admin-lister-marketing.js') return route.fulfill({response:await route.fetch({url:APP+'/__baseline-marketing.js'})});
    if(baseline&&url.pathname==='/styles.css') return route.fulfill({response:await route.fetch({url:APP+'/__baseline-styles.css'})});
    return route.continue();
  });
  await page.goto(APP+'/#home');
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(async options=>{
    history.replaceState(null,'','#admin');route=parseHash();
    currentUser={id:'test-admin',email:'test-admin@example.invalid'};
    VACANCY_BACKEND.adminMembership=async()=>options.member;
    VACANCY_BACKEND.assuranceLevel=()=>options.aal;
    VACANCY_BACKEND.adminDashboard=async()=>({open_reports:0,oldest_report_hours:0,active_listings:0,users_total:0,properties:0,units:0,enquiries_7d:0,listings_7d:0,errors_24h:0});
    VACANCY_BACKEND.adminSearch=async()=>({users:[],listings:[]});
    VACANCY_BACKEND.adminReports=async()=>[];
    VACANCY_BACKEND.adminAuditLog=async()=>[];
    VACANCY_BACKEND.adminDailyMetrics=async()=>({total:0,days:7,series:[]});
    VACANCY_BACKEND.adminOperationalHealth=async()=>({});
    VACANCY_BACKEND.adminIconRevisions=async()=>[];
    window.__reportCalls=[];window.__reportSize=options.events;window.__pubSize=options.publications;window.__measurements=[];
    VACANCY_BACKEND.adminListerMarketing=async(from,to)=>{
      window.__reportCalls.push({from,to});
      if(window.__failReport)throw Error('Synthetic report failure');
      if(window.__fixtureReport)return window.__fixtureReport;
      const start=performance.now();
      const response=await fetch(`/__marketing_report?events=${window.__reportSize}&publications=${window.__pubSize}${options.compressed?'&gzip=1&representative=1':''}`);
      const text=await response.text(),data=JSON.parse(text);
      window.__measurements.push({requestMs:performance.now()-start,bytes:new TextEncoder().encode(text).length,receivedAt:performance.now()});
      return data;
    };
    await renderAdmin();
  },{events,publications,member,aal,compressed});
  if(member&&aal==='aal2') {
    if(await page.locator('.admin-section-select').isVisible())await page.locator('.admin-section-select').selectOption('marketing');
    else {if(await page.locator('.console-menu-toggle').isVisible())await page.locator('.console-menu-toggle').click();await page.locator('#adminSectionMenu [data-section=marketing]').click();}
    const legacy=page.getByText('Earlier activity, publication totals & session diagnostics',{exact:true});if(await legacy.count())await legacy.click();
    await expect(page.locator('.admin-marketing')).toBeVisible();
    await expect(page.locator('[data-marketing-results]')).not.toHaveText('Loading recorded activity…');
    await expect(page.locator('[data-marketing-results]')).not.toHaveText('Loading lister results…');
  }
}

test('complete report, date-only publications, safe details, and development screenshots',async({page},info)=>{
  await openAdmin(page);
  await expect(page.locator('.admin-marketing-cards .stat').first()).toContainText('1,000');
  await page.locator('[data-marketing-source]').selectOption('Google');
  await expect(page.locator('.admin-marketing-cards .stat').first()).toContainText('500');
  await expect(page.locator('.admin-marketing-publications')).toContainText('8');
  await page.locator('[data-marketing-source]').selectOption('');
  await expect(page.locator('.admin-marketing')).not.toContainText('Visitor publish rate');
  await expect(page.locator('.admin-marketing')).not.toContainText('Not yet progressed');
  await page.evaluate(()=>{
    const banner=document.createElement('p');banner.textContent='DEVELOPMENT / SYNTHETIC TEST DATA — not live Vacancy results';
    banner.style.cssText='padding:12px;background:#173b7a;color:white;border-radius:8px;font-weight:600';
    document.querySelector('.admin-marketing').prepend(banner);
  });
  fs.mkdirSync(artifacts,{recursive:true});
  await page.screenshot({path:path.join(artifacts,`${info.project.name}.png`),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.admin-marketing-timeline summary').click();
  await expect(page.locator('[data-journey-timeline]')).not.toContainText('test-session-');
  await page.evaluate(()=>{window.__fixtureReport={generated_at:new Date().toISOString(),events:[{id:'evil',event_name:'journey_error',visitor_id:'hidden-browser',session_id:'hidden-session',source:'<img src=x onerror=window.__xss=1>',error_code:'<script>window.__xss=1</script>',step:'<svg onload=window.__xss=1>',created_at:new Date().toISOString()}],publications:[]};});
  await page.locator('[data-marketing-period]').selectOption('30');
  await page.locator('.admin-marketing-diagnostics summary').click();
  await expect(page.locator('.admin-marketing script,.admin-marketing img,.admin-marketing svg')).toHaveCount(0);
  expect(await page.evaluate(()=>window.__xss)).toBeUndefined();
});

test('independent limits are checked before filters and suppress affected results',async({page})=>{
  await openAdmin(page,{events:5001,publications:2});
  await expect(page.locator('[data-marketing-source]')).toBeDisabled();
  await expect(page.locator('[data-marketing-source] option')).toHaveCount(1);
  await expect(page.locator('.admin-marketing-cards,.admin-marketing-timeline,.admin-marketing-diagnostics')).toHaveCount(0);
  await expect(page.locator('.admin-marketing-publications')).toContainText('2');
  await page.evaluate(()=>{window.__reportSize=5000;window.__pubSize=5001;});
  await page.locator('[data-marketing-period]').selectOption('30');
  await expect(page.locator('.admin-marketing-cards')).toContainText('5,000');
  await expect(page.locator('[data-marketing-source]')).toBeEnabled();
  await expect(page.locator('.admin-marketing-publications')).toHaveCount(0);
  await expect(page.locator('.admin-marketing')).toContainText('Publications reached their independent report limit');
});

test('UTC half-open range, publication response deduplication, empty and refresh failure',async({page})=>{
  await openAdmin(page,{events:10});
  await page.locator('[data-marketing-period]').selectOption('custom');
  await expect(page.locator('.admin-marketing-cards')).toHaveCount(0);
  await page.locator('[data-marketing-from]').fill('2026-10-04');
  await page.locator('[data-marketing-to]').fill('2026-10-05');
  await expect.poll(()=>page.evaluate(()=>window.__reportCalls.at(-1))).toEqual({from:'2026-10-04T00:00:00.000Z',to:'2026-10-06T00:00:00.000Z'});
  await page.evaluate(()=>{window.__fixtureReport={generated_at:new Date().toISOString(),events:[],publications:['one','one','two'].map(vacancy_id=>({vacancy_id,created_at:new Date().toISOString()}))};});
  await page.locator('[data-marketing-period]').selectOption('7');
  await expect(page.locator('.admin-marketing-cards .stat').first()).toContainText('0');
  await expect(page.locator('.admin-marketing-publications .stat strong')).toHaveText('2');
  await page.evaluate(()=>window.__failReport=true);
  await page.locator('[data-marketing-period]').selectOption('30');
  await expect(page.locator('.admin-marketing [role=alert]')).toContainText('Synthetic report failure');
  await expect(page.locator('.admin-marketing-cards,.admin-marketing-publications')).toHaveCount(0);
  await expect(page.locator('[data-marketing-source]')).toBeDisabled();
  await expect(page.locator('[data-marketing-time]')).toHaveText('Report not loaded. Times use UTC.');
  await page.evaluate(()=>window.__failReport=false);
  await page.locator('[data-marketing-retry]').click();
  await expect(page.locator('.admin-marketing-publications .stat strong')).toHaveText('2');
});

test('publication card counts listings independently of shared properties and first-property flags',async({page})=>{
  await openAdmin(page,{events:0});
  await page.evaluate(()=>{
    const publications=Array.from({length:6},(_,i)=>({vacancy_id:`identity-${i}`,property_id:i<3?'shared-one':i<5?'shared-two':'third',is_first_property_publication:i<2||i===5,created_at:new Date().toISOString()}));
    window.__fixtureReport={generated_at:new Date().toISOString(),events:[],publications:[...publications,publications[0]]};
  });
  await page.locator('[data-marketing-period]').selectOption('7');
  await expect(page.locator('.admin-marketing-publications .stat strong')).toHaveText('6');
});

test('existing UI gate blocks non-admin and AAL1 access without a reporting call',async({page})=>{
  await openAdmin(page,{member:false});
  await expect(page.locator('.admin-marketing')).toHaveCount(0);
  expect(await page.evaluate(()=>window.__reportCalls.length)).toBe(0);
  await page.evaluate(async()=>{VACANCY_BACKEND.adminMembership=async()=>true;VACANCY_BACKEND.assuranceLevel=()=> 'aal1';await renderAdmin();});
  await expect(page.locator('.admin-security-gate')).toBeVisible();
  await expect(page.locator('.admin-marketing')).toHaveCount(0);
  expect(await page.evaluate(()=>window.__reportCalls.length)).toBe(0);
  await page.evaluate(async()=>{currentUser=null;await renderAdmin();});
  await expect(page.locator('.admin-marketing')).toHaveCount(0);
  expect(await page.evaluate(()=>window.__reportCalls.length)).toBe(0);
});

test('invalid datasets fail independently; keyboard details and newer refresh win',async({page})=>{
  await openAdmin(page,{events:20,publications:2});
  const summary=page.locator('.admin-marketing-definitions summary');
  await summary.focus();await page.keyboard.press('Enter');
  await expect(page.locator('.admin-marketing-definitions')).toHaveAttribute('open','');
  await page.evaluate(()=>window.__fixtureReport={generated_at:new Date().toISOString(),events:[],publications:[{}]});
  await page.locator('[data-marketing-period]').selectOption('30');
  await expect(page.locator('.admin-marketing-cards')).toBeVisible();
  await expect(page.locator('.admin-marketing-publications')).toHaveCount(0);
  await expect(page.locator('.admin-marketing')).toContainText('Publication data could not be validated');
  await page.evaluate(()=>window.__fixtureReport={generated_at:new Date().toISOString(),events:[{}],publications:[]});
  await page.locator('[data-marketing-period]').selectOption('7');
  await expect(page.locator('.admin-marketing-cards')).toHaveCount(0);
  await expect(page.locator('[data-marketing-source]')).toBeDisabled();
  await expect(page.locator('.admin-marketing-publications strong')).toHaveText('0');
  await page.evaluate(()=>window.__fixtureReport={generated_at:new Date().toISOString(),publications:[]});
  await page.locator('[data-marketing-period]').selectOption('30');
  await expect(page.locator('.admin-marketing-publications strong')).toHaveText('0');
  await expect(page.locator('.admin-marketing-cards')).toHaveCount(0);
  await page.evaluate(()=>window.__fixtureReport={generated_at:new Date().toISOString(),events:[]});
  await page.locator('[data-marketing-period]').selectOption('7');
  await expect(page.locator('.admin-marketing-cards')).toBeVisible();
  await expect(page.locator('.admin-marketing-publications')).toHaveCount(0);
  await page.evaluate(()=>{
    let call=0;window.__settled=0;
    VACANCY_BACKEND.adminListerMarketing=async()=>{
      const n=++call;await new Promise(resolve=>setTimeout(resolve,n===1?180:10));window.__settled++;
      return {generated_at:new Date().toISOString(),events:Array.from({length:n},(_,i)=>({id:i,event_name:'lister_session_started',created_at:new Date().toISOString()})),publications:[]};
    };
  });
  await page.locator('[data-marketing-period]').selectOption('30');
  await page.locator('[data-marketing-period]').selectOption('7');
  await page.waitForFunction(()=>window.__settled===2);
  await expect(page.locator('.admin-marketing-cards .stat strong').first()).toHaveText('2');
});

test('limited local performance comparison at 1000 and 5000 events',async({page},info)=>{
  test.setTimeout(180000);
  const output=[];
  for(const baseline of [true,false])for(const events of [1000,5000]) {
    await page.unroute('**/*');
    await openAdmin(page,{events,baseline});
    const samples=[];
    for(let i=0;i<20;i++) {
      const before=await page.evaluate(()=>window.__measurements.length);
      await page.locator('[data-marketing-period]').selectOption(i%2?'7':'30');
      await page.waitForFunction(n=>window.__measurements.length>n,before);
      const measurement=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
        const item=window.__measurements.at(-1),select=document.querySelector('[data-marketing-source]'),start=performance.now();
        const renderMs=start-item.receivedAt;select.value='Google';select.dispatchEvent(new Event('change'));document.querySelector('.admin-marketing').getBoundingClientRect();
        resolve({...item,renderMs,filterMs:performance.now()-start});
      }))));
      samples.push(measurement);
    }
    output.push({baseline,events,samples});
  }
  fs.mkdirSync(artifacts,{recursive:true});
  fs.writeFileSync(path.join(artifacts,`performance-${info.project.name}.json`),JSON.stringify(output,null,2));
  const changed=output.filter(row=>!row.baseline);
  for(const row of changed)expect(Math.max(...row.samples.map(sample=>sample.filterMs))).toBeLessThan(100);
});

test('compressed report under stated throttling',async({page},info)=>{
  test.setTimeout(180000);
  const cdp=await page.context().newCDPSession(page),output=[];
  await cdp.send('Network.enable');
  for(const baseline of [true,false])for(const [events,publications] of [[1000,8],[5000,8],[5000,5000]]) {
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
    await page.unroute('**/*');await openAdmin(page,{events,publications,baseline,compressed:true});
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1600000/8,uploadThroughput:750000/8});
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    const samples=[];
    for(let i=0;i<3;i++) {
      await page.evaluate(()=>{performance.clearResourceTimings();window.__loadStart=performance.now()});
      const before=await page.evaluate(()=>window.__measurements.length);
      await page.locator('[data-marketing-period]').selectOption(i%2?'7':'30');
      await page.waitForFunction(n=>window.__measurements.length>n,before);
      const sample=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
        const r=performance.getEntriesByType('resource').filter(r=>r.name.includes('/__marketing_report')).at(-1);
        resolve({endToEndMs:performance.now()-window.__loadStart,...window.__measurements.at(-1),encodedBodyBytes:r.encodedBodySize,decodedBodyBytes:r.decodedBodySize,transferBytes:r.transferSize,resourceMs:r.duration});
      }))));
      expect(sample.encodedBodyBytes).toBeGreaterThan(0);
      expect(sample.encodedBodyBytes).toBeLessThan(sample.decodedBodyBytes);
      expect(sample.decodedBodyBytes).toBe(sample.bytes);
      samples.push(sample);
    }
    output.push({baseline,events,publications,samples});
  }
  fs.mkdirSync(artifacts,{recursive:true});
  fs.writeFileSync(path.join(artifacts,`throttled-${info.project.name}.json`),JSON.stringify({conditions:{downloadMbps:1.6,uploadMbps:0.75,latencyMs:150,cpuSlowdown:4,compression:'gzip',samplesPerCase:3},output},null,2));
});

test('ordinary mobile viewport controls remain operable above fixed navigation',async({page},info)=>{
  test.skip(!info.project.name.includes('mobile'));
  await openAdmin(page,{events:1000});
  await page.evaluate(()=>{
    const label=document.createElement('div');label.textContent='DEVELOPMENT / SYNTHETIC DATA';
    label.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99999;background:#193b76;color:white;font:11px system-ui;text-align:center;pointer-events:none';document.body.append(label);
  });
  const observations=[];
  async function checkControl(selector,name) {
    const control=page.locator(selector);
    await control.evaluate(el=>el.scrollIntoView({block:'center'}));await control.focus();
    const state=await control.evaluate(el=>{const r=el.getBoundingClientRect(),nav=document.querySelector('.mobile-nav').getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {focused:document.activeElement===el,unobscured:el===hit||el.contains(hit),top:r.top,bottom:r.bottom,navTop:nav.height?nav.top:innerHeight,viewport:innerHeight}});
    expect(state.focused).toBe(true);expect(state.unobscured).toBe(true);expect(state.bottom).toBeLessThanOrEqual(state.navTop);
    observations.push({name,...state});
  }
  fs.mkdirSync(artifacts,{recursive:true});
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(artifacts,'mobile-top.png'),fullPage:false});
  await checkControl('[data-marketing-source]','source keyboard focus');
  await page.keyboard.press('Tab');await expect(page.locator('[data-marketing-campaign]')).toBeFocused();
  await page.screenshot({path:path.join(artifacts,'mobile-keyboard-focus.png'),fullPage:false});
  // Ordinary Tab navigation, without scrollIntoView, must also avoid covered controls.
  const keyboard=[];
  for(let i=0;i<9;i++) {
    await page.keyboard.press('Tab');
    keyboard.push(await page.evaluate(()=>{const el=document.activeElement,r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {tag:el.tagName,text:(el.textContent||'').slice(0,60),unobscured:el===hit||el.contains(hit),inMarketing:!!el.closest('.admin-marketing')}}));
  }
  fs.writeFileSync(path.join(artifacts,'mobile-natural-keyboard.json'),JSON.stringify(keyboard,null,2));
  for(const state of keyboard.filter(row=>row.inMarketing))expect(state.unobscured,JSON.stringify(state)).toBe(true);
  await checkControl('.admin-marketing-diagnostics summary','diagnostics');await page.keyboard.press('Enter');
  await expect(page.locator('.admin-marketing-diagnostics')).toHaveAttribute('open','');
  await page.locator('.admin-marketing-diagnostics').evaluate(el=>el.scrollIntoView({block:'start'}));
  await page.screenshot({path:path.join(artifacts,'mobile-middle-diagnostics.png'),fullPage:false});
  await checkControl('.admin-marketing-timeline summary','timeline');await page.keyboard.press('Enter');
  await checkControl('[data-journey-session]','session picker');
  await page.locator('[data-journey-session]').selectOption('1');
  await expect(page.locator('[data-journey-timeline] li').first()).toBeVisible();
  await checkControl('.admin-marketing-definitions summary','definitions');await page.keyboard.press('Enter');
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  const last=await page.locator('.admin-marketing-definitions p').last().evaluate(el=>({bottom:el.getBoundingClientRect().bottom,navTop:document.querySelector('.mobile-nav').getBoundingClientRect().height?document.querySelector('.mobile-nav').getBoundingClientRect().top:innerHeight}));
  expect(last.bottom).toBeLessThanOrEqual(last.navTop);
  await page.screenshot({path:path.join(artifacts,'mobile-bottom.png'),fullPage:false});
  fs.writeFileSync(path.join(artifacts,'mobile-control-observations.json'),JSON.stringify({observations,last},null,2));
});
