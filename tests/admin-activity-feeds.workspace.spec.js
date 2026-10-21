const {test,expect}=require('@playwright/test');
test.beforeEach(async({page},info)=>{test.skip(info.project.name!=='desktop-chromium','Desktop-only feeds');await page.setViewportSize({width:1440,height:1000});await page.goto('/__admin-preview');await page.waitForFunction(()=>window.__visualReady);});
test('desktop feeds use the grid and summaries expand with keyboard and pointer',async({page})=>{
 const host=page.locator('.overview-activity-feeds');await expect(host).toBeVisible();await expect(host.locator('section')).toHaveCount(2);
 await expect(host.locator('[data-feed-body="0"]')).toContainText('Save button updated');await expect(host.locator('[data-feed-body="1"] details')).toHaveCount(8);
 await expect(host.locator('.activity-feed-summary').first()).toHaveCSS('color','rgb(237, 242, 250)');
 const event=host.locator('details').first();await event.locator('summary').click();await expect(event).toHaveAttribute('open','');await expect(event).toContainText('Synthetic example');await event.locator('summary').press('Enter');await expect(event).not.toHaveAttribute('open','');
 for(const width of [1280,1440,1920]){await page.setViewportSize({width,height:1000});const layout=await host.evaluate(n=>({tracks:getComputedStyle(n).gridTemplateColumns.split(' ').length,gap:getComputedStyle(n).gap,spans:[...n.children].map(c=>getComputedStyle(c).gridColumnStart),overflow:document.documentElement.scrollWidth>innerWidth}));expect(layout).toEqual({tracks:5,gap:'24px',spans:['span 2','span 3'],overflow:false});}
 await page.screenshot({path:'/tmp/vacancy-activity-feeds.png',fullPage:true});
});
test('feeds handle empty, failed, malformed and escaped records and discard ended-session results',async({page})=>{
 const host=page.locator('.overview-activity-feeds');await expect(host.locator('[data-feed-body="0"]')).toContainText('Save button updated');
 await page.evaluate(()=>{VACANCY_BACKEND.adminAppearanceHistory=async()=>[];VACANCY_BACKEND.adminListerMarketing=async()=>({events:[],publications:[]})});await host.getByRole('button',{name:'Refresh site changes'}).click();await expect(host.locator('[data-feed-body="0"]')).toContainText('No recorded activity');
 await host.getByRole('button',{name:'Refresh visitor activity'}).click();await expect(host.locator('[data-feed-body="1"]')).toContainText('No recorded activity');
 await page.evaluate(()=>VACANCY_BACKEND.adminAppearanceHistory=async()=>{throw Error('Denied')});await host.getByRole('button',{name:'Refresh site changes'}).click();await expect(host.locator('[data-feed-body="0"]')).toContainText('Feed unavailable');
 await page.evaluate(()=>VACANCY_BACKEND.adminListerMarketing=async()=>({events:[{}],publications:[]}));await host.getByRole('button',{name:'Refresh visitor activity'}).click();await expect(host.locator('[data-feed-body="1"]')).toContainText('Feed unavailable');
 await page.evaluate(()=>VACANCY_BACKEND.adminAppearanceHistory=async()=>[{revision:3,published_at:new Date().toISOString(),reason:'<img src=x onerror=alert(1)>'}]);await host.getByRole('button',{name:'Refresh site changes'}).click();await host.locator('summary').first().click();await expect(host.locator('img')).toHaveCount(0);await expect(host).toContainText('<img src=x onerror=alert(1)>');
 await page.evaluate(()=>VACANCY_BACKEND.adminAppearanceHistory=()=>new Promise(resolve=>window.__feedLate=resolve));await host.getByRole('button',{name:'Refresh site changes'}).click();await page.waitForFunction(()=>!!window.__feedLate);await page.evaluate(()=>{currentUser=null;dispatchEvent(new Event('storage'));__feedLate([{revision:4,published_at:new Date().toISOString(),reason:'Late private record'}])});await expect(host).toHaveCount(0);
});
