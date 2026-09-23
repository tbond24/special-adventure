const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';
const image=colour=>`data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="${colour}"/></svg>`;
const base={id:'stage91-room-a',rentAmount:25000,rentCurrency:'KES',rentPeriod:'month',deposit:10000,updatedAt:new Date().toISOString(),availableFrom:'2026-01-01',room:{name:'Kilimani room',roomType:'Room',description:'Quiet room',media:[{url:image('orange')},{url:image('blue')},{url:image('green')}],furnished:true,ensuite:false,maxOccupants:1},property:{id:'stage91-property-a',suburb:'Kilimani',city:'Nairobi',country:'Kenya',propertyType:'House',parkingSpaces:0,securityAvailable:true,internetAvailable:true,waterAvailable:true,electricityAvailable:true,petsConsidered:false,smokingAllowed:false,publicLatitude:-1.2921,publicLongitude:36.7831,customFeatures:[]},owner:{id:'owner-one',displayName:'Amina Homes'}};
const rows=[
  base,
  {...base,id:'stage91-room-b',room:{...base.room,name:'Westlands room'},property:{...base.property,id:'stage91-property-b',suburb:'Westlands',publicLatitude:-1.2676,publicLongitude:36.8108}},
  {...base,id:'stage91-shop',room:{...base.room,name:'Mombasa shop',roomType:'Shop'},property:{...base.property,id:'stage91-property-c',suburb:'Mombasa',city:'Mombasa',propertyType:'Shop',publicLatitude:-4.0435,publicLongitude:39.6682}}
];
async function open(page){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(value=>{vacancies=value;displayCurrency='KES';renderHome();exploreMap.setView([-2.1,38.1],6,{animate:false})},rows);
  await page.waitForTimeout(180);
}

test('low zoom shows real filtered inventory counts and count click drills in',async({page})=>{
  await open(page);
  await expect(page.locator('.map-region-count')).not.toHaveCount(0);
  const sum=await page.locator('.map-region-count').evaluateAll(nodes=>nodes.reduce((total,node)=>total+Number(node.textContent),0));
  expect(sum).toBe(3);
  await page.locator('.map-type-current').click();
  await page.getByRole('button',{name:'Shops',exact:true}).click();
  await expect.poll(()=>page.locator('.map-region-count').evaluateAll(nodes=>nodes.reduce((total,node)=>total+Number(node.textContent),0))).toBe(1);
  await expect(page.locator('.listing-card')).toHaveCount(1);
  await page.locator('.map-region-count').first().click();
  await expect.poll(()=>page.evaluate(()=>exploreMap.getZoom())).toBeGreaterThan(8);
  await expect(page.locator('.map-region-count')).toHaveCount(0);
});

test('gallery arrows are transparent, centred, and move exactly one image both ways',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await open(page);
  const visual=page.locator('.listing-visual').first(),gallery=visual.locator('[data-gallery]');
  const next=visual.getByRole('button',{name:'Next listing image'}),previous=visual.getByRole('button',{name:'Previous listing image'});
  await expect(next).toBeVisible();
  const geometry=await Promise.all([visual,next].map(locator=>locator.boundingBox()));
  expect(Math.abs((geometry[1].y+geometry[1].height/2)-(geometry[0].y+geometry[0].height/2))).toBeLessThan(2);
  expect(await next.evaluate(node=>getComputedStyle(node).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await next.click();
  await expect.poll(()=>gallery.evaluate(node=>Math.round(node.scrollLeft/node.clientWidth))).toBe(1);
  await expect(visual.locator('.gallery-counter')).toHaveText('2/3');
  await previous.click();
  await expect.poll(()=>gallery.evaluate(node=>Math.round(node.scrollLeft/node.clientWidth))).toBe(0);
  await expect(visual.locator('.gallery-counter')).toHaveText('1/3');
});

test('mouse drag settles without a second competing snap',async({page})=>{
  await open(page);
  await page.evaluate(()=>{discoveryView='list';applyDiscoveryView()});
  const gallery=page.locator('.list-view [data-gallery]').first();
  await gallery.scrollIntoViewIfNeeded();
  const box=await gallery.boundingBox();
  await page.mouse.move(box.x+box.width*.8,box.y+box.height/2);await page.mouse.down();
  await page.mouse.move(box.x+box.width*.15,box.y+box.height/2,{steps:6});await page.mouse.up();
  await expect.poll(()=>gallery.evaluate(node=>Math.abs(node.scrollLeft-node.clientWidth))).toBeLessThanOrEqual(1);
  await page.waitForTimeout(350);
  expect(await gallery.evaluate(node=>Math.abs(node.scrollLeft-node.clientWidth))).toBeLessThanOrEqual(1);
  await expect(page).toHaveURL(/#home$/);
});

test('gear toggles use consistent compact spacing',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await open(page);
  await page.locator('#filtersToggle').click();
  const switches=page.locator('#discoveryFilters .primary-filters>.filter-switch');
  await expect(switches).toHaveCount(3);
  const boxes=await switches.evaluateAll(nodes=>nodes.map(node=>{const box=node.getBoundingClientRect();return{top:box.top,bottom:box.bottom,height:box.height}}));
  expect(Math.max(...boxes.map(box=>box.height))-Math.min(...boxes.map(box=>box.height))).toBeLessThanOrEqual(1);
  const gaps=boxes.slice(1).map((box,index)=>box.top-boxes[index].bottom);
  expect(Math.max(...gaps)-Math.min(...gaps)).toBeLessThanOrEqual(1);
});

test('Saved and Inbox footers stay at the bottom of a short mobile screen',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await open(page);
  const saved=await page.evaluate(()=>{history.replaceState(null,'','#saved');currentUser={id:'viewer',email:'viewer@example.com'};saved.clear();renderSaved();return{bottom:document.querySelector('.site-footer').getBoundingClientRect().bottom,height:innerHeight}});
  expect(saved.bottom).toBeGreaterThanOrEqual(saved.height-80);
  const inbox=await page.evaluate(async()=>{history.replaceState(null,'','#messages');VACANCY_BACKEND.conversations=async()=>[];await renderMessages();return{bottom:document.querySelector('.site-footer').getBoundingClientRect().bottom,height:innerHeight}});
  expect(inbox.bottom).toBeGreaterThanOrEqual(inbox.height-80);
});

test('partial location typing suggests matching Vacancy inventory without another provider',async({page})=>{
  await page.route('**/api/geocode?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({suggestions:[]})}));
  await open(page);
  await page.locator('#searchBtn').click();
  await page.locator('#q').fill('nairo');
  const option=page.getByRole('option',{name:'Nairobi, Kenya',exact:true});
  await expect(option).toBeVisible();
  await option.click();
  await expect.poll(()=>page.evaluate(()=>Math.round(exploreMap.getCenter().lat*1000)/1000)).toBe(-1.292);
});
test('geocoder removes duplicates, POIs, and irrelevant fuzzy matches',async()=>{
  const handler=require('../app/api/geocode.js'),priorFetch=global.fetch;
  global.fetch=async()=>({ok:true,json:async()=>[
    {lat:'-1.2864',lon:'36.8172',name:'Nairobi',display_name:'Nairobi, Kenya',addresstype:'city',class:'place',address:{city:'Nairobi',country:'Kenya',postcode:'00100'}},
    {lat:'-1.2865',lon:'36.8173',name:'Nairobi',display_name:'Nairobi, Kenya duplicate',addresstype:'city',class:'place',address:{city:'Nairobi',country:'Kenya',postcode:'00100'}},
    {lat:'46.63',lon:'142.78',name:'Gastello',display_name:'Gastello, Sakhalin, Russia',addresstype:'village',class:'place',address:{village:'Gastello',country:'Russia',postcode:'694210'}},
    {lat:'-1.312',lon:'36.8',name:'The Nairobi West Hospital',display_name:'The Nairobi West Hospital, Nairobi, Kenya',addresstype:'amenity',class:'amenity',address:{city:'Nairobi',country:'Kenya'}},
    {lat:'-1.31',lon:'36.81',name:'Nairobi West',display_name:'Nairobi West, Nairobi, Kenya',addresstype:'suburb',class:'place',address:{suburb:'Nairobi West',city:'Nairobi',country:'Kenya',postcode:'00509'}}
  ]});
  const result=await new Promise((resolve,reject)=>{const res={setHeader(){},status(code){this.code=code;return this},json(body){resolve({code:this.code,body})}};Promise.resolve(handler({method:'GET',query:{q:'nairo',suggest:'1'}},res)).catch(reject)});
  global.fetch=priorFetch;
  expect(result.code).toBe(200);
  expect(result.body.suggestions).toEqual([
    {lat:-1.2864,lon:36.8172,label:'Nairobi, Kenya, 00100'},
    {lat:-1.31,lon:36.81,label:'Nairobi West, Nairobi, Kenya, 00509'}
  ]);
});


