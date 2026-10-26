const {test,expect}=require('@playwright/test');
const base='http://127.0.0.1:8776';
test.beforeEach(async({page})=>{
 await page.clock.install();
 await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 await page.goto('/__admin-preview');await page.waitForFunction(()=>window.__visualReady);
});
const active=page=>page.locator('.overview-metric-card[data-metric=active_now]');
async function section(page,name){const menu=page.getByRole('button',{name:'Open admin navigation',exact:true});if(await menu.isVisible()){await menu.click();await page.clock.runFor(400)}await page.getByRole('button',{name,exact:true}).click()}
test('active card refreshes independently and expires unavailable snapshots',async({page})=>{
 await expect(active(page).locator('[data-metric-value]')).toHaveText('1');
 await page.evaluate(()=>{
  window.__otherReads=0;const series=VACANCY_BACKEND.adminCardSeries;
  VACANCY_BACKEND.adminCardSeries=(...args)=>{__otherReads++;return series(...args)};
  window.__live=0;window.__offline=false;
  VACANCY_BACKEND.adminVisitorPresence=async()=>{
   if(__offline)return new Promise(()=>{});
   return {generatedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+10000).toISOString(),total:__live,nodes:__live?[{id:'find',count:__live}]:[]};
  };
 });
 await page.clock.runFor(9500);await expect(active(page).locator('[data-metric-value]')).toHaveText('0');
 expect(await page.evaluate(()=>__otherReads)).toBe(0);
 await page.evaluate(()=>{__live=3});await page.clock.runFor(9500);
 await expect(active(page).locator('[data-metric-value]')).toHaveText('3');
 await page.evaluate(()=>{__offline=true});await page.clock.runFor(11000);
 await expect(active(page).locator('[data-metric-value]')).toHaveText('—');
 await page.evaluate(()=>{__offline=false;__live=2});await page.clock.runFor(16000);
 await expect(active(page).locator('[data-metric-value]')).toHaveText('2');
});
test('presence reads pause outside Overview and stop with the admin session',async({page})=>{
 await page.evaluate(()=>{window.__presenceReads=0;const read=VACANCY_BACKEND.adminVisitorPresence;VACANCY_BACKEND.adminVisitorPresence=(...args)=>{__presenceReads++;return read(...args)}});
 await section(page,'Activity');
 await page.clock.runFor(30000);expect(await page.evaluate(()=>__presenceReads)).toBe(0);
 await section(page,'Overview');
 await page.clock.runFor(1000);await expect(active(page).locator('[data-metric-value]')).toHaveText('1');
 await page.evaluate(()=>{currentUser=null;dispatchEvent(new Event('storage'));__presenceReads=0});
 await page.clock.runFor(30000);expect(await page.evaluate(()=>__presenceReads)).toBe(0);
 await expect(active(page)).toHaveCount(0);
});

test('a slow historical report cannot hold back the live card',async({page})=>{
 await page.evaluate(()=>{
  window.__live=4;
  VACANCY_BACKEND.adminVisitorPresence=async()=>({generatedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+10000).toISOString(),total:__live,nodes:[{id:'find',count:__live}]});
  VACANCY_BACKEND.adminCardSeries=()=>new Promise(()=>{});
 });
 await page.getByRole('button',{name:'Refresh data',exact:true}).click();
 await expect(active(page).locator('[data-metric-value]')).toHaveText('4');
 await expect(page.locator('[data-refresh-label]')).toHaveText('Refreshing…');
 await page.evaluate(()=>{__live=2});await page.clock.runFor(9500);
 await expect(active(page).locator('[data-metric-value]')).toHaveText('2');
 await expect(page.locator('[data-refresh-label]')).toHaveText('Refreshing…');
});
