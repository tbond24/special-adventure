const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';
const image=colour=>`data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="${colour}"/></svg>`;
const base={id:'stage89-room',rentAmount:25000,rentCurrency:'KES',rentPeriod:'month',deposit:10000,updatedAt:new Date().toISOString(),availableFrom:'2026-01-01',room:{name:'Swipe room',roomType:'Room',media:[{url:image('orange')},{url:image('blue')}],furnished:true,ensuite:false,maxOccupants:1},property:{id:'stage89-property',suburb:'Kilimani',city:'Nairobi',country:'Kenya',propertyType:'House',parkingSpaces:0,securityAvailable:true,internetAvailable:true,waterAvailable:true,electricityAvailable:true,petsConsidered:false,smokingAllowed:false,publicLatitude:-1.2921,publicLongitude:36.7831,customFeatures:[]},owner:{id:'owner-one',displayName:'Lister'}};
const shop={...base,id:'stage89-shop',room:{...base.room,name:'Swipe shop',roomType:'Shop'},property:{...base.property,id:'stage89-shop-property',propertyType:'Shop',publicLatitude:-1.29,publicLongitude:36.79}};

async function open(page){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(rows=>{vacancies=rows;displayCurrency='KES';renderHome();exploreMap.setView([-1.2921,36.785],13,{animate:false})},[base,shop]);
}

test('property types open vertically and selected type is solidly filled',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await open(page);
  await page.locator('.map-type-current').click();
  const positions=await page.locator('.map-type-choices button').evaluateAll(buttons=>buttons.slice(0,3).map(button=>{const box=button.getBoundingClientRect();return{x:box.x,y:box.y,width:box.width}}));
  expect(Math.max(...positions.map(item=>item.x))-Math.min(...positions.map(item=>item.x))).toBeLessThan(2);
  expect(positions[1].y).toBeGreaterThan(positions[0].y);
  expect(positions[2].y).toBeGreaterThan(positions[1].y);
  await page.getByRole('button',{name:'Shops',exact:true}).click();
  await expect(page.locator('.listing-card')).toHaveCount(1);
  await expect(page.locator('#mapTypeChoices')).toBeVisible();
  const selected=page.locator('#mapTypeChoices').getByRole('button',{name:'Shops',exact:true});
  await expect(selected).toHaveAttribute('aria-pressed','true');
  const colours=await selected.evaluate(node=>({background:getComputedStyle(node).backgroundColor,color:getComputedStyle(node).color}));
  expect(colours.background).not.toBe('rgba(0, 0, 0, 0)');
  await expect(page.locator('.map-type-current')).toHaveClass(/has-selection/);
});

test('dragging a list-card image moves to the next image without opening the listing',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await open(page);
  await page.evaluate(()=>{discoveryView='list';applyDiscoveryView()});
  const gallery=page.locator('.list-view .listing-card [data-gallery]').first();
  const box=await gallery.boundingBox();
  await page.mouse.move(box.x+box.width*.8,box.y+box.height/2);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*.15,box.y+box.height/2,{steps:6});
  await page.mouse.up();
  await expect.poll(()=>gallery.evaluate(node=>node.scrollLeft)).toBeGreaterThan(box.width*.8);
  await expect(page.locator('.gallery-counter').first()).toHaveText('2/2');
  await expect(page).toHaveURL(/#home$/);
});
