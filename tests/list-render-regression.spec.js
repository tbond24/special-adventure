const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:8768';
test.beforeEach(async({page})=>{
  await page.route('**/*',r=>r.request().url().startsWith(APP)&&r.request().method()==='GET'?r.continue():r.fulfill({status:200,json:[]}));
  await page.goto(APP+'/#home');await page.waitForFunction(()=>!booting);
  await page.evaluate(()=>{
    currentUser={id:'synthetic-owner'};window.listReads=0;window.obsoleteLayouts=[];
    VACANCY_BACKEND.myProperties=async()=>{await new Promise(r=>setTimeout(r,250));return []};
    VACANCY_BACKEND.myVacancies=async()=>{window.listReads++;await new Promise(r=>setTimeout(r,250));return []};
    VACANCY_BACKEND.ownerDashboardMetrics=async()=>({impressions:0,clicks:0,messages:0});
    new MutationObserver(()=>{
      if(document.querySelector('.listing-type-grid [data-listing-type="Studio"],.listing-type-grid [data-listing-type="Apartment"],.listing-type-grid [data-listing-type="Room"]'))obsoleteLayouts.push('obsolete chooser');
      if([...document.querySelectorAll('main h1,main h2')].some(x=>/^List a vacancy$|^Your vacancies/.test(x.textContent)))obsoleteLayouts.push('obsolete heading');
    }).observe(document.querySelector('main'),{childList:true,subtree:true});
  });
  // Prove correctness without the loading cover: old layouts must not exist underneath it.
  await page.addStyleTag({content:'.listing-transition-loading{display:none!important}'});
});
test('dashboard never builds the listing creator or legacy headings',async({page})=>{
  await page.evaluate(()=>nav('list'));await expect(page.locator('#createNewListing')).toBeVisible();
  expect(await page.evaluate(()=>obsoleteLayouts)).toEqual([]);
  await expect(page.locator('#listingForm,#existingListingForm,.listing-start')).toHaveCount(0);
  expect(await page.evaluate(()=>listReads)).toBe(1);
});
test('create and Change construct only the current four-choice screen',async({page})=>{
  await page.evaluate(()=>nav('list','new'));await expect(page.locator('.listing-type-grid [data-listing-type]')).toHaveCount(4);
  await page.locator('[data-listing-type="Residential"]').click();await page.locator('[data-preset="Studio"]').click();await page.getByRole('button',{name:'New property',exact:true}).click();
  await expect(page.locator('#listingForm[data-journey101]')).toBeVisible();await page.locator('.listing-choice-breadcrumb button').click();
  await expect(page.locator('.listing-start:not(.complete) [data-listing-type]')).toHaveCount(4);
  expect(await page.evaluate(()=>obsoleteLayouts)).toEqual([]);expect(await page.evaluate(()=>listReads)).toBe(2);
});
