const { test, expect } = require('@playwright/test');

const APP_URL=process.env.VACANCY_E2E_URL || 'http://127.0.0.1:4177';

async function openHome(page){
  const make=(id,name,suburb,lat,lon,pets=false)=>({id,rent_amount:11000,rent_currency:'KES',rent_period:'month',monthly_rent:11000,deposit:null,bills_included:false,available_from:'2026-09-10',minimum_stay_weeks:4,confirmed_at:'2026-09-06T00:00:00Z',expires_at:'2026-10-06T00:00:00Z',status:'active',rooms:{id:`room-${id}`,name,room_type:'Private room',unit_type:'Bedsitter',furnished:false,ensuite:false,max_occupants:1,smoking_allowed_override:null,pets_considered_override:null,description:'Current test vacancy',media:[],properties:{id:`property-${id}`,title:`${suburb} property`,suburb,city:'Nairobi',state:'Nairobi County',postcode:'',country:'Kenya',market_code:'KE',property_type:'Apartment',parking_spaces:1,pets_considered:pets,smoking_allowed:false,household_summary:'Quiet household',landmark:'',water_available:true,electricity_available:true,security_available:true,internet_available:true,public_latitude:lat,public_longitude:lon,owner_id:`owner-${id}`,profiles:{id:`owner-${id}`,display_name:'Test lister',bio:''}}}});
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([
    make('one','Kasarani Bedsitter','Kasarani',-1.218,36.896),
    make('two','Ruiru Studio','Ruiru',-1.146,36.96,true),
    make('three','Westlands Room','Westlands',-1.267,36.81)
  ])}));
  await page.addInitScript(()=>localStorage.setItem('vacancy-market-v1','KE'));
  await page.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#exploreMap')).toBeVisible();
  await expect(page.locator('.explore-card')).toHaveCount(3,{timeout:15000});
}

test('map leads the first screen and results follow it',async({page})=>{
  await openHome(page);
  await expect(page.locator('.hero')).toHaveCount(0);
  const size=page.viewportSize(),map=await page.locator('#exploreMap').boundingBox();
  expect(map.height).toBeGreaterThanOrEqual(size.height*(size.width<=760?.6:.7));
  await expect(page.getByRole('heading',{name:'Homes around you'})).toBeVisible();
});

test('filters are grouped and still filter live results',async({page})=>{
  await openHome(page);
  await expect(page.locator('#discoveryFilters')).toBeHidden();
  await page.getByRole('button',{name:'Filters'}).click();
  await expect(page.locator('#discoveryFilters')).toBeVisible();
  await page.locator('#water').check();
  await page.getByText('More filters',{exact:true}).click();
  await page.locator('#pets').check();
  await expect(page.locator('.explore-card')).toHaveCount(1);
  await expect(page.locator('.explore-card')).toContainText('Ruiru');
});

test('location permission adds a visible current-location marker',async({page,context})=>{
  await context.grantPermissions(['geolocation'],{origin:APP_URL});
  await context.setGeolocation({latitude:-1.218,longitude:36.896});
  await openHome(page);
  await page.getByRole('button',{name:/Use my location/}).click();
  await expect(page.locator('.user-location-status')).toBeVisible({timeout:10000});
  await expect(page.locator('#useLocation')).toContainText('Using my location');
  await page.getByRole('button',{name:'Filters'}).click();
  await expect(page.locator('#radiusStatus')).toContainText('Filtering within');
});

test('location denial leaves search usable',async({page,context})=>{
  await context.clearPermissions();
  await openHome(page);
  await page.getByRole('button',{name:/Use my location/}).click();
  await expect(page.locator('#toast')).toContainText('Location permission was not granted',{timeout:10000});
  await expect(page.locator('#useLocation')).toBeEnabled();
  await page.getByLabel('Search location').fill('Kasarani');
  await expect(page.locator('.explore-card')).toHaveCount(1);
});

test('card and full-width list views preserve results and preference',async({page})=>{
  await openHome(page);
  const count=await page.locator('.explore-card').count();
  await page.getByRole('button',{name:'List view'}).click();
  await expect(page.locator('#cards')).toHaveClass(/list-view/);
  await expect(page.locator('.explore-card')).toHaveCount(count);
  const host=await page.locator('#cards').boundingBox(),card=await page.locator('.explore-card').first().boundingBox();
  expect(card.width).toBeGreaterThan(host.width*.9);
  await page.reload();
  await expect(page.locator('#cards')).toHaveClass(/list-view/);
});

test('map-first layout does not create page overflow',async({page})=>{
  await openHome(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBeFalsy();
});
