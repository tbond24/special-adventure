const {test, expect} = require('@playwright/test');
const APP = process.env.VACANCY_E2E_URL || 'http://127.0.0.1:4173';
const photo = colour => `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="${colour}"/></svg>`;
const description = 'A quiet room with natural light. '.repeat(18) + '\n\nThe kitchen is shared with two other residents.';
const row = {
  id:'quiet-room', rentAmount:320, rentCurrency:'AUD', rentPeriod:'week', deposit:640,
  availableFrom:'2026-10-12', minimumStayWeeks:8, billsIncluded:true,
  room:{name:'Furnished room in Joondalup', roomType:'Private room', furnished:true, ensuite:false,
    maxOccupants:1, description, media:[{url:photo('orange')},{url:photo('blue')}]},
  property:{id:'quiet-property', suburb:'Joondalup', city:'Perth', state:'WA', country:'Australia',
    propertyType:'House', parkingSpaces:1, internetAvailable:true, securityAvailable:true,
    waterAvailable:true, electricityAvailable:true, smokingAllowed:false, petsConsidered:false,
    householdSummary:'A calm shared house.', publicLatitude:-31.744, publicLongitude:115.769,
    customFeatures:Array.from({length:9},(_,index)=>({label:`Feature ${index+1}`,icon:'house'}))},
  owner:{id:'quiet-owner', displayName:'Taylor Homes', bio:'Local property manager', avatarUrl:photo('purple')}
};
const sibling = {...row,id:'quiet-sibling',room:{...row.room,name:'Second room',media:[{url:photo('green')}]}};

async function open(page, rows=[row,sibling]) {
  await page.route('**/rest/v1/vacancies?**', route => route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);
  await page.waitForFunction(() => booting === false);
  await page.evaluate(value => { vacancies=value; VACANCY_BACKEND.contactOptions=async()=>({in_app:true}); displayCurrency='AUD'; },rows);
}

test('experimental route preserves the original and presents a calm working listing', async({page}) => {
  await page.setViewportSize({width:390,height:844});
  await open(page);
  await page.evaluate(() => nav('detail','quiet-room'));
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.locator('.detail-gallery')).toBeVisible();
  await page.evaluate(() => nav('detail-quiet','quiet-room'));
  await expect(page.locator('.topbar')).toBeHidden();
  await expect(page.locator('.mobile-nav')).toBeHidden();
  await expect(page.locator('.quiet-gallery')).toBeVisible();
  await expect(page.locator('.quiet-action-bar')).toBeVisible();
  await expect(page.locator('.quiet-action-bar')).toContainText('A$ 320/week');
  await expect(page.locator('.quiet-action-bar')).toContainText('12 Oct 2026');
  await expect(page.locator('.quiet-intro h1')).toHaveText(row.room.name);
  await expect(page.locator('.quiet-location')).toContainText('Joondalup');
  await expect(page.locator('.quiet-room')).toContainText('Second room');
  await expect(page.locator('.quiet-photo-count')).toHaveText('1 / 2');
  await page.locator('[data-quiet-gallery]').evaluate(node => node.scrollTo({left:node.clientWidth,behavior:'instant'}));
  await expect(page.locator('.quiet-photo-count')).toHaveText('2 / 2');
  await page.locator('.quiet-photo-count').click();
  await expect(page.locator('.listing-lightbox')).toHaveAttribute('open','');
  await page.getByRole('button',{name:'Close photo viewer'}).click();
  await page.locator('.quiet-description .quiet-more > summary').click();
  await expect(page.locator('.quiet-description .quiet-more')).toContainText('The kitchen is shared');
  await expect(page.locator('.quiet-features .quiet-more > summary')).toContainText('Show all 16 features');
  await page.locator('.quiet-features .quiet-more > summary').click();
  await expect(page.locator('.quiet-features .quiet-more li')).toHaveCount(16);
  await expect(page.locator('#detailLocationMap')).toBeVisible();
  await page.setViewportSize({width:1280,height:800});
  expect(await page.locator('.quiet-content').evaluate(node=>node.getBoundingClientRect().width)).toBeLessThanOrEqual(760);
  await expect(page.locator('.quiet-action-bar')).toBeVisible();
  await page.locator('.quiet-back').click();
  await expect(page).toHaveURL(/#detail\/quiet-room$/);
  await expect(page.locator('.topbar')).toBeVisible();
});

test('experimental action remains available and missing media or price degrade cleanly', async({page}) => {
  await page.setViewportSize({width:1280,height:800});
  const sparse={...row,id:'quiet-sparse',rentAmount:null,monthlyRent:null,deposit:null,availableFrom:null,
    room:{...row.room,description:'',media:[]},property:{...row.property,publicLatitude:null,publicLongitude:null,customFeatures:[]}};
  await open(page,[sparse]);
  await page.evaluate(() => nav('detail-quiet','quiet-sparse'));
  await expect(page.locator('.quiet-action-bar')).toBeVisible();
  await expect(page.locator('.quiet-action-bar')).toContainText('Price on request');
  await expect(page.locator('.quiet-photo-count')).toHaveCount(0);
  await expect(page.locator('#detailLocationMap')).toHaveCount(0);
  await expect(page.locator('.quiet-description')).toHaveCount(0);
  await page.locator('.quiet-message').click();
  await expect(page).toHaveURL(/#enquire\/quiet-sparse$/);
  await expect(page.locator('.topbar')).toBeVisible();
});

test('save, share, sibling and lister controls retain their existing destinations', async({page}) => {
  await open(page);
  await page.evaluate(() => {
    currentUser={id:'seeker'};
    toggleSave=async id=>{saved.add(id)};
    Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__sharedListing=data}});
    nav('detail-quiet','quiet-room');
  });
  await page.locator('.quiet-save').click();
  await expect(page.locator('.quiet-save')).toHaveAttribute('aria-pressed','true');
  await page.locator('.quiet-share').click();
  await expect.poll(()=>page.evaluate(()=>window.__sharedListing?.url)).toContain('#detail-quiet/quiet-room');
  await page.locator('.quiet-room').click();
  await expect(page).toHaveURL(/#detail-quiet\/quiet-sibling$/);
  await page.locator('.quiet-lister').click();
  await expect(page).toHaveURL(/#lister\/quiet-owner$/);
});

test('opt-in preview provides a comparison link without changing the standard route', async({page}) => {
  await page.route('**/rest/v1/vacancies?**', route => route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/?experiment=quiet#home`);
  await page.waitForFunction(() => booting === false);
  await page.evaluate(value => {vacancies=value;displayCurrency='AUD';nav('detail','quiet-room')},[row]);
  await expect(page.locator('.detail-gallery')).toBeVisible();
  await page.locator('.quiet-experiment-entry').click();
  await expect(page).toHaveURL(/#detail-quiet\/quiet-room$/);
  await expect(page.locator('.quiet-gallery')).toBeVisible();
  await page.locator('.quiet-compare a').click();
  await expect(page.locator('.detail-gallery')).toBeVisible();
});
