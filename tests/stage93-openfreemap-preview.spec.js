const {test,expect}=require('@playwright/test');

const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';
const image=colour=>`data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="${colour}"/></svg>`;
const base={id:'stage93-room-a',rentAmount:25000,rentCurrency:'KES',rentPeriod:'month',deposit:10000,updatedAt:new Date().toISOString(),availableFrom:'2026-01-01',room:{name:'Kilimani room',roomType:'Room',description:'Quiet room',media:[{url:image('orange')},{url:image('blue')}],furnished:true,ensuite:false,maxOccupants:1},property:{id:'stage93-property-a',suburb:'Kilimani',city:'Nairobi',country:'Kenya',propertyType:'House',parkingSpaces:0,securityAvailable:true,internetAvailable:true,waterAvailable:true,electricityAvailable:true,petsConsidered:false,smokingAllowed:false,publicLatitude:-1.2921,publicLongitude:36.7831,customFeatures:[]},owner:{id:'owner-one',displayName:'Amina Homes'}};
const rows=[
  base,
  {...base,id:'stage93-room-b',room:{...base.room,name:'Westlands apartment',roomType:'Apartment'},property:{...base.property,id:'stage93-property-b',suburb:'Westlands',propertyType:'Apartment',publicLatitude:-1.2676,publicLongitude:36.8108}},
  {...base,id:'stage93-shop',room:{...base.room,name:'Mombasa shop',roomType:'Shop'},property:{...base.property,id:'stage93-property-c',suburb:'Mombasa',city:'Mombasa',propertyType:'Shop',publicLatitude:-4.0435,publicLongitude:39.6682}}
];

async function openVector(page){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/?map=openfreemap#home`);
  await page.waitForFunction(()=>window.__vacancyStage93?.ready===true);
  await page.evaluate(value=>{vacancies=value;displayCurrency='KES';renderHome();exploreMap.setView([-2.1,38.1],6)},rows);
  await page.waitForFunction(()=>window.__vacancyStage93?.ready===true&&document.querySelectorAll('.vector-region-marker').length>0);
}

test('vector map is isolated and keeps the current Leaflet route unchanged',async({page})=>{
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);
  await page.waitForFunction(()=>booting===false);
  await expect(page.locator('.leaflet-container')).toHaveCount(1);
  await expect(page.locator('.maplibregl-map')).toHaveCount(0);
  expect(await page.evaluate(()=>window.__vacancyStage93)).toBeUndefined();
});

test('OpenFreeMap preview loads with visible attribution and no built-in zoom controls',async({page})=>{
  await openVector(page);
  await expect(page.locator('.maplibregl-map')).toHaveCount(1);
  await expect(page.getByRole('link',{name:'OpenFreeMap'})).toBeVisible();
  await expect(page.locator('.maplibregl-ctrl-zoom-in,.maplibregl-ctrl-zoom-out')).toHaveCount(0);
  expect(await page.evaluate(()=>({engine:exploreMap.engine,style:window.__vacancyStage93.rawMap().getStyle().name||'',failure:!!document.querySelector('.vector-map-error')}))).toMatchObject({engine:'openfreemap',failure:false});
});

test('regional counts, multi-type filtering and listing markers retain Vacancy behavior',async({page})=>{
  await openVector(page);
  const sum=await page.locator('.vector-region-marker span').evaluateAll(nodes=>nodes.reduce((total,node)=>total+Number(node.textContent),0));
  expect(sum).toBe(3);
  await page.locator('.map-type-current').click();
  await page.getByRole('button',{name:'Shops',exact:true}).click();
  await page.getByRole('button',{name:'Apartments',exact:true}).click();
  await expect(page.locator('.listing-card')).toHaveCount(2);
  await expect.poll(()=>page.locator('.vector-region-marker span').evaluateAll(nodes=>nodes.reduce((total,node)=>total+Number(node.textContent),0))).toBe(2);
  await page.locator('.vector-region-marker').first().evaluate(element=>element.click());
  await expect.poll(()=>page.evaluate(()=>exploreMap.getZoom())).toBeGreaterThan(8);
  await expect(page.locator('.vector-listing-marker')).not.toHaveCount(0);
});

test('marker selection stays synchronized with the listing rail',async({page})=>{
  await openVector(page);
  await page.evaluate(()=>exploreMap.setView([-1.28,36.8],12));
  await expect(page.locator('.vector-listing-marker')).toHaveCount(2);
  await expect(page.locator('[data-card-id]')).toHaveCount(2);
  await page.locator('.vector-listing-marker').nth(1).click();
  const selectedId=await page.locator('.vector-listing-marker.selected').getAttribute('data-vacancy-id');
  await expect(page.locator(`[data-card-id="${selectedId}"]`)).toHaveClass(/selected/);
});

test('theme swap preserves the viewport and restores Vacancy overlays',async({page})=>{
  await openVector(page);
  await page.evaluate(()=>exploreMap.setView([-1.2864,36.8172],12));
  const before=await page.evaluate(()=>exploreMap.getCenter());
  await page.locator('#themeToggle').click();
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark'&&window.__vacancyStage93.activeStyle.includes('/dark')&&window.__vacancyStage93.rawMap().isStyleLoaded());
  await expect(page.locator('.vector-listing-marker')).not.toHaveCount(0);
  const after=await page.evaluate(()=>exploreMap.getCenter());
  expect(Math.abs(after.lat-before.lat)).toBeLessThan(.001);
  expect(Math.abs(after.lng-before.lng)).toBeLessThan(.001);
});

test('mobile preview has no sideways page movement and controls remain reachable',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await openVector(page);
  await expect(page.locator('.map-type-current')).toBeVisible();
  await expect(page.locator('#searchBtn')).toBeVisible();
  const dimensions=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,map:document.querySelector('#exploreMap').getBoundingClientRect().width}));
  expect(dimensions.page).toBe(dimensions.viewport);
  expect(dimensions.map).toBeLessThanOrEqual(dimensions.viewport);
});
