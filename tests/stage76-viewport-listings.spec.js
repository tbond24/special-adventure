const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

const image=colour=>`data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="${colour}"/></svg>`;
const base={id:'room-near',rentAmount:25000,rentCurrency:'KES',rentPeriod:'month',deposit:10000,updatedAt:new Date().toISOString(),availableFrom:'2026-01-01',room:{name:'Near room',roomType:'Room',media:[{url:image('orange')},{url:image('blue')}],furnished:true,ensuite:false,maxOccupants:1},property:{id:'property-one',suburb:'Kilimani',city:'Nairobi',country:'Kenya',propertyType:'House',parkingSpaces:0,securityAvailable:true,internetAvailable:true,waterAvailable:true,electricityAvailable:true,petsConsidered:false,smokingAllowed:false,publicLatitude:-1.2921,publicLongitude:36.7831,customFeatures:[]},owner:{id:'owner-one',displayName:'Lister'}};
const rows=[
  base,
  {...base,id:'one-bed-near',room:{...base.room,name:'Nearby one bedroom',roomType:'1 Bedroom'},property:{...base.property,id:'property-two',propertyType:'Apartment',publicLatitude:-1.296,publicLongitude:36.79}},
  {...base,id:'shop-far',room:{...base.room,name:'Ruiru shop',roomType:'Shop'},property:{...base.property,id:'property-three',suburb:'Ruiru',propertyType:'Shop',publicLatitude:-1.145,publicLongitude:36.96}}
];

async function open(page){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(value=>{vacancies=value;displayCurrency='KES';renderHome()},rows);
}

test('visible listings follow the live map viewport',async({page})=>{
  await open(page);
  await page.evaluate(()=>exploreMap.setView([-1.2921,36.7831],14,{animate:false}));
  await expect(page.locator('.listing-card')).toHaveCount(2);
  await expect(page.locator('#resultCount')).toContainText('2 vacancies in this map area');
  await page.evaluate(()=>exploreMap.setView([-1.22,36.86],9,{animate:false}));
  await expect(page.locator('.listing-card')).toHaveCount(3);
  await expect(page.locator('.vacancy-marker')).toHaveCount(3);
});

test('bottom-left property type selector filters rooms, bedrooms and shops',async({page})=>{
  await open(page);
  await page.evaluate(()=>exploreMap.setView([-1.22,36.86],9,{animate:false}));
  await page.locator('.map-type-current').click();
  await page.getByRole('button',{name:'Shops',exact:true}).click();
  await expect(page.locator('.listing-card')).toHaveCount(1);
  await expect(page.locator('.listing-card')).toHaveAttribute('aria-label','Open Ruiru shop');
  await page.locator('.map-type-current').click();
  await page.getByRole('button',{name:'1 bedroom',exact:true}).click();
  await expect(page.locator('.listing-card')).toHaveCount(1);
  await expect(page.locator('.listing-card')).toContainText('1 Bedroom');
});

test('round search action expands left and focuses the text field in one tap',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await open(page);
  const panel=page.locator('.map-search-panel');
  const input=page.locator('#q');
  await expect(panel).not.toHaveClass(/search-expanded/);
  await page.locator('#searchBtn').click();
  await expect(panel).toHaveClass(/search-expanded/);
  await expect(input).toBeFocused();
  const shape=await page.locator('#searchBtn').evaluate(node=>({width:node.getBoundingClientRect().width,radius:getComputedStyle(node).borderRadius}));
  expect(shape.width).toBe(42);
  expect(shape.radius).toBe('50%');
});

test('square visual cards use 4:3 media, bold prices and retain swipe galleries',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await open(page);
  await page.evaluate(()=>exploreMap.setView([-1.2921,36.7831],14,{animate:false}));
  const card=page.locator('.listing-card').first();
  const metrics=await card.evaluate(node=>{const slide=node.querySelector('.listing-slide'),price=node.querySelector('.listing-price'),rect=slide.getBoundingClientRect();return{radius:getComputedStyle(node).borderRadius,ratio:rect.width/rect.height,weight:Number(getComputedStyle(price).fontWeight),padding:getComputedStyle(node.querySelector('.card-body')).padding}});
  expect(metrics.radius).toBe('0px');
  expect(metrics.ratio).toBeCloseTo(4/3,1);
  expect(metrics.weight).toBeGreaterThanOrEqual(700);
  expect(parseFloat(metrics.padding)).toBeLessThanOrEqual(9);
  const gallery=card.locator('[data-gallery]');
  const scroll=await gallery.evaluate(node=>{node.scrollLeft=node.clientWidth;node.dispatchEvent(new Event('scroll'));return{left:node.scrollLeft,width:node.clientWidth}});
  expect(scroll.left).toBeGreaterThan(scroll.width*.8);
});

test('listing detail uses a compact map info control and a bottom report row',async({page})=>{
  await open(page);
  await page.evaluate(value=>{vacancies=value;renderDetail('room-near')},rows);
  await expect(page.locator('.detail-map-card #detailLocationMap')).toBeVisible();
  const mapSize=await page.locator('#detailLocationMap').evaluate(node=>node.getBoundingClientRect().width);
  expect(mapSize).toBeLessThanOrEqual(56.5);
  await expect(page.locator('.detail-location-info')).toHaveAttribute('aria-label','About this map location');
  const report=page.locator('.detail-report-row');
  await expect(report).toContainText('Report listing');
  expect(await report.evaluate(node=>node.compareDocumentPosition(document.querySelector('.listing-detail-sections'))&Node.DOCUMENT_POSITION_PRECEDING)).toBeTruthy();
  await expect(page.locator('.detail-gallery .detail-report-row')).toHaveCount(0);
  await expect(page.locator('.detail-price-line .price')).toHaveCSS('color','rgb(21, 128, 61)');
});
