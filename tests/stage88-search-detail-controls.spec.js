const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';
const image=colour=>`data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="${colour}"/></svg>`;
const row={id:'stage88-room',rentAmount:25000,rentCurrency:'KES',rentPeriod:'month',deposit:10000,updatedAt:new Date().toISOString(),availableFrom:'2026-01-01',room:{name:'Kilimani room',roomType:'Room',description:'Quiet room',media:[{url:image('orange')},{url:image('blue')}],furnished:true,ensuite:false,maxOccupants:1},property:{id:'stage88-property',suburb:'Kilimani',city:'Nairobi',country:'Kenya',propertyType:'House',parkingSpaces:0,securityAvailable:true,internetAvailable:true,waterAvailable:true,electricityAvailable:true,petsConsidered:false,smokingAllowed:false,publicLatitude:-1.2921,publicLongitude:36.7831,customFeatures:[]},owner:{id:'owner-one',displayName:'Lister'}};
async function open(page){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(value=>{vacancies=[value];displayCurrency='KES';renderHome()},row);
}
test('search arrow is clickable and map suggestions choose a location',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route('**/api/geocode?**',async route=>{
    const url=new URL(route.request().url());
    const body=url.searchParams.get('suggest')==='1'?{suggestions:[{lat:-1.2864,lon:36.8172,label:'Nairobi, Kenya'}]}:{lat:-4.0435,lon:39.6682,label:'Mombasa, Kenya'};
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await open(page);
  await page.locator('#searchBtn').click();
  await page.locator('#q').fill('Nai');
  await expect(page.getByRole('option',{name:'Nairobi, Kenya'})).toBeVisible();
  await page.getByRole('option',{name:'Nairobi, Kenya'}).click();
  await expect.poll(()=>page.evaluate(()=>exploreMap.getCenter().lat)).toBeCloseTo(-1.2864,2);
  await page.locator('#q').fill('Mombasa');
  await page.locator('#searchBtn').click();
  await expect.poll(()=>page.evaluate(()=>exploreMap.getCenter().lat)).toBeCloseTo(-4.0435,2);
  await expect(page.locator('#q')).toHaveCSS('border-radius','999px');
});
test('gear menu owns currency, uses regular switches and contains the move-in field',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await open(page);
  await page.locator('#filtersToggle').click();
  const filters=page.locator('#discoveryFilters');
  await expect(filters.locator('.gear-currency-select')).toHaveValue('auto');
  await expect(page.locator('.topbar>.market-switch')).toHaveCount(0);
  await expect(filters.locator('.filter-toggle-track')).toHaveCount(8);
  const metrics=await filters.evaluate(node=>{const date=node.querySelector('#moveBy').getBoundingClientRect(),box=node.getBoundingClientRect(),track=node.querySelector('.filter-toggle-track');return{dateRight:date.right,boxRight:box.right,trackRadius:getComputedStyle(track).borderRadius,typeRadius:getComputedStyle(document.querySelector('.map-type-current')).borderRadius}});
  expect(metrics.dateRight).toBeLessThan(metrics.boxRight-5);
  expect(metrics.trackRadius).toBe('999px');
  expect(metrics.typeRadius).toBe('999px');
});
test('listing images exactly fill their slide without vertical room',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await open(page);
  const gaps=await page.locator('.listing-card').first().evaluate(card=>{const slide=card.querySelector('.listing-slide').getBoundingClientRect(),image=card.querySelector('.listing-slide img').getBoundingClientRect();return{top:Math.abs(slide.top-image.top),bottom:Math.abs(slide.bottom-image.bottom),left:Math.abs(slide.left-image.left),right:Math.abs(slide.right-image.right)}});
  expect(Math.max(...Object.values(gaps))).toBeLessThanOrEqual(1);
});
test('detail location links to one large bottom map and enquiry has no helper copy below it',async({page})=>{
  await open(page);
  await page.evaluate(value=>{vacancies=[value];renderDetail(value.id)},row);
  const section=page.locator('#listingLocationSection');
  await expect(section).toBeVisible();
  await expect(page.locator('.detail-summary .detail-map-card')).toHaveCount(0);
  const size=await section.locator('#detailLocationMap').evaluate(node=>node.getBoundingClientRect());
  expect(size.width).toBeGreaterThan(300);
  expect(size.height).toBeGreaterThanOrEqual(240);
  await expect(page.locator('.contact-route-note')).toHaveCount(0);
  await page.locator('.detail-location-link').click();
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(100);
  const order=await page.evaluate(()=>Boolean(document.querySelector('.listing-detail-sections').compareDocumentPosition(document.querySelector('#listingLocationSection'))&Node.DOCUMENT_POSITION_FOLLOWING));
  expect(order).toBeTruthy();
});

test('automatic currency follows an approved device location until manually overridden',async({page})=>{
  await page.route('**/api/reverse-geocode?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({country:'Australia',countryCode:'AU'})}));
  await page.route('**/api/exchange-rates',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({rates:{KES:130,AUD:1.5,USD:1,GBP:.8}})}));
  await open(page);
  await page.evaluate(()=>{
    localStorage.removeItem('vacancy-currency-v1');
    localStorage.removeItem('vacancy-currency-mode-v1');
    marketCode='KE';
    displayCurrency='KES';
    navigator.geolocation.getCurrentPosition=success=>success({coords:{latitude:-31.9523,longitude:115.8613}});
    renderHome();
  });
  await page.locator('#useLocation').click();
  await expect.poll(()=>page.evaluate(()=>displayCurrency)).toBe('AUD');
  await page.locator('#filtersToggle').click();
  await expect(page.locator('.gear-currency-select')).toHaveValue('auto');
  await expect(page.locator('.gear-currency-select option').first()).toHaveText('Auto · AUD');
});


test('geocode suggestion mode returns a bounded list without changing single-result mode',async()=>{
  const handler=require('../app/api/geocode.js');
  const priorFetch=global.fetch;
  global.fetch=async()=>({ok:true,json:async()=>[
    {lat:'-1.2864',lon:'36.8172',display_name:'Nairobi, Kenya'},
    {lat:'-1.2921',lon:'36.8219',display_name:'Nairobi Central, Kenya'}
  ]});
  const run=query=>new Promise((resolve,reject)=>{
    const headers={};
    const res={setHeader:(key,value)=>headers[key]=value,status(code){this.code=code;return this},json(body){resolve({code:this.code,body,headers})}};
    Promise.resolve(handler({method:'GET',query},res)).catch(reject);
  });
  try{
    const suggested=await run({q:'Nairobi-stage88',suggest:'1'});
    expect(suggested.code).toBe(200);
    expect(suggested.body.suggestions).toHaveLength(2);
    const single=await run({q:'Nairobi-stage88-single'});
    expect(single.body).toMatchObject({lat:-1.2864,lon:36.8172,label:'Nairobi, Kenya'});
  }finally{global.fetch=priorFetch}
});

