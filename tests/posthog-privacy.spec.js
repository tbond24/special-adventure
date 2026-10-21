const {test, expect} = require('@playwright/test');
const {readFileSync} = require('node:fs');
const {publicConfig} = require('../app/api/posthog-config.js');
const config = publicConfig({POSTHOG_ENABLED:'true',POSTHOG_PROJECT_TOKEN:'phc_synthetic_test_only',POSTHOG_HOST:'https://eu.i.posthog.com',VERCEL_ENV:'preview'});

async function harness(page, options={}) {
  const traffic=[];
  await page.route('**/*', async route=>{
    const request=route.request(), url=new URL(request.url());
    if (url.hostname !== '127.0.0.1') {
      traffic.push({url:request.url(),body:request.postData()});
      return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"status":1}'});
    }
    if (url.pathname==='/posthog-harness') return route.fulfill({contentType:'text/html',body:'<!doctype html><script src="/src/posthog-analytics.js"></script>'});
    if (url.pathname==='/api/posthog-config') {
      if(options.delayed) await options.delayed;
      return route.fulfill({status:options.failed?503:200,contentType:'application/json',body:JSON.stringify(config)});
    }
    return route.continue();
  });
  await page.goto('/posthog-harness?email=private@example.invalid#find');
  return traffic;
}

test('real SDK sends only the explicit sanitized smoke event after consent, and stops on withdrawal', async ({page,context})=>{
  const traffic=await harness(page);
  expect(await page.evaluate(()=>Boolean(window.posthog))).toBe(false);
  expect(traffic).toEqual([]);
  expect(await page.evaluate(()=>VACANCY_POSTHOG.setConsent(true))).toBe(true);
  // PostHog recognizes Playwright as a bot. Disable that filter only in this
  // intercepted harness to exercise serialization; product configuration keeps it.
  await page.evaluate(()=>posthog.set_config({opt_out_useragent_filter:true}));
  // Initialization must not emit automatic events or remote configuration calls.
  await page.waitForTimeout(150);
  expect(traffic).toEqual([]);
  expect(await page.evaluate(()=>VACANCY_POSTHOG.capture('search_used'))).toBe(false);
  expect(await page.evaluate(()=>VACANCY_POSTHOG.capture('vacancy_smoke_completed'))).toBe(true);
  await expect.poll(()=>traffic.length).toBe(1);
  const raw=traffic[0].body;
  const payload=raw.startsWith('data=')?JSON.parse(Buffer.from(new URLSearchParams(raw).get('data'),'base64').toString()):JSON.parse(raw);
  const event=payload.batch?.[0] || (Array.isArray(payload)?payload[0]:payload);
  expect(event.event).toBe('vacancy_smoke_completed');
  expect(Object.keys(event.properties).sort()).toEqual(['$geoip_disable','$process_person_profile','distinct_id','environment','source','token'].sort());
  expect(event.properties.distinct_id).toBeTruthy();
  expect(JSON.stringify(event)).not.toMatch(/private@example|posthog-harness|\$current_url|\$referrer|\$set/);
  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('ph_')&&!k.includes('opt_in_out')))).toEqual([]);
  await page.evaluate(()=>VACANCY_POSTHOG.setConsent(false));
  expect(await page.evaluate(()=>VACANCY_POSTHOG.capture('vacancy_smoke_completed'))).toBe(false);
  expect(await page.evaluate(()=>VACANCY_POSTHOG.setConsent(true))).toBe(true);
  expect(await page.evaluate(()=>VACANCY_POSTHOG.capture('vacancy_smoke_completed'))).toBe(true);
  await expect.poll(()=>traffic.length).toBe(2);
  await page.evaluate(()=>location.hash='admin');
  expect(await page.evaluate(()=>VACANCY_POSTHOG.capture('vacancy_smoke_completed'))).toBe(false);
  expect(traffic.every(r=>new URL(r.url).hostname==='eu.i.posthog.com')).toBe(true);
});

test('privacy signals and unavailable config fail closed without loading the SDK', async ({page})=>{
  const traffic=await harness(page,{failed:true});
  expect(await page.evaluate(()=>VACANCY_POSTHOG.setConsent(true))).toBe(false);
  await page.evaluate(()=>Object.defineProperty(navigator,'globalPrivacyControl',{value:true,configurable:true}));
  expect(await page.evaluate(()=>VACANCY_POSTHOG.setConsent(true))).toBe(false);
  expect(await page.evaluate(()=>Boolean(window.posthog))).toBe(false);
  expect(traffic).toEqual([]);
});

test('withdrawal during configuration loading prevents late initialization', async ({page})=>{
  let release; const delayed=new Promise(resolve=>release=resolve);
  const traffic=await harness(page,{delayed});
  await page.evaluate(()=>{window.enabling=VACANCY_POSTHOG.setConsent(true);});
  await page.evaluate(()=>VACANCY_POSTHOG.setConsent(false));
  release();
  expect(await page.evaluate(()=>window.enabling)).toBe(false);
  expect(await page.evaluate(()=>Boolean(window.posthog))).toBe(false);
  expect(traffic).toEqual([]);
});

test('vendored SDK is the exact installed no-external bundle',()=>{
  expect(readFileSync('app/vendor/posthog/posthog.js').equals(readFileSync('node_modules/posthog-js/dist/array.no-external.js'))).toBe(true);
});

test('local connection page requires consent and one deliberate Send, then withdraws',async({page})=>{
  const {createPosthogTestServer}=await import('../scripts/posthog-test-server.mjs');
  const server=createPosthogTestServer({...config,projectId:'123'});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const traffic=[];
  try {
    await page.route('https://eu.i.posthog.com/**',route=>{
      traffic.push(route.request().url());
      return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"status":1}'});
    });
    await page.goto(base);
    await expect(page.locator('[role=status]')).toHaveText('Test analytics is off. No event sent.');
    await expect(page.getByRole('button',{name:'Send one test event',exact:true})).toBeDisabled();
    expect(await page.evaluate(()=>Boolean(window.posthog))).toBe(false);
    await page.getByRole('button',{name:'Allow optional test analytics',exact:true}).click();
    await expect(page.getByRole('button',{name:'Send one test event',exact:true})).toBeEnabled();
    expect(traffic).toEqual([]);
    // Intercepted automation only. Real local page retains the normal bot filter.
    await page.evaluate(()=>posthog.set_config({opt_out_useragent_filter:true}));
    await page.getByRole('button',{name:'Send one test event',exact:true}).click();
    await expect.poll(()=>traffic.length).toBe(1);
    await expect(page.getByRole('button',{name:'Send one test event',exact:true})).toBeDisabled();
    await page.getByRole('button',{name:'Turn off test analytics',exact:true}).click();
    expect(await page.evaluate(()=>VACANCY_POSTHOG.capture('vacancy_smoke_completed'))).toBe(false);
    expect(traffic).toHaveLength(1);
  } finally {await page.close();await new Promise(resolve=>server.close(resolve));}
});
