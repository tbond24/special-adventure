const {test,expect}=require('@playwright/test');
const base='http://127.0.0.1:8776';

async function ready(page){
 await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 await page.goto('/__admin-preview');await page.waitForFunction(()=>window.__visualReady);
}

test('System cards use decimal MB and ignore stale period results and errors',async({page})=>{
 await ready(page);await page.evaluate(()=>document.querySelector('[data-section="system"]').click());
 const health=page.locator('#operationalHealth'),period=health.getByLabel('Health period'),values=health.locator('.stat strong');
 await expect(values).toHaveCount(6);await expect(health.locator('.section-head p')).not.toContainText('Loading');
 await page.evaluate(()=>{VACANCY_BACKEND.adminOperationalHealth=async days=>days===30?new Promise(resolve=>window.__healthRelease=()=>resolve({email_delivered:30})):({email_sent:0,email_delivered:7,storage_bytes:144000000})});
 await period.selectOption('30');await page.waitForFunction(()=>!!window.__healthRelease);
 await period.selectOption('7');await expect(values).toHaveText(['7','0.0%','0.00%','0','144.0 MB','0']);
 await page.evaluate(()=>__healthRelease());await expect(values.first()).toHaveText('7');
 await page.evaluate(()=>{VACANCY_BACKEND.adminOperationalHealth=async days=>days===30?new Promise((_,reject)=>window.__healthReject=()=>reject(Error('Obsolete error'))):({email_delivered:8})});
 await period.selectOption('30');await page.waitForFunction(()=>!!window.__healthReject);await period.selectOption('7');await expect(values.first()).toHaveText('8');
 await page.evaluate(()=>__healthReject());await expect(values.first()).toHaveText('8');
 await page.evaluate(()=>{VACANCY_BACKEND.adminOperationalHealth=async()=>{throw Error('Synthetic offline')}});await period.selectOption('30');await expect(health.locator('.operational-health-grid')).toHaveText('Synthetic offline');
 await page.evaluate(()=>{VACANCY_BACKEND.adminOperationalHealth=async()=>({email_delivered:9});});await period.selectOption('7');await expect(values.first()).toHaveText('9');
});

test('card preferences disclose denied storage and recover when storage returns',async({page})=>{
 await page.addInitScript(()=>{window.__denyCardStorage=true;const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(window.__denyCardStorage&&k.startsWith('vacancy-overview-cards-v1:'))throw Error('Synthetic blocked storage');return set.call(this,k,v)}});
 await ready(page);const status=page.locator('[data-card-status]'),period=page.locator('[data-metric="visitors"] [data-card-period]');
 await expect(status).toContainText('Layout changes are temporary');await period.selectOption('7');await expect(period).toHaveValue('7');
 await page.locator('[data-overview-add-card]').click();await expect(status).toContainText('Layout changes are temporary');await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.evaluate(()=>{__denyCardStorage=false});await period.selectOption('30');await expect(status).not.toContainText('temporary');
 await page.reload();await page.waitForFunction(()=>window.__visualReady);await expect(period).toHaveValue('30');
});

test('all twelve metric cards keep readable titles and undistorted, separated axes',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-11-02T04:34:56Z'));
 await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/__admin-preview');await page.waitForFunction(()=>window.__visualReady);
 for(const metric of ['accounts','enquiries','messages','images']){
  await page.locator('[data-overview-add-card]').click();
  const dialog=page.getByRole('dialog',{name:'Add card',exact:true});
  await dialog.locator('[data-add-metric]').selectOption(metric);
  await dialog.getByRole('button',{name:'Add card',exact:true}).click();
  await expect(page.locator('[data-metric="'+metric+'"] [data-metric-value]')).not.toHaveText('—');
 }
 await expect(page.locator('.overview-metric-card')).toHaveCount(12);
 for(const theme of ['light','dark']){
  if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.console-theme-toggle').click();
  for(const width of [390,768,1024,1280,1440,1920]){
   await page.setViewportSize({width,height:1100});
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   await expect.poll(()=>page.evaluate(()=>{
    const issues=[],canvas=document.createElement('canvas').getContext('2d');
    const luminance=s=>(s.match(/[\d.]+/g)||[]).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0);
    for(const card of document.querySelectorAll('.overview-metric-card')){
     const id=card.dataset.metric,title=card.querySelector('[data-card-metric]'),css=getComputedStyle(title);
     canvas.font=css.font;
     const room=title.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight)-(css.appearance==='none'?0:16);
     if(canvas.measureText(title.selectedOptions[0].text).width>room+1)issues.push(id+': truncated title');
     const box=card.getBoundingClientRect();
     for(const control of card.querySelectorAll('select,summary,button')){
      if(!control.getClientRects().length)continue;
      const rect=control.getBoundingClientRect();
      if(rect.left<box.left-1||rect.right>box.right+1)issues.push(id+': overflowing control');
     }
     for(const text of card.querySelectorAll('.overview-count-chart text')){
      if(!text.getClientRects().length)continue;
      const m=text.getScreenCTM();
      if(!m||Math.abs(m.a-1)>0.001||Math.abs(m.d-1)>0.001)issues.push(id+': distorted axis');
      if(getComputedStyle(text).fontSize!=='12px')issues.push(id+': inconsistent axis size');
      const foreground=luminance(getComputedStyle(text).fill),background=luminance(getComputedStyle(card).backgroundColor);
      if((Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05)<4.5)issues.push(id+': low axis contrast');
     }
     const ticks=[...card.querySelectorAll('.axis-time:not([hidden])')];
     for(let i=1;i<ticks.length;i++)if(ticks[i-1].getBoundingClientRect().right+7>ticks[i].getBoundingClientRect().left)issues.push(id+': crowded ticks');
    }
    if(document.documentElement.scrollWidth>innerWidth+1)issues.push('page overflow');
    return issues;
   }),{message:theme+' '+width+'px'}).toEqual([]);
  }
 }
 // Date ranges and refreshed nodes must receive the same text fitting as Today.
 await page.locator('[data-metric="storage_used"] [data-card-period]').selectOption('7');
 await expect(page.locator('[data-metric="storage_used"] [data-fixed-x-axis]')).toHaveCount(2);
 await page.getByRole('button',{name:'Refresh data',exact:true}).click();
 await expect(page.locator('[data-refresh-label]')).toContainText('Last refreshed');
 const scales=await page.locator('.overview-count-chart text:visible').evaluateAll(ns=>ns.map(n=>{const m=n.getScreenCTM();return [m.a,m.d]}));
 expect(scales.every(([x,y])=>Math.abs(x-1)<.001&&Math.abs(y-1)<.001)).toBe(true);
 expect(errors).toEqual([]);
});
