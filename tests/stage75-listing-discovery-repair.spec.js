const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

const sample={
  id:'stage75-one',rentAmount:24500,rentCurrency:'KES',rentPeriod:'month',deposit:12000,updatedAt:new Date().toISOString(),
  room:{name:'Kilimani studio',roomType:'Studio',media:[{url:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="orange"/></svg>'},{url:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="blue"/></svg>'}],furnished:true,ensuite:true,maxOccupants:1},
  property:{suburb:'Kilimani',city:'Nairobi',country:'Kenya',propertyType:'Apartment',parkingSpaces:0,securityAvailable:true,internetAvailable:true,waterAvailable:true,electricityAvailable:true,petsConsidered:false,publicLatitude:-1.2921,publicLongitude:36.7831,customFeatures:[]},owner:{}
};

async function open(page,hash='home'){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.route('**/api/exchange-rates',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({rates:{KES:1,AUD:.011,USD:.0077,GBP:.006}})}));
  await page.goto(`${APP}/#${hash}`);
  await page.waitForFunction(()=>booting===false);
}

async function renderSample(page){
  await page.evaluate(value=>{vacancies=[value];displayCurrency='KES';renderHome();exploreMap.setView([value.property.publicLatitude,value.property.publicLongitude],12,{animate:false});applySearch()},sample);
  await expect(page.locator('.listing-card')).toHaveCount(1);
}

test('card gallery scrolls internally and updates the image counter',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await open(page);await renderSample(page);
  const gallery=page.locator('[data-gallery]');
  await expect(gallery).toHaveAttribute('aria-label','2 listing images');
  const result=await gallery.evaluate(node=>{node.scrollLeft=node.clientWidth;node.dispatchEvent(new Event('scroll'));return{left:node.scrollLeft,width:node.clientWidth,touch:getComputedStyle(node).touchAction,overflow:getComputedStyle(node).overflowX}});
  expect(result.left).toBeGreaterThan(result.width*.8);
  expect(result.touch).toContain('pan-x');
  expect(result.overflow).toBe('auto');
  await expect(page.locator('.gallery-counter')).toHaveText('2/2');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
});

test('heart is legible over images and saved state is distinct',async({page})=>{
  await open(page);await renderSample(page);
  const heart=page.locator('.heart-action');
  const normal=await heart.evaluate(node=>({color:getComputedStyle(node).color,background:getComputedStyle(node).backgroundColor}));
  expect(normal.color).toBe('rgb(255, 255, 255)');
  expect(normal.background).not.toBe('rgba(0, 0, 0, 0)');
  await heart.evaluate(node=>node.classList.add('saved'));
  await page.waitForTimeout(250);
  expect((await heart.evaluate(node=>getComputedStyle(node).color))).not.toBe(normal.color);
});

test('price amount and smaller period stay on one line',async({page})=>{
  await page.setViewportSize({width:320,height:800});
  await open(page);await renderSample(page);
  const metrics=await page.locator('.listing-price').evaluate(node=>{const amount=node.querySelector('.listing-price-amount'),period=node.querySelector('.listing-price-period');return{wrap:getComputedStyle(node).whiteSpace,amountSize:parseFloat(getComputedStyle(amount).fontSize),periodSize:parseFloat(getComputedStyle(period).fontSize),amountTop:amount.getBoundingClientRect().top,periodTop:period.getBoundingClientRect().top}});
  expect(metrics.wrap).toBe('nowrap');
  expect(metrics.periodSize).toBeLessThan(metrics.amountSize);
  expect(Math.abs(metrics.periodTop-metrics.amountTop)).toBeLessThan(12);
});

test('currency changes preserve exact map centre and zoom',async({page})=>{
  await open(page);await renderSample(page);
  const before=await page.evaluate(()=>{exploreMap.setView([-1.2345,36.9876],14,{animate:false});return{lat:exploreMap.getCenter().lat,lng:exploreMap.getCenter().lng,zoom:exploreMap.getZoom()}});
  await page.evaluate(()=>setDisplayCurrency('AUD'));
  const after=await page.evaluate(()=>({lat:exploreMap.getCenter().lat,lng:exploreMap.getCenter().lng,zoom:exploreMap.getZoom(),currency:displayCurrency}));
  expect(after.currency).toBe('AUD');
  expect(after.zoom).toBe(before.zoom);
  expect(after.lat).toBeCloseTo(before.lat,5);
  expect(after.lng).toBeCloseTo(before.lng,5);
});

test('global inventory does not force the initial map into a world view',async({page})=>{
  await open(page);
  await page.evaluate(value=>{marketCode='KE';vacancies=[value,{...value,id:'australia',property:{...value.property,country:'Australia',city:'Sydney',suburb:'Wollstonecraft',publicLatitude:-33.84,publicLongitude:151.19}}];renderHome()},sample);
  const view=await page.evaluate(()=>({zoom:exploreMap.getZoom(),center:exploreMap.getCenter()}));
  expect(view.zoom).toBeGreaterThanOrEqual(10);
  expect(view.center.lat).toBeCloseTo(sample.property.publicLatitude,1);
  expect(view.center.lng).toBeCloseTo(sample.property.publicLongitude,1);
});

test('a market with no nearby inventory stays at market scale for regional discovery',async({page})=>{
  await open(page);
  await page.evaluate(value=>{marketCode='US';vacancies=[value,{...value,id:'kenya-two',property:{...value.property,publicLatitude:-1.25,publicLongitude:36.84}},{...value,id:'australia',property:{...value.property,country:'Australia',city:'Sydney',suburb:'Wollstonecraft',publicLatitude:-33.84,publicLongitude:151.19}}];renderHome()},sample);
  const view=await page.evaluate(()=>({zoom:exploreMap.getZoom(),center:exploreMap.getCenter()}));
  expect(view.zoom).toBe(4);
  expect(view.center.lat).toBeCloseTo(39.8283,1);
  expect(view.center.lng).toBeCloseTo(-98.5795,1);
});

test('category identity is clear and positive feature icons are limited',async({page})=>{
  await open(page);await renderSample(page);
  await expect(page.locator('.listing-card')).toHaveClass(/category-apartment/);
  await expect(page.locator('.listing-category-title use')).toHaveAttribute('href','#icon-building');
  const titles=await page.locator('.listing-highlights .service-card-pill').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('title')));
  expect(titles).toEqual(['Security','Wi-Fi','Ensuite','Furnished']);
  expect(titles).not.toContain('Pets');
  expect(titles).not.toContain('Smoking');
});

test('listing choices lead to a centred top-step journey with inherited rules hidden',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await open(page);
  await page.evaluate(async()=>{currentUser={id:'owner'};VACANCY_BACKEND.myProperties=async()=>[];VACANCY_BACKEND.myVacancies=async()=>[];await renderList()});
  await page.getByRole('button',{name:'Room',exact:true}).click();
  await page.getByRole('button',{name:'New property'}).click();
  await expect(page.locator('.listing-start')).toBeHidden();
  await expect(page.locator('.listing-choice-breadcrumb')).toContainText('Room');
  await expect(page.locator('.listing-choice-breadcrumb')).toContainText('New property');
  await expect(page.locator('.listing-top-stepper')).toContainText('Property');
  await expect(page.locator('.listing-top-stepper')).toContainText('Publish');
  expect(await page.locator('.listing-top-stepper').evaluate(node=>getComputedStyle(node).position)).toBe('sticky');
  await expect(page.locator('[name="smokingOverride"], [data-base-name="smokingOverride"]')).toBeHidden();
  await expect(page.locator('[name="petsOverride"], [data-base-name="petsOverride"]')).toBeHidden();
  await expect(page.locator('.listing-preview-action')).toBeHidden();
});
