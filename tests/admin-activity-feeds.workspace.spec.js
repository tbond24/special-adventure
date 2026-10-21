const {test,expect}=require('@playwright/test');
test.beforeEach(async({page},info)=>{test.skip(info.project.name!=='desktop-chromium','Desktop feeds');await page.setViewportSize({width:1440,height:1000});await page.goto('/__admin-preview');await page.waitForFunction(()=>window.__visualReady);});
test('complete feeds follow the map, group events and filter code/registrations with location',async({page})=>{
 const host=page.locator('.overview-activity-feeds');await host.scrollIntoViewIfNeeded();await expect(host).toBeVisible();expect(await host.evaluate(n=>n.previousElementSibling.matches('.overview-journey-map'))).toBe(true);
 await expect(host.locator('[data-feed-body="0"]')).toContainText('Admin interface released');await expect(host.locator('[data-feed-body="1"]')).toContainText('Nairobi, Kenya');await expect(host.locator('[data-feed-body="1"]')).toContainText('×5');
 await host.locator('[data-feed-filter="0"]').selectOption('code');await expect(host.locator('[data-feed-body="0"] details')).toHaveCount(1);
 await host.locator('[data-feed-filter="1"]').selectOption('registrations');await expect(host.locator('[data-feed-body="1"] details')).toHaveCount(1);await host.locator('[data-feed-body="0"] summary').click();await expect(host.locator('[data-feed-body="0"]')).toContainText('Commit aaaaaaaaaaaa');
 for(const width of [1280,1440,1920]){await page.setViewportSize({width,height:1000});const boxes=await host.locator('section').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().width));expect(Math.abs(boxes[0]-boxes[1])).toBeLessThan(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false)}
});
test('pause/resume, missing locations, escaping, failures and account-loss cleanup',async({page})=>{
 const host=page.locator('.overview-activity-feeds');await host.scrollIntoViewIfNeeded();await expect(host.locator('[data-feed-body="1"]')).toContainText('Contact clicked');await host.getByRole('button',{name:'Pause visitor activity',exact:true}).click();await expect(host.locator('[data-feed-stamp="1"]')).toHaveText('Paused');
 await page.evaluate(()=>VACANCY_BACKEND.adminActivityFeed=async kind=>({schemaVersion:1,kind,generatedAt:new Date().toISOString(),rows:[{id:'safe',category:'registrations',section:'Account',title:'<img src=x onerror=alert(1)>',count:1,at:new Date().toISOString(),city:null,country:null}]}));
 await host.getByRole('button',{name:'Resume visitor activity',exact:true}).click();await expect(host.locator('[data-feed-body="1"]')).toContainText('Location unavailable');await expect(host.locator('img')).toHaveCount(0);
 await page.evaluate(()=>VACANCY_BACKEND.adminActivityFeed=async()=>{throw Error('Denied')});await host.getByRole('button',{name:'Refresh visitor activity',exact:true}).click();await expect(host.locator('[data-feed-body="1"]')).toContainText('Connection unavailable');
 await page.evaluate(()=>{currentUser=null;dispatchEvent(new Event('storage'))});await expect(host).toHaveCount(0);
});
test('contact and text cards are available, count events and preserve unknown history',async({page})=>{
 const card=page.locator('[data-metric="track:contact_button_pressed"]');await expect(card.locator('[data-metric-value]')).not.toHaveText('—');await expect(card.locator('.overview-card-secondary')).toContainText('unique browsers');
 await card.locator('summary').click();await card.locator('[data-card-count]').selectOption('browsers');await card.locator('summary').click();await expect(card.locator('[data-metric-value]')).toHaveText('5');
 await page.evaluate(()=>{VACANCY_BACKEND.adminEngagementSeries=async(point,b)=>({schemaVersion:1,point,coverageStart:new Date().toISOString(),complete:false,events:0,browsers:0,series:b.map(x=>({at:x.end,events:0,browsers:0}))})});await page.getByRole('button',{name:'Refresh data',exact:true}).click();await expect(card.locator('.overview-card-change')).toHaveText('Comparison unavailable');await expect(card.locator('.overview-card-secondary')).toContainText('since tracking began');
});
