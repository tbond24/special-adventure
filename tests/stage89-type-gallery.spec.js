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

test('property types wrap below the header and selected type is solidly filled',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await open(page);
  await page.locator('.map-type-current').click();
  const positions=await page.locator('.map-type-choices button').evaluateAll(buttons=>buttons.slice(0,3).map(button=>{const box=button.getBoundingClientRect();return{x:box.x,y:box.y,width:box.width}}));
  expect(positions[1].x).toBeGreaterThan(positions[0].x);
  expect(Math.abs(positions[1].y-positions[0].y)).toBeLessThan(2);
  expect(positions[2].y).toBeGreaterThan(positions[0].y);
  const headerBottom=await page.locator('.topbar').evaluate(node=>node.getBoundingClientRect().bottom);
  expect(positions[0].y).toBeGreaterThan(headerBottom);
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

test('card status, category, and save icon remain legible in both views',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await open(page);
  const home=page.locator('.listing-card').filter({hasText:'Kilimani'}).first();
  await expect(home.locator('.fresh')).toHaveText('Available now');
  const metrics=await home.evaluate(node=>({radius:getComputedStyle(node).borderTopLeftRadius,heart:node.querySelector('.heart-action .nav-icon').getBoundingClientRect().width,category:getComputedStyle(node.querySelector('.listing-category-title')).color}));
  expect(metrics.radius).toBe('9px');
  expect(metrics.heart).toBe(19);
  expect(metrics.category).not.toBe('rgb(17, 17, 17)');
  await page.evaluate(()=>{discoveryView='list';applyDiscoveryView()});
  await expect(page.locator('.list-view .listing-card').first()).toHaveCSS('border-top-left-radius','9px');
});
