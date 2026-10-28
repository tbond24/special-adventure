const {test,expect}=require('@playwright/test');
const base='http://127.0.0.1:8776';const refresh=page=>page.evaluate(()=>VACANCY_OVERVIEW_CARDS.mount(document.querySelector('.overview-metric-row')).refresh());
test('message cards distinguish first contacts and all messages with two sender lines',async({page})=>{
 await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());await page.goto(base+'/__admin-preview');await page.waitForFunction(()=>window.__visualReady);
 await page.evaluate(()=>{VACANCY_BACKEND.adminCardSeries=async(metric,b)=>({metric,series:b.map((p,i)=>({at:p.end,value:metric==='messages'?5:2,registered:metric==='messages'?3:1,nonRegistered:metric==='messages'?2:1,unknown:0}))})});
 const card=page.locator('.overview-metric-card').first();await card.locator('[data-card-metric]').selectOption('enquiries');await card.locator('[data-card-period]').selectOption('today');
 await expect(card.locator('[data-card-metric] option:checked')).toHaveText('New Messages sent');await expect(card.locator('[data-chart-series="Registered"]')).toHaveCount(1);await expect(card.locator('[data-chart-series="Non-registered"]')).toHaveCount(1);
 await expect(card).toContainText('non-registered');await expect(page.locator('.overview-activity-graph')).toContainText('New Messages sent');
 await card.locator('[data-card-metric]').selectOption('messages');await expect(card.locator('[data-card-metric] option:checked')).toHaveText('Total messages sent');await expect(card.locator('[data-chart-series]')).toHaveCount(2);
 const value=Number(await card.locator('[data-metric-value]').textContent());expect(value).toBeGreaterThan(0);
 await page.evaluate(()=>{VACANCY_BACKEND.adminCardSeries=async(metric,b)=>({metric,series:b.map(p=>({at:p.end,value:5,registered:3,nonRegistered:1,unknown:0}))})});await refresh(page);await expect(card).toContainText('Breakdown unavailable');await expect(card.locator('[data-chart-series]')).toHaveCount(0);await expect(card.locator('[data-metric-value]')).not.toHaveText('—');
 await page.evaluate(()=>{VACANCY_BACKEND.adminCardSeries=async(metric,b)=>({metric,series:b.map(p=>({at:p.end,value:5,registered:3,nonRegistered:1,unknown:1}))})});await refresh(page);await expect(card).toContainText('status unavailable');await expect(card.locator('[data-chart-series]')).toHaveCount(2);
});
