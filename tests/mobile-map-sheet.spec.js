const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4178';

function row(id,suburb,lat,lon){return{id,rent_amount:12000,rent_currency:'KES',rent_period:'month',monthly_rent:12000,bills_included:false,available_from:'2026-09-10',minimum_stay_weeks:4,confirmed_at:'2026-09-07T00:00:00Z',expires_at:'2026-10-07T00:00:00Z',status:'active',rooms:{id:'room-'+id,name:suburb+' room',room_type:'Private room',unit_type:'Bedsitter',furnished:false,ensuite:false,max_occupants:1,description:'Test vacancy',media:[],properties:{id:'property-'+id,title:suburb+' property',suburb,city:'Nairobi',state:'Nairobi County',country:'Kenya',market_code:'KE',property_type:'Apartment',parking_spaces:1,pets_considered:false,smoking_allowed:false,household_summary:'Quiet',water_available:true,electricity_available:true,security_available:true,internet_available:true,public_latitude:lat,public_longitude:lon,owner_id:'owner-'+id,profiles:{id:'owner-'+id,display_name:'Lister',bio:''}}}}}

async function open(page,rows=[row('one','Kasarani',-1.218,36.896),row('two','Ruiru',-1.146,36.96),row('three','Westlands',-1.267,36.81)]){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(rows)}));
  await page.addInitScript(()=>{localStorage.setItem('vacancy-market-v1','KE');localStorage.setItem('vacancy-theme-v1','dark')});
  await page.goto(APP,{waitUntil:'domcontentloaded'});await expect(page.locator('#exploreMap')).toBeVisible();
}

test.beforeEach(({page})=>test.skip(page.viewportSize().width>820,'mobile fixed split only'));

test('Find uses a fixed 60/40 mobile split with normal page scrolling',async({page})=>{
  await open(page);await expect(page.locator('.explore-card')).toHaveCount(3);
  const size=page.viewportSize(),map=await page.locator('#exploreMap').boundingBox(),results=await page.locator('#discoveryResults').boundingBox();
  expect(map.width).toBe(size.width);expect(map.height).toBeGreaterThanOrEqual(Math.min(size.height*.6,620)-1);
  expect(results.x).toBe(0);expect(results.width).toBe(size.width);expect(results.y).toBeGreaterThanOrEqual(map.y+map.height-1);
  expect(await page.evaluate(()=>getComputedStyle(document.body).overflowY)).toBe('auto');
});

test('map search controls remain reachable inside the lower map edge',async({page})=>{
  await open(page);const map=await page.locator('#exploreMap').boundingBox(),controls=await page.locator('.map-search-panel').boundingBox();
  expect(controls.y).toBeGreaterThan(map.y);expect(controls.y+controls.height).toBeLessThanOrEqual(map.y+map.height-10);
});

test('cards and list views remain available immediately below the map',async({page})=>{
  await open(page);await expect(page.locator('#cards')).toHaveClass(/card-view/);
  await page.getByRole('button',{name:'List view'}).click();await expect(page.locator('#cards')).toHaveClass(/list-view/);
  await expect(page.locator('.explore-card')).toHaveCount(3);
});

test('distance units live with radius tools and update live results',async({page})=>{
  await open(page);await page.getByRole('button',{name:'Map tools'}).click();
  await expect(page.getByRole('button',{name:'Change distance units'})).toHaveText('km');
  await page.getByRole('button',{name:'Change distance units'}).click();
  await expect(page.getByRole('button',{name:'Change distance units'})).toHaveText('mi');
  expect(await page.evaluate(()=>localStorage.getItem('vacancy-distance-unit-v1'))).toBe('mi');
});

test('empty inventory keeps both map and result state usable',async({page})=>{
  await open(page,[]);await expect(page.locator('#resultCount')).toContainText('0 current vacancies');
  await expect(page.locator('#cards')).toContainText('No current vacancies');
  await expect.poll(()=>page.evaluate(()=>Boolean(exploreMap))).toBeTruthy();
  const before=await page.evaluate(()=>exploreMap.getCenter().lng);await page.evaluate(()=>exploreMap.panBy([80,0],{animate:false}));
  await expect.poll(()=>page.evaluate(()=>exploreMap.getCenter().lng)).not.toBe(before);
});

test('fixed split is contained in both themes with no sideways movement',async({page})=>{
  await open(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBeTruthy();
  await page.getByRole('button',{name:'Use light mode'}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  const results=await page.locator('#discoveryResults').boundingBox();expect(results.x+results.width).toBeLessThanOrEqual(page.viewportSize().width);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBeTruthy();
});

test('public policy links return through the normal page footer',async({page})=>{
  await open(page);await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));
  await expect(page.locator('.site-footer a[href="#privacy"]')).toBeVisible();
  await page.locator('.site-footer a[href="#privacy"]').click();await expect(page.getByRole('heading',{name:'Privacy',exact:true})).toBeVisible();
});
