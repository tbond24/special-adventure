const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';
const image=colour=>`data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="${colour}"/></svg>`;
const base={id:'stage95-room-a',rentAmount:25000,rentCurrency:'KES',rentPeriod:'month',deposit:10000,updatedAt:new Date().toISOString(),availableFrom:'2026-01-01',room:{name:'Kilimani room',roomType:'Room',description:'Quiet room',media:[{url:image('orange')},{url:image('blue')}],furnished:true,ensuite:false,maxOccupants:1},property:{id:'stage95-property-a',suburb:'Kilimani',city:'Nairobi',country:'Kenya',propertyType:'House',parkingSpaces:0,securityAvailable:true,internetAvailable:true,waterAvailable:true,electricityAvailable:true,petsConsidered:false,smokingAllowed:false,publicLatitude:-1.2921,publicLongitude:36.7831,customFeatures:[]},owner:{id:'owner-one',displayName:'Amina Homes'}};
const rows=[base,{...base,id:'stage95-room-b',room:{...base.room,name:'Westlands apartment',roomType:'Apartment'},property:{...base.property,id:'stage95-property-b',suburb:'Westlands',propertyType:'Apartment',publicLatitude:-1.2676,publicLongitude:36.8108}},{...base,id:'stage95-shop',room:{...base.room,name:'Mombasa shop',roomType:'Shop'},property:{...base.property,id:'stage95-property-c',suburb:'Mombasa',city:'Mombasa',propertyType:'Shop',publicLatitude:-4.0435,publicLongitude:39.6682}}];

async function openLite(page){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/?map=vacancy-lite#home`);
  await page.waitForFunction(()=>booting===false&&window.__vacancyStage95?.engine==='vacancy-lite');
  await page.evaluate(value=>{vacancies=value;displayCurrency='KES';renderHome();exploreMap.setView([-2.1,38.1],6,{animate:false})},rows);
  await page.waitForFunction(()=>document.querySelectorAll('#exploreMap svg path').length>100&&document.querySelectorAll('.map-region-count').length>0);
}

test('Vacancy Lite is isolated from the working Leaflet and MapLibre routes',async({page})=>{
  await page.goto(`${APP}/#home`); await page.waitForFunction(()=>booting===false);
  expect(await page.evaluate(()=>document.documentElement.dataset.mapEngine||'leaflet')).toBe('leaflet');
  await expect(page.locator('.vacancy-lite-map')).toHaveCount(0);
  await page.goto(`${APP}/?map=vacancy-lite#home`); await page.waitForFunction(()=>window.__vacancyStage95?.engine==='vacancy-lite');
  await expect(page.locator('.vacancy-lite-map')).toHaveCount(1);
  await expect(page.locator('.maplibregl-map')).toHaveCount(0);
});

test('regional mode uses local country outlines and no street tiles',async({page})=>{
  await openLite(page);
  expect(await page.evaluate(()=>window.__vacancyStage95.activeBasemap())).toBe('regions');
  await expect.poll(()=>page.locator('#exploreMap svg path').count()).toBeGreaterThan(100);
  await expect(page.locator('#exploreMap .leaflet-tile')).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Natural Earth'})).toBeVisible();
  expect(await page.locator('.map-region-count').evaluateAll(nodes=>nodes.reduce((sum,node)=>sum+Number(node.textContent),0))).toBe(3);
});

test('city zoom loads street tiles and zooming out removes them',async({page})=>{
  await openLite(page);
  await page.evaluate(()=>exploreMap.setView([-1.2864,36.8172],12,{animate:false}));
  await expect.poll(()=>page.evaluate(()=>window.__vacancyStage95.activeBasemap())).toBe('streets');
  await expect.poll(()=>page.locator('#exploreMap .leaflet-tile').count()).toBeGreaterThan(0);
  await expect(page.getByRole('link',{name:'OpenStreetMap'})).toBeVisible();
  await page.evaluate(()=>exploreMap.setZoom(6,{animate:false}));
  await expect.poll(()=>page.evaluate(()=>window.__vacancyStage95.activeBasemap())).toBe('regions');
  await expect(page.locator('#exploreMap .leaflet-tile')).toHaveCount(0);
  await expect.poll(()=>page.locator('#exploreMap svg path').count()).toBeGreaterThan(100);
});

test('regional count drill-in reaches individual listing markers',async({page})=>{
  await openLite(page);
  await page.locator('.map-region-count').first().click();
  await expect.poll(()=>page.evaluate(()=>exploreMap.getZoom())).toBeGreaterThan(8);
  await expect.poll(()=>page.evaluate(()=>window.__vacancyStage95.activeBasemap())).toBe('streets');
  await expect(page.locator('.map-region-count')).toHaveCount(0);
  await expect(page.locator('.vacancy-marker')).not.toHaveCount(0);
});

test('mobile Lite view remains within the viewport and keeps controls reachable',async({page})=>{
  await page.setViewportSize({width:390,height:844}); await openLite(page);
  await expect(page.locator('.map-type-current')).toBeVisible();
  await expect(page.locator('#searchBtn')).toBeVisible();
  const dimensions=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,map:document.querySelector('#exploreMap').getBoundingClientRect().width}));
  expect(dimensions.page).toBe(dimensions.viewport);
  expect(dimensions.map).toBeLessThanOrEqual(dimensions.viewport);
});
