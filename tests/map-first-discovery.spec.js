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
  if(size.width<=760){
    expect(map.height).toBeGreaterThanOrEqual(size.height*.64);
    expect(map.height).toBeLessThanOrEqual(size.height*.70);
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
  expect(controls.toolsTop).toBeGreaterThan(controls.searchTop);
  await page.getByRole('button',{name:'Map tools'}).click();
  await expect(page.getByLabel('Search radius')).toBeVisible();
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
  await expect(page.locator('#q')).toHaveAttribute('placeholder',/Kasarani/);
  await page.locator('#marketSelect').selectOption('GBP');
  await expect(page.locator('#q')).toHaveAttribute('placeholder',/Kasarani/);
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
  expect(styles).toMatchObject({search:'16px',listingTitle:'17px',price:'16px',metadata:'13px',navigation:'12px'});
});

test('navigation uses consistent local vector icons and selected states',async({page})=>{
  test.skip(page.viewportSize().width>820,'mobile navigation interaction only');
  await openHome(page);
  await expect(page.locator('.desktop-nav .nav-icon')).toHaveCount(4);
  await expect(page.locator('.mobile-nav .nav-icon')).toHaveCount(4);
  await expect(page.locator('#themeToggle .control-icon')).toHaveCount(1);
  await expect(page.locator('[data-nav="home"].active')).toHaveCount(2);
  expect(await page.locator('.mobile-nav .nav-icon').first().evaluate(node=>({width:getComputedStyle(node).width,height:getComputedStyle(node).height,stroke:getComputedStyle(node).strokeWidth}))).toMatchObject({width:'25px',height:'25px',stroke:'2px'});
  await page.evaluate(()=>{currentUser={id:'icon-test',email:'icon@test.invalid'};saved=new Set()});
  await page.locator('.mobile-nav [data-nav="saved"]').click();
  await expect(page.locator('.mobile-nav [data-nav="saved"]')).toHaveClass(/active/);
  await expect(page.locator('.mobile-nav [data-nav="saved"] .nav-icon')).toHaveCSS('fill','rgb(255, 90, 61)');
});
