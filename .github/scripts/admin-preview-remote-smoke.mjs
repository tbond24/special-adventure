// Exclusive synthetic online PREVIEW smoke. No Supabase Auth or customer data.
// Fails closed if the deployed CSP does not block all connections.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
const origins=[process.env.VACANCY_TEST_PREVIEW_A,process.env.VACANCY_TEST_PREVIEW_B];
const PRODUCTION='xtutkwiivqkgkqjpkxvj';
function ensureUrl(input) {
  assert(input&&/^https:\/\/vacancy-[a-z0-9]+-tbond24s-projects\.vercel\.app$/.test(input),'Only pinned isolated preview hostnames accepted');
  return input;
}
async function get(base,path) {
  const response=await fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(20000)});
  const body=await response.text();
  return {response,body};
}
const browser=await chromium.launch({headless:true});
await mkdir('work/preview-evidence',{recursive:true});
let count=0;
try {
  for (const [index,baseInput] of origins.entries()){
    const base=ensureUrl(baseInput);
    const root=await get(base,'/');
    assert.equal(root.response.status,200,base+' root HTTP 200');
    assert.match(root.response.headers.get('content-type')||'',/text\/html/);
    const csp=root.response.headers.get('content-security-policy')||'';
    assert.match(csp,/connect-src\s+'none'/i,'External connection CSP must deny all network calls');
    assert.match(csp,/form-action\s+'none'/i,'Browser form submissions must be denied');
    assert.match(root.response.headers.get('x-robots-tag')||'',/noindex/i,'Synthetic preview not indexed');
    assert.equal(root.response.headers.get('x-vacancy-preview-isolated'),'synthetic-offline-no-production-data');
    assert.match(root.body,/Isolated Synthetic Preview/);
    assert.match(root.body,/isolated-admin-visual-fixture\.js/);
    assert.doesNotMatch(root.body,/Uses Vacancy.s live accounts and database/);
    count++;console.log('PASS preview '+(index+1)+' real HTTPS headers, noindex and isolated HTML');

    const backend=await get(base,'/src/backend.js');
    assert.equal(backend.response.status,200);
    assert.ok(backend.body.includes('vacancy-offline-preview.invalid'));
    assert.ok(!backend.body.includes(PRODUCTION));
    assert.ok(!backend.body.includes('sb_publishable_w3Y'));
    const fixture=await get(base,'/src/isolated-admin-visual-fixture.js');
    assert.equal(fixture.response.status,200);
    assert.match(fixture.body,/window\.__designTest/);
    const api=await get(base,'/api/geocode');
    assert.equal(api.response.status,403,'Server API handlers must reject all requests');
    assert.match(api.body,/Isolated synthetic preview/);
    count++;console.log('PASS preview '+(index+1)+' no live database/key and server API returns 403');

    const ctx=await browser.newContext({viewport:{width:1536,height:1024},serviceWorkers:'block'});
    const blocked=[];
    await ctx.route('**/*',route=>{
      const url=route.request().url();
      if(url.startsWith(base+'/'))return route.continue();
      blocked.push(url.split('?')[0]);
      return route.abort('blockedbyclient');
    });
    const page=await ctx.newPage();
    await page.goto(base+'/#admin',{waitUntil:'domcontentloaded',timeout:25000});
    await page.waitForFunction(()=>window.__visualReady===true,undefined,{timeout:30000});
    await expect(page.locator('.visual-fixture-banner')).toContainText('SYNTHETIC DATA');
    await expect(page.locator('.design-board')).toBeVisible();
    await expect(page.locator('[data-design-tree]')).toContainText('Save listing');
    await expect(page.locator('[data-frame-status]')).toContainText('Actual public renderer');
    const frame=page.locator('[data-design-frame]');
    await expect(frame).toHaveAttribute('sandbox','');
    await expect(page.locator('.design-site-card')).toContainText('Unknown');
    count++;console.log('PASS preview '+(index+1)+' real browser shows synthetic three-pane editor');

    const radius=page.locator('[data-style-field=radius]');
    await radius.fill('21');
    await radius.press('Tab');
    await expect(page.locator('[data-save-draft]')).toBeEnabled();
    await page.locator('[data-save-draft]').click();
    await expect(page.locator('[data-review]')).toBeEnabled();
    await page.locator('[data-review]').click();
    await page.locator('[data-publish-reason]').fill('Synthetic in-memory preview only');
    await page.locator('[data-confirm-publish]').click();
    await expect(page.locator('[data-draft-status]')).toContainText('Published revision 1');
    const inMemory=await page.evaluate(()=>({
      revision:window.__designTest?.published?.revision,
      config:window.__designTest?.published?.config,
      writes:window.__designTest?.businessCount,
      telemetry:window.__designTest?.trackCount
    }));
    assert.equal(inMemory.revision,1);
    assert.equal(inMemory.config.all.radius,21);
    assert.equal(inMemory.writes,0,'No business writes');
    assert.equal(inMemory.telemetry,0,'No analytics tracking');
    assert.ok(blocked.every(x=>!x.includes(PRODUCTION)), 'No attempted live Supabase request');
    await page.screenshot({path:'work/preview-evidence/'+(index+1)+'-synthetic-admin.png',animations:'disabled'});
    count++;console.log('PASS preview '+(index+1)+' browser-only save/review simulation, no business/telemetry writes');
    await ctx.close();
  }
  console.log('ALL '+count+' REMOTE ISOLATED PREVIEW ACCEPTANCE CHECKS PASSED');
} catch(e) {
  console.error('PREVIEW SMOKE FAIL: '+String(e?.message||e).slice(0,750));
  process.exitCode=1;
} finally {await browser.close();}
