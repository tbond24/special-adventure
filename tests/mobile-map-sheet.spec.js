const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4178';

function row(id,suburb,lat,lon){return{id,rent_amount:12000,rent_currency:'KES',rent_period:'month',monthly_rent:12000,bills_included:false,available_from:'2026-09-10',minimum_stay_weeks:4,confirmed_at:'2026-09-07T00:00:00Z',expires_at:'2026-10-07T00:00:00Z',status:'active',rooms:{id:`room-${id}`,name:`${suburb} room`,room_type:'Private room',unit_type:'Bedsitter',furnished:false,ensuite:false,max_occupants:1,description:'Test vacancy',media:[],properties:{id:`property-${id}`,title:`${suburb} property`,suburb,city:'Nairobi',state:'Nairobi County',country:'Kenya',market_code:'KE',property_type:'Apartment',parking_spaces:1,pets_considered:false,smoking_allowed:false,household_summary:'Quiet',water_available:true,electricity_available:true,security_available:true,internet_available:true,public_latitude:lat,public_longitude:lon,owner_id:`owner-${id}`,profiles:{id:`owner-${id}`,display_name:'Lister',bio:''}}}}}

async function open(page,rows=[row('one','Kasarani',-1.218,36.896),row('two','Ruiru',-1.146,36.96),row('three','Westlands',-1.267,36.81)]){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(rows)}));
  await page.addInitScript(()=>{localStorage.setItem('vacancy-market-v1','KE');localStorage.setItem('vacancy-theme-v1','dark')});
  await page.goto(APP,{waitUntil:'domcontentloaded'});await expect(page.locator('#exploreMap')).toBeVisible();
}

test.beforeEach(({page})=>test.skip(page.viewportSize().width>820,'mobile map sheet only'));

test('map fills the mobile viewport behind an inset browse sheet',async({page})=>{
  await open(page);await expect(page.locator('.explore-card')).toHaveCount(3);
  const size=page.viewportSize(),map=await page.locator('#exploreMap').boundingBox(),sheet=await page.locator('#mobileMapSheet').boundingBox();
  expect(map.height).toBeGreaterThanOrEqual(size.height-1);expect(map.width).toBe(size.width);
  expect(sheet.x).toBeGreaterThanOrEqual(9);expect(size.width-sheet.x-sheet.width).toBeGreaterThanOrEqual(9);
  expect(sheet.height).toBeGreaterThan(size.height*.38);expect(sheet.height).toBeLessThan(size.height*.5);
  const controls=await page.locator('.map-search-panel').boundingBox();expect(controls.y+controls.height).toBeLessThanOrEqual(sheet.y-8);
});

test('sheet controls expose peek browse and expanded positions',async({page})=>{
  await open(page);const sheet=page.locator('#mobileMapSheet');
  await page.getByRole('button',{name:'Show more listings'}).click();await expect(sheet).toHaveAttribute('data-sheet-state','expanded');
  await expect(page.locator('.map-search-panel')).toHaveCSS('pointer-events','none');
  await expect(page.getByRole('button',{name:'Show fewer listings'})).toHaveAttribute('aria-expanded','true');
  await page.getByRole('button',{name:'Minimize listings'}).click();await expect(sheet).toHaveAttribute('data-sheet-state','peek');
  await page.getByRole('button',{name:'Show more listings'}).click();await expect(sheet).toHaveAttribute('data-sheet-state','expanded');
});

test('vertical handle gesture changes one sheet position',async({page})=>{
  await open(page);const handle=page.locator('#sheetHandle'),box=await handle.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y-70,{steps:4});await page.mouse.up();
  await expect(page.locator('#mobileMapSheet')).toHaveAttribute('data-sheet-state','expanded');
});

test('pin selection raises a minimized sheet to browsing position',async({page})=>{
  await open(page);await page.getByRole('button',{name:'Minimize listings'}).click();
  await page.locator('.leaflet-marker-icon').first().click();
  await expect(page.locator('#mobileMapSheet')).toHaveAttribute('data-sheet-state','browse');
  await expect(page.locator('.explore-card.selected')).toHaveCount(1);
});

test('empty inventory defaults to a compact peek and leaves map usable',async({page})=>{
  await open(page,[]);await expect(page.locator('#resultCount')).toContainText('0 current vacancies');
  await expect(page.locator('#mobileMapSheet')).toHaveAttribute('data-sheet-state','peek');
  const before=await page.evaluate(()=>exploreMap.getCenter().lng);await page.evaluate(()=>exploreMap.panBy([80,0],{animate:false}));
  await expect.poll(()=>page.evaluate(()=>exploreMap.getCenter().lng)).not.toBe(before);
});

test('sheet remains contained in both themes with no sideways page movement',async({page})=>{
  await open(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBeTruthy();
  await page.getByRole('button',{name:'Use light mode'}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  const sheet=await page.locator('#mobileMapSheet').boundingBox();expect(sheet.x+sheet.width).toBeLessThanOrEqual(page.viewportSize().width-9);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBeTruthy();
});

test('guest policy links remain reachable from the full-screen map',async({page})=>{
  await open(page);await page.getByRole('button',{name:'Information and policies'}).click();
  await expect(page.getByRole('dialog',{name:'Vacancy information'})).toBeVisible();
  await expect(page.locator('#mapInfoSheet a')).toHaveCount(4);await page.locator('#mapInfoSheet a[href="#privacy"]').click();
  await expect(page.getByRole('heading',{name:'Privacy',exact:true})).toBeVisible();
});
