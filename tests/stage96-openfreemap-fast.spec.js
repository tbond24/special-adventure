const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';
const image=colour=>`data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="${colour}"/></svg>`;
const base={id:'stage96-room-a',rentAmount:25000,rentCurrency:'KES',rentPeriod:'month',deposit:10000,updatedAt:new Date().toISOString(),availableFrom:'2026-01-01',room:{name:'Kilimani room',roomType:'Room',description:'Quiet room',media:[{url:image('orange')},{url:image('blue')}],furnished:true,ensuite:false,maxOccupants:1},property:{id:'stage96-property-a',suburb:'Kilimani',city:'Nairobi',country:'Kenya',propertyType:'House',parkingSpaces:0,securityAvailable:true,internetAvailable:true,waterAvailable:true,electricityAvailable:true,petsConsidered:false,smokingAllowed:false,publicLatitude:-1.2921,publicLongitude:36.7831,customFeatures:[]},owner:{id:'owner-one',displayName:'Amina Homes'}};
const rows=[base,{...base,id:'stage96-room-b',room:{...base.room,name:'Westlands apartment',roomType:'Apartment'},property:{...base.property,id:'stage96-property-b',suburb:'Westlands',propertyType:'Apartment',publicLatitude:-1.2676,publicLongitude:36.8108}},{...base,id:'stage96-shop',room:{...base.room,name:'Mombasa shop',roomType:'Shop'},property:{...base.property,id:'stage96-property-c',suburb:'Mombasa',city:'Mombasa',propertyType:'Shop',publicLatitude:-4.0435,publicLongitude:39.6682}}];

async function openFast(page,zoom=6){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/?map=openfreemap-fast#home`);
  await page.waitForFunction(()=>window.__vacancyStage96?.ready===true);
  await page.evaluate(value=>{vacancies=value;displayCurrency='KES';renderHome();},rows);
  await page.waitForFunction(()=>window.__vacancyStage96?.ready===true&&window.__vacancyStage96.rawMap().getSource('vacancy-listings'));
  await page.evaluate(({value,zoom})=>{updateExploreMarkers(value);exploreMap.setView(zoom>8?[-1.28,36.8]:[-2.1,38.1],zoom)}, {value:rows,zoom});
  await page.waitForFunction(()=>window.__vacancyStage96.rawMap().getSource('vacancy-listings')?.serialize().data?.features?.length===3);
}

test('fast experiment is isolated from Leaflet and the existing OpenFreeMap preview',async({page})=>{
  await page.goto(`${APP}/#home`); await page.waitForFunction(()=>booting===false);
  await expect(page.locator('.leaflet-container')).toHaveCount(1);
  expect(await page.evaluate(()=>window.__vacancyStage96)).toBeUndefined();
  await page.goto(`${APP}/?map=openfreemap#home`); await page.waitForFunction(()=>window.__vacancyStage93?.ready===true);
  expect(await page.evaluate(()=>window.__vacancyStage96)).toBeUndefined();
  expect(await page.evaluate(()=>exploreMap.engine)).toBe('openfreemap');
});

test('fast map uses a compact canvas style and no HTML listing markers',async({page})=>{
  await openFast(page);
  await expect(page.locator('.maplibregl-map')).toHaveCount(1);
  await expect(page.locator('.maplibregl-marker')).toHaveCount(0);
  const result=await page.evaluate(()=>({engine:exploreMap.engine,layers:window.__vacancyStage96.rawMap().getStyle().layers.length,features:window.__vacancyStage96.rawMap().getSource('vacancy-listings').serialize().data.features.length,cluster:window.__vacancyStage96.rawMap().getSource('vacancy-listings').serialize().cluster,failure:!!document.querySelector('.vector-map-error')}));
  expect(result).toMatchObject({engine:'openfreemap-fast',features:3,cluster:true,failure:false});
  expect(result.layers).toBeLessThanOrEqual(30);
});

test('multi-type filtering updates the single map source',async({page})=>{
  await openFast(page);
  await page.locator('.map-type-current').click();
  await page.getByRole('button',{name:'Shops',exact:true}).click();
  await page.getByRole('button',{name:'Apartments',exact:true}).click();
  await expect(page.locator('.listing-card')).toHaveCount(2);
  await expect.poll(()=>page.evaluate(()=>window.__vacancyStage96.rawMap().getSource('vacancy-listings').serialize().data.features.length)).toBe(2);
});

test('canvas listing selection stays synchronized with the listing rail',async({page})=>{
  await openFast(page,12);
  await page.waitForFunction(()=>window.__vacancyStage96.rawMap().queryRenderedFeatures({layers:['vacancy-listing-points']}).length>=2);
  const target=await page.evaluate(()=>{const map=window.__vacancyStage96.rawMap();const f=map.queryRenderedFeatures({layers:['vacancy-listing-points']})[0];const p=map.project(f.geometry.coordinates);const r=map.getContainer().getBoundingClientRect();return {x:r.left+p.x,y:r.top+p.y,id:String(f.properties.id)}});
  await page.mouse.click(target.x,target.y);
  await expect(page.locator(`[data-card-id="${target.id}"]`)).toHaveClass(/selected/);
  expect(await page.evaluate(id=>window.__vacancyStage96.rawMap().getFeatureState({source:'vacancy-listings',id}).selected,target.id)).toBe(true);
});

test('theme swap restores the optimized source without moving the viewport',async({page})=>{
  await openFast(page,12);
  const before=await page.evaluate(()=>({center:exploreMap.getCenter(),count:window.__vacancyStage96.rawMap().getSource('vacancy-listings').serialize().data.features.length}));
  await page.locator('#themeToggle').click();
  await page.waitForFunction(expected=>document.documentElement.dataset.theme==='dark'&&window.__vacancyStage96.activeStyle.includes('/dark')&&window.__vacancyStage96.rawMap().getSource('vacancy-listings')?.serialize().data?.features?.length===expected,before.count);
  const after=await page.evaluate(()=>exploreMap.getCenter());
  expect(Math.abs(after.lat-before.center.lat)).toBeLessThan(.001);
  expect(Math.abs(after.lng-before.center.lng)).toBeLessThan(.001);
});

test('mobile fast map has no sideways movement and controls remain reachable',async({page})=>{
  await page.setViewportSize({width:390,height:844}); await openFast(page);
  await expect(page.locator('.map-type-current')).toBeVisible();
  await expect(page.locator('#searchBtn')).toBeVisible();
  const dimensions=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,map:document.querySelector('#exploreMap').getBoundingClientRect().width}));
  expect(dimensions.page).toBe(dimensions.viewport); expect(dimensions.map).toBeLessThanOrEqual(dimensions.viewport);
});