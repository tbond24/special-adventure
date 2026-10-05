const {test,expect}=require('@playwright/test');
test('existing listing flow records actual steps without changing its controls',async({page})=>{
 const base='http://127.0.0.1:8765',events=[];
 await page.route('**/*',async route=>{const u=new URL(route.request().url());
  if(u.origin!==base){if(u.pathname.endsWith('/rpc/record_lister_journey_v2'))events.push(...route.request().postDataJSON().p_events);return route.fulfill({status:200,contentType:'application/json',body:u.pathname.includes('record_lister')?'1':'[]'});}
  if(u.pathname==='/'){const response=await route.fetch(),headers={...response.headers()};delete headers['content-security-policy'];return route.fulfill({response,headers});}return route.continue();
 });
 await page.goto(base+'/#home');await page.waitForFunction(()=>booting===false);
 await page.evaluate(async()=>{currentUser={id:'synthetic-owner'};VACANCY_BACKEND.myProperties=async()=>[];VACANCY_BACKEND.myVacancies=async()=>[];nav('list','new');});
 await expect(page.locator('[data-listing-type=House]')).toBeVisible();await page.locator('[data-listing-type=House]').click();await page.getByRole('button',{name:'New property',exact:true}).click();
 const form=page.locator('#listingForm');await expect(form).toHaveAttribute('data-journey-step','0');
 await page.route('**/api/reverse-geocode?**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({country:'Tanzania',formattedAddress:'Tanzania'})}));
 await page.evaluate(()=>document.querySelector('#newPropertyMap')._vacancySetLocation(-6.8,39.2,true));await expect(form.locator('[name=address]')).toHaveValue('Tanzania');
 await form.locator('.journey-next').click();await expect(form).toHaveAttribute('data-journey-step','1');
 await page.evaluate(()=>VACANCY_CONNECTED_JOURNEY.flush());await expect.poll(()=>events.filter(e=>e.event_name==='step_ready'&&e.to_step===1).length).toBeGreaterThan(0);
 const start=events.find(e=>e.event_name==='listing_started'),next=events.find(e=>e.event_name==='step_ready'&&e.to_step===1);expect(next.journey_id).toBe(start.journey_id);expect(next.previous_event_id).toBe(start.event_id);
 await form.locator('.journey-back').click();await expect(form).toHaveAttribute('data-journey-step','0');await page.evaluate(()=>VACANCY_CONNECTED_JOURNEY.flush());expect(events.some(e=>e.from_step===1&&e.to_step===0)).toBe(true);
 expect(events.every(e=>!JSON.stringify(e).includes('Tanzania'))).toBe(true);
});
