const { test, expect } = require('@playwright/test');

const APP_URL=process.env.VACANCY_E2E_URL || 'http://127.0.0.1:4177';

async function openHome(page){
  const make=(id,name,suburb,lat,lon,pets=false)=>({id,rent_amount:11000,rent_currency:'KES',rent_period:'month',monthly_rent:11000,deposit:null,bills_included:false,available_from:'2026-09-10',minimum_stay_weeks:4,confirmed_at:'2026-09-06T00:00:00Z',expires_at:'2026-10-06T00:00:00Z',status:'active',rooms:{id:`room-${id}`,name,room_type:'Private room',unit_type:'Bedsitter',furnished:false,ensuite:false,max_occupants:1,smoking_allowed_override:null,pets_considered_override:null,description:'Current test vacancy',media:id==='one'?[{url:'data:image/gif;base64,R0lGODlhAQABAAAAACw='},{url:'data:image/gif;base64,R0lGODlhAQABAAAAACw='},{url:'data:image/gif;base64,R0lGODlhAQABAAAAACw='}]:[],properties:{id:`property-${id}`,title:`${suburb} property`,suburb,city:'Nairobi',state:'Nairobi County',postcode:'',country:'Kenya',market_code:'KE',property_type:'Apartment',parking_spaces:1,pets_considered:pets,smoking_allowed:false,household_summary:'Quiet household',landmark:'',water_available:true,electricity_available:true,security_available:true,internet_available:true,public_latitude:lat,public_longitude:lon,owner_id:`owner-${id}`,profiles:{id:`owner-${id}`,display_name:'Test lister',bio:''}}}});
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
  if(size.width<=760){
    expect(map.height).toBeGreaterThanOrEqual(size.height-1);
  }else expect(map.height).toBeGreaterThanOrEqual(size.height*.7);
  await expect(page.getByRole('heading',{name:'Homes around you'})).toHaveCount(0);
  await expect(page.locator('.listing-toolbar')).toBeVisible();
});

test('mobile map shell uses compact icon controls without zoom buttons',async({page})=>{
  test.skip(page.viewportSize().width>820,'mobile map controls only');
  await openHome(page);
  await expect(page.locator('.leaflet-control-zoom')).toHaveCount(0);
  await expect(page.locator('#useLocation .control-icon')).toHaveCount(1);
  await expect(page.locator('#filtersToggle .control-icon')).toHaveCount(1);
  const controls=await page.evaluate(()=>{
    const search=document.querySelector('#q').getBoundingClientRect();
    const location=document.querySelector('#useLocation').getBoundingClientRect();
    const tools=document.querySelector('#filtersToggle').getBoundingClientRect();
    return {searchWidth:search.width,searchHeight:search.height,locationLeft:location.left,searchLeft:search.left,toolsTop:tools.top,searchTop:search.top};
  });
  expect(controls.searchWidth).toBeLessThan(page.viewportSize().width*.5);
  expect(controls.searchHeight).toBeLessThanOrEqual(42);
  expect(controls.locationLeft).toBeLessThan(controls.searchLeft);
  expect(controls.toolsTop).toBe(controls.searchTop);
  await page.getByRole('button',{name:'Map tools'}).click();
  await expect(page.getByLabel('Search radius')).toBeVisible();
});

test('filters are grouped and still filter live results',async({page})=>{
  await openHome(page);
  await expect(page.locator('#discoveryFilters')).toBeHidden();
  await page.getByRole('button',{name:'Map tools'}).click();
  await expect(page.locator('#discoveryFilters')).toBeVisible();
  await page.locator('#water').check();
  await page.getByText('More filters',{exact:true}).click();
  await page.locator('#pets').check();
  await expect(page.locator('.explore-card')).toHaveCount(1);
  await expect(page.locator('.explore-card')).toContainText('Ruiru');
});

test('live filter sheet uses location-gated radius and period controls',async({page})=>{
  await openHome(page);
  await page.locator('#filtersToggle').click();
  await expect(page.locator('#radius')).toBeDisabled();
  await expect(page.locator('#moveBy')).toHaveValue(new Date().toISOString().slice(0,10));
  await expect(page.locator('#rentPeriod')).toHaveValue('month');
  await page.locator('#stayPeriod').selectOption('month');
  await page.locator('#water').check();
  await expect(page.locator('.explore-card')).toHaveCount(3);
  await page.locator('#exploreMap').click({position:{x:20,y:70}});
  await expect(page.locator('#discoveryFilters')).toBeHidden();
});

test('location permission adds a visible current-location marker',async({page,context})=>{
  await context.grantPermissions(['geolocation'],{origin:APP_URL});
  await context.setGeolocation({latitude:-1.218,longitude:36.896});
  await openHome(page);
  await expect(page.locator('.user-location-status')).toHaveCount(0);
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

test('submitted place search geocodes, moves the map and enables radius',async({page})=>{
  await page.route('**/api/geocode?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({lat:-31.9523,lon:115.8613,label:'Perth, Western Australia, Australia'})}));
  await openHome(page);
  const before=await page.evaluate(()=>{const c=exploreMap.getCenter();return{lat:c.lat,lon:c.lng}});
  await page.getByLabel('Search location').fill('Perth');
  await page.getByRole('button',{name:'Search map'}).click();
  await expect(page.locator('.user-location-status')).toHaveText('● Search centre');
  await page.getByRole('button',{name:'Map tools'}).click();
  await expect(page.locator('#radius')).toBeEnabled();
  await expect(page.locator('#radiusStatus')).toContainText('Filtering within');
  const after=await page.evaluate(()=>{const c=exploreMap.getCenter();return{lat:c.lat,lon:c.lng}});
  expect(Math.abs(after.lat+31.9523)).toBeLessThan(.01);expect(Math.abs(after.lon-115.8613)).toBeLessThan(.01);expect(after).not.toEqual(before);
});

test('place search failure keeps map controls usable',async({page})=>{
  await page.route('**/api/geocode?**',route=>route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:'We could not find that place. Try a town, suburb or postcode.'})}));
  await openHome(page);
  await page.getByLabel('Search location').fill('No such vacancy place');
  await page.getByLabel('Search location').press('Enter');
  await expect(page.locator('#toast')).toContainText('We could not find that place');
  await expect(page.getByRole('button',{name:'Search map'})).toBeEnabled();
  await expect(page.locator('#exploreMap')).toBeVisible();
});

test('search this area establishes a visible radius centre',async({page})=>{
  await openHome(page);
  await page.evaluate(()=>exploreMap.panBy([100,0],{animate:false}));
  await expect(page.locator('#searchArea')).toBeVisible();
  await page.locator('#searchArea').click();
  await expect(page.locator('.user-location-status')).toHaveText('● Search centre');
  await page.getByRole('button',{name:'Filters'}).click();
  await expect(page.locator('#radius')).toBeEnabled();
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

test('dark theme is default and theme choice persists',async({page})=>{
  await openHome(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.getByRole('button',{name:'Use light mode'}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});

test('header keeps a single currency chooser without changing search location',async({page})=>{
  await openHome(page);
  await expect(page.locator('#countrySelect')).toHaveCount(0);
  await expect(page.locator('#marketSelect')).toHaveValue('KES');
  await expect(page.locator('#q')).toHaveAttribute('placeholder','Search area');
  await page.locator('#marketSelect').selectOption('GBP');
  await expect(page.locator('#q')).toHaveAttribute('placeholder','Search area');
});

test('listing CTA and quick filters use the new compact hierarchy',async({page})=>{
  await openHome(page);
  await expect(page.locator('.list-action')).toHaveCSS('background-color','rgb(255, 90, 61)');
  await page.getByRole('button',{name:'Filters',exact:true}).click();
  await page.getByText('More filters',{exact:true}).click();
  await page.locator('#pets').check();
  await expect(page.locator('.explore-card')).toHaveCount(1);
  await page.locator('#pets').uncheck();
  await expect(page.locator('.explore-card')).toHaveCount(3);
});

test('mobile results use two equal cards, one view toggle, and whole-card navigation',async({page})=>{
  test.skip(page.viewportSize().width>820,'mobile result layout only');
  await openHome(page);
  await expect(page.locator('#viewToggle')).toHaveCount(1);
  await expect(page.locator('[data-discovery-view]')).toHaveCount(1);
  const first=await page.locator('.explore-card').first().boundingBox();
  const second=await page.locator('.explore-card').nth(1).boundingBox();
  expect(Math.abs(first.width-second.width)).toBeLessThan(1);
  expect(Math.abs((second.x-first.x-first.width)-10)).toBeLessThan(1);
  await page.locator('.explore-card').first().click({position:{x:5,y:first.height-5}});
  await expect(page).toHaveURL(/#detail\//);
});

test('listing gallery advances its dots and heart persists through the saved backend',async({page})=>{
  await openHome(page);
  const first=page.locator('.explore-card').first();
  await expect(first.locator('[data-gallery-dot]')).toHaveCount(3);
  await first.locator('[data-gallery]').evaluate(node=>node.scrollTo({left:node.clientWidth,behavior:'instant'}));
  await expect(first.locator('[data-gallery-dot="1"]')).toHaveAttribute('aria-current','true');
  await page.evaluate(()=>{currentUser={id:'saved-user',email:'saved@test.invalid'};saved=new Set();window.savedCall='';VACANCY_BACKEND.saveVacancy=async id=>{window.savedCall=id}});
  const id=await first.getAttribute('data-card-id');
  await first.locator('[data-save]').click();
  await expect.poll(()=>page.evaluate(()=>window.savedCall)).toBe(id);
  await expect(page.locator(`[data-card-id="${id}"] [data-save]`)).toHaveAttribute('aria-pressed','true');
});

test('listing detail opens at top with breadcrumbs gallery thumbnails and map preview',async({page})=>{
  await openHome(page);
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await page.locator('.explore-card').first().click({position:{x:8,y:8}});
  await expect(page.locator('.breadcrumbs')).toContainText('Find');
  await expect(page.locator('.detail-gallery-slide')).toHaveCount(3);
  await expect(page.locator('.detail-thumbnail')).toHaveCount(3);
  await expect(page.locator('#detailLocationMap')).toBeVisible();
  expect(await page.evaluate(()=>window.scrollY)).toBeLessThan(2);
  const map=await page.locator('#detailLocationMap').boundingBox();
  expect(Math.abs(map.width-map.height)).toBeLessThan(2);
  await page.locator('[data-detail-thumb="1"]').click();
  await expect(page.locator('[data-detail-thumb="1"]')).toHaveAttribute('aria-current','true');
});

test('database listings render useful price markers that follow filters',async({page})=>{
  await openHome(page);
  await expect(page.locator('.map-pin')).toHaveCount(3);
  await expect(page.locator('.map-pin').first()).toContainText('KSh11k');
  const marker=page.locator('.leaflet-marker-icon').first();
  await expect(marker).toHaveAttribute('aria-label',/KSh11k/);
  await marker.hover();
  await expect(page.locator('.vacancy-map-tooltip')).toContainText(/Available/);
  await page.getByRole('button',{name:'Filters',exact:true}).click();
  await page.getByText('More filters',{exact:true}).click();
  await page.locator('#pets').check();
  await expect(page.locator('.map-pin')).toHaveCount(1);
});

test('mobile uses the native iOS marketplace type hierarchy',async({page})=>{
  test.skip(page.viewportSize().width>820,'mobile typography only');
  await openHome(page);
  const styles=await page.evaluate(()=>{
    const read=(selector,property)=>getComputedStyle(document.querySelector(selector))[property];
    return{
      family:read('body','fontFamily'),
      search:read('#q','fontSize'),
      listingTitle:read('.explore-card h3','fontSize'),
      price:read('.explore-card .price','fontSize'),
      metadata:read('.explore-card .fact','fontSize'),
      navigation:read('.mobile-nav button','fontSize')
    };
  });
  expect(styles.family).toContain('-apple-system');
  expect(styles).toMatchObject({search:'16px',listingTitle:'17px',price:'16px',metadata:'13px',navigation:'10px'});
});

test('navigation uses consistent local vector icons and selected states',async({page})=>{
  test.skip(page.viewportSize().width>820,'mobile navigation interaction only');
  await openHome(page);
  await expect(page.locator('.desktop-nav .nav-icon')).toHaveCount(4);
  await expect(page.locator('.mobile-nav .nav-icon')).toHaveCount(4);
  await expect(page.locator('#themeToggle .control-icon')).toHaveCount(1);
  await expect(page.locator('[data-nav="home"].active')).toHaveCount(2);
  expect(await page.locator('.mobile-nav .nav-icon').first().evaluate(node=>({width:getComputedStyle(node).width,height:getComputedStyle(node).height,stroke:getComputedStyle(node).strokeWidth}))).toMatchObject({width:'18px',height:'18px',stroke:'2px'});
  const controlHeights=await page.evaluate(()=>['q','useLocation','filtersToggle','searchBtn'].map(id=>Math.round(document.querySelector(`#${id}`).getBoundingClientRect().height)));
  expect(new Set(controlHeights).size).toBe(1);
  await expect(page.locator('#q')).toHaveAttribute('list','locationSuggestions');
  await page.evaluate(()=>setVacancyTheme('dark'));
  await expect(page.locator('#themeToggle use')).toHaveAttribute('href','#icon-moon');
  await page.evaluate(()=>setVacancyTheme('light'));
  await expect(page.locator('#themeToggle use')).toHaveAttribute('href','#icon-sun');
  await page.evaluate(()=>{currentUser={id:'icon-test',email:'icon@test.invalid'};saved=new Set()});
  await page.locator('.mobile-nav [data-nav="saved"]').click();
  await expect(page.locator('.mobile-nav [data-nav="saved"]')).toHaveClass(/active/);
  await expect(page.locator('.mobile-nav [data-nav="saved"] .nav-icon')).toHaveCSS('fill','rgb(255, 90, 61)');
});
