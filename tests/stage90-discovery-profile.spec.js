const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';
const image=colour=>`data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="${colour}"/></svg>`;
const base={id:'stage90-room',rentAmount:25000,rentCurrency:'KES',rentPeriod:'month',deposit:10000,updatedAt:new Date().toISOString(),availableFrom:'2026-01-01',room:{name:'Kilimani room',roomType:'Room',description:'Quiet room',media:[{url:image('orange')},{url:image('blue')}],furnished:true,ensuite:false,maxOccupants:1},property:{id:'stage90-property',suburb:'Kilimani',city:'Nairobi',country:'Kenya',propertyType:'House',parkingSpaces:0,securityAvailable:true,internetAvailable:true,waterAvailable:true,electricityAvailable:true,petsConsidered:false,smokingAllowed:false,publicLatitude:-1.2921,publicLongitude:36.7831,customFeatures:[]},owner:{id:'owner-one',displayName:'Amina Homes',avatarUrl:image('purple')}};
const rows=[
  base,
  {...base,id:'stage90-onebed',room:{...base.room,name:'Westlands one bedroom',roomType:'1 Bedroom'},property:{...base.property,id:'stage90-property-two',propertyType:'Apartment',publicLatitude:-1.286,publicLongitude:36.79}},
  {...base,id:'stage90-shop',room:{...base.room,name:'Central shop',roomType:'Shop'},property:{...base.property,id:'stage90-shop-property',propertyType:'Shop',publicLatitude:-1.29,publicLongitude:36.80},owner:{id:'owner-two',displayName:'Nia Commercial'}}
];
async function open(page){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(value=>{vacancies=value;displayCurrency='KES';renderHome();exploreMap.setView([-1.292,36.79],12,{animate:false})},rows);
}
test('property types support multiple selections, stay open and close on tap-away',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await open(page);
  const current=page.locator('.map-type-current'),choices=page.locator('#mapTypeChoices');
  await current.click();
  await page.getByRole('button',{name:'Rooms',exact:true}).click();
  await expect(choices).toBeVisible();
  await page.getByRole('button',{name:'1 bedroom',exact:true}).click();
  await expect(choices).toBeVisible();
  await expect(page.locator('.listing-card')).toHaveCount(2);
  await expect(current).toHaveAttribute('data-map-types',/room/);
  await expect(current).toHaveAttribute('data-map-types',/1bed/);
  await expect(current.locator('.map-type-current-icons .control-icon')).toHaveCount(2);
  const stroke=await current.locator('.control-icon').first().evaluate(node=>getComputedStyle(node).stroke);
  expect(stroke).toBe('rgb(255, 255, 255)');
  await page.locator('#resultCount').click();
  await expect(choices).toBeHidden();
});
test('search suggestions are compact, one-line place labels',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route('**/api/geocode?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({suggestions:[{lat:-1.2864,lon:36.8172,label:'Nairobi, Kenya, 00100'}]})}));
  await open(page);
  await page.locator('#searchBtn').click();
  await page.locator('#q').fill('nair');
  const option=page.getByRole('option');
  await expect(option).toHaveText('Nairobi, Kenya, 00100');
  const metrics=await option.evaluate(node=>({height:node.getBoundingClientRect().height,line:parseFloat(getComputedStyle(node).lineHeight),whiteSpace:getComputedStyle(node).whiteSpace,overflow:getComputedStyle(node).overflow}));
  expect(metrics.whiteSpace).toBe('nowrap');
  expect(metrics.height).toBeLessThan(metrics.line*2.1);
});
test('touch gallery uses native scrolling while mouse drag remains available',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await open(page);
  await page.evaluate(()=>{discoveryView='list';applyDiscoveryView()});
  const gallery=page.locator('.list-view .listing-card [data-gallery]').first();
  await gallery.dispatchEvent('pointerdown',{pointerId:8,pointerType:'touch',button:0,clientX:250});
  await expect(gallery).not.toHaveClass(/is-swiping/);
  const width=await gallery.evaluate(node=>{node.scrollTo({left:node.clientWidth,behavior:'instant'});return node.clientWidth});
  await expect.poll(()=>gallery.evaluate(node=>node.scrollLeft)).toBeGreaterThan(width*.8);
  await expect(page.locator('.gallery-counter').first()).toHaveText('2/2');
  await expect(page).toHaveURL(/#home$/);
});
test('detail uses Message, an interactive map and a linked lister profile',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await open(page);
  await page.evaluate(value=>{vacancies=value;renderDetail('stage90-room')},rows);
  await expect(page.getByRole('button',{name:'Message lister'})).toBeVisible();
  const mapState=await page.locator('#detailLocationMap').evaluate(node=>({dragging:node._vacancyMap.dragging.enabled(),touch:node._vacancyMap.touchZoom.enabled(),doubleClick:node._vacancyMap.doubleClickZoom.enabled(),keyboard:node._vacancyMap.keyboard.enabled(),zoom:node._vacancyMap.getZoom()}));
  expect(mapState).toMatchObject({dragging:true,touch:true,doubleClick:true,keyboard:true});
  await page.locator('.leaflet-control-zoom-in').click();
  await expect.poll(()=>page.locator('#detailLocationMap').evaluate(node=>node._vacancyMap.getZoom())).toBe(mapState.zoom+1);
  const profile=page.locator('.listing-lister-card');
  await expect(profile).toContainText('Amina Homes');
  await expect(profile.locator('img')).toHaveCount(1);
  await profile.click();
  await expect(page).toHaveURL(/#lister\/owner-one$/);
  await expect(page.getByRole('heading',{name:'Amina Homes'})).toBeVisible();
  await expect(page.getByText('Not available yet')).toBeVisible();
  await expect(page.locator('#listerListings .listing-card')).toHaveCount(2);
  await expect(page.locator('#listerListings')).not.toContainText('Central shop');
});
test('mobile Stage 90 pages have no sideways overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await open(page);
  await page.evaluate(value=>{vacancies=value;renderDetail('stage90-room')},rows);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.locator('.listing-lister-card').click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
test('geocoder reduces provider detail to locality, region, country and postcode',async()=>{
  const handler=require('../app/api/geocode.js'),priorFetch=global.fetch;
  global.fetch=async()=>({ok:true,json:async()=>[{lat:'-1.2864',lon:'36.8172',name:'Nairobi',display_name:'Nairobi, Starehe, Nairobi County, Kenya, Africa, a very long provider result',addresstype:'city',address:{city:'Nairobi',state:'Nairobi County',country:'Kenya',postcode:'00100'}}]});
  const result=await new Promise((resolve,reject)=>{const res={setHeader(){},status(code){this.code=code;return this},json(body){resolve({code:this.code,body})}};Promise.resolve(handler({method:'GET',query:{q:'nair',suggest:'1'}},res)).catch(reject)});
  global.fetch=priorFetch;
  expect(result).toEqual({code:200,body:{suggestions:[{lat:-1.2864,lon:36.8172,label:'Nairobi, Kenya, 00100'}]}});
});
