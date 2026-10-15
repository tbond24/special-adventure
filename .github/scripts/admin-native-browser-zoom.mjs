// Browser-level zoom probe on isolated synthetic Vercel preview.
// This is not CSS zoom, a resized CSS viewport, or a device emulation override.
// If headed Chromium cannot apply its native zoom via keyboard, FAIL honestly.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';

const origin='https://vacancy-jopsp1vt1-tbond24s-projects.vercel.app';
let browser;
try {
  browser=await chromium.launch({
    headless:false,
    args:['--window-size=1536,1024','--no-first-run','--no-default-browser-check']
  });
  const ctx=await browser.newContext({viewport:null,serviceWorkers:'block'});
  const external=[];
  await ctx.route('**/*',route=>{
    const uri=new URL(route.request().url());
    if(uri.origin===origin)return route.continue();
    external.push(uri.origin);return route.abort('blockedbyclient');
  });
  const page=await ctx.newPage();
  await page.goto(origin+'/#admin',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.__visualReady===true,undefined,{timeout:30000});
  await expect(page.locator('.design-board')).toBeVisible();

  const measure=()=>page.evaluate(()=>({
    cssViewport:window.innerWidth,
    visualViewport:window.visualViewport?.width,
    dpr:window.devicePixelRatio,
    screenWidth:window.screen.width,
    visibleInspector:!!document.querySelector('.design-inspector')?.getBoundingClientRect().width,
    overflow:document.documentElement.scrollWidth-innerWidth
  }));
  const before=await measure();
  console.log('INITIAL '+JSON.stringify(before));
  let current=before;
  let zoomSequence=[];
  for(let i=0;i<9;i++){
    await page.keyboard.press('Control+Equal');
    current=await measure();
    const scale=before.cssViewport/current.cssViewport;
    zoomSequence.push({iteration:i+1,scale:Number(scale.toFixed(3)),dpr:current.dpr,cssViewport:current.cssViewport});
    if(scale>=1.87)break;
  }
  // Some keyboard layouts route the shortcut as Control+Shift+Equal.
  if(before.cssViewport/current.cssViewport<1.87){
    for(let i=0;i<4;i++){
      await page.keyboard.press('Control+Shift+Equal');
      current=await measure();
      const scale=before.cssViewport/current.cssViewport;
      zoomSequence.push({shiftIteration:i+1,scale:Number(scale.toFixed(3)),dpr:current.dpr,cssViewport:current.cssViewport});
      if(scale>=1.87)break;
    }
  }
  console.log('ZOOM_STEPS '+JSON.stringify(zoomSequence));
  const observedScale=before.cssViewport/current.cssViewport;
  assert.ok(observedScale>=1.87&&observedScale<=2.2,
    'Native 200% browser zoom could not be established via headed Chrome shortcut; measured scale '+observedScale.toFixed(3));
  assert.ok(current.dpr>before.dpr*1.5,
    'Browser DPR did not change with native zoom: initial '+before.dpr+', after '+current.dpr);

  await expect(page.locator('.design-browser')).toBeVisible();
  await expect(page.locator('.design-inspector')).toBeVisible();
  await page.locator('[data-edit-scope]').selectOption('desktop');
  const radius=page.locator('[data-style-field=radius]');
  await radius.fill('23');
  await radius.press('Tab');
  await page.locator('[data-save-draft]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-save-draft]')).toBeEnabled();
  current=await measure();
  assert.ok(current.overflow<=2,'True browser zoom caused page-wide horizontal overflow '+current.overflow);
  assert.equal(external.filter(x=>x.includes('supabase')).length,0,'External Supabase request attempted');
  await mkdir('work/zoom-evidence',{recursive:true});
  await page.screenshot({path:'work/zoom-evidence/native-chromium-zoom.png',animations:'disabled'});
  console.log('PASS TRUE BROWSER ZOOM: source CSS viewport '+before.cssViewport+
    ', zoomed viewport '+current.cssViewport+', source DPR '+before.dpr+
    ', zoomed DPR '+current.dpr+', scale '+observedScale.toFixed(3)+
    ', editable Save control visible, zero horizontal overflow');
  await ctx.close();
}catch(e){
  console.error('NATIVE ZOOM PROBE UNVERIFIED/FAIL: '+String(e.message||e).slice(0,950));
  process.exitCode=1;
}finally{await browser?.close();}
