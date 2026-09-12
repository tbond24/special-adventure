const { test, expect } = require('@playwright/test');

const SUPABASE_URL='https://xtutkwiivqkgkqjpkxvj.supabase.co';
const SUPABASE_KEY='sb_publishable_w3YAIocUnB-Nc4ISHZqTWw_wg0zZR2R';
const APP_URL=process.env.VACANCY_E2E_URL || 'https://getvacancy.site';

async function openVacancy(page){
  await page.addInitScript(()=>localStorage.setItem('vacancy-market-v1','KE'));
  await page.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#exploreMap',{timeout:15000});
  await expect.poll(()=>page.locator('.explore-card').count(),{
    message:'live inventory should render at least two listings for map interaction coverage',
    timeout:15000
  }).toBeGreaterThanOrEqual(2);
}

test('G7 boot renders Explore with Kenya inventory', async ({ page }) => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await openVacancy(page);
  await expect(page.locator('#marketSelect')).toHaveValue('KES');
  const listingCount=await page.locator('.explore-card').count();
  await expect(page.locator('.map-pin')).toHaveCount(listingCount);
  await expect(page.locator('.explore-card.selected')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('currency switch converts prices without changing Kenya inventory', async ({ page }) => {
  await openVacancy(page);
  const originalCount=await page.locator('.explore-card').count();
  await page.route('**/api/exchange-rates',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({rates:{USD:1,KES:130,AUD:1.5,GBP:.75,UGX:3700,TZS:2500}})}));
  await page.locator('#marketSelect').selectOption('USD');
  await page.getByRole('button',{name:'Filters'}).click();
  await expect(page.locator('#rentPeriod')).toHaveValue('month');
  await expect(page.locator('#radiusLabel')).toContainText('km');
  await expect(page.locator('#q')).toHaveAttribute('placeholder','Search area');
  await expect(page.locator('.explore-card')).toHaveCount(originalCount);
  await expect(page.locator('.explore-card .price').first()).toContainText('≈ $');
});

test('area search finds Kasarani listing', async ({ page }) => {
  await openVacancy(page);
  await page.getByLabel('Search location').fill('Kasarani');
  await expect(page.locator('.explore-card')).toHaveCount(1);
  await expect(page.locator('.explore-card')).toContainText('Kasarani');
});

test('priority and more filters work', async ({ page }) => {
  await openVacancy(page);
  const unfilteredCount=await page.locator('.explore-card').count();
  await page.getByRole('button',{name:'Filters'}).click();
  await page.locator('#water').check();
  await expect.poll(()=>page.locator('.explore-card').count()).toBeLessThanOrEqual(unfilteredCount);
  const waterCount=await page.locator('.explore-card').count();
  await page.getByText('More filters',{exact:true}).click();
  await expect(page.locator('#pets')).toBeVisible();
  await page.locator('#pets').check();
  const filteredIds=await page.locator('.explore-card').evaluateAll(nodes=>nodes.map(node=>node.dataset.cardId));
  expect(filteredIds.length).toBeGreaterThan(0);
  expect(filteredIds.length).toBeLessThanOrEqual(waterCount);
  const allMatch=await page.evaluate(ids=>ids.every(id=>vacancies.find(v=>v.id===id)?.property.petsConsidered),filteredIds);
  expect(allMatch).toBe(true);
});

test('radius search uses browser location and approximate pins', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'],{origin:APP_URL});
  await context.setGeolocation({latitude:-1.218,longitude:36.896});
  await openVacancy(page);
  await page.getByRole('button',{name:/Use my location/}).click();
  await page.getByRole('button',{name:'Filters'}).click();
  await expect(page.locator('#radiusStatus')).toContainText('Filtering within',{timeout:10000});
  await page.locator('#radius').fill('3');
  await expect(page.locator('.explore-card')).toHaveCount(1);
  await expect(page.locator('.explore-card')).toContainText('Kasarani');
});

test('map pin and card selection stay synchronized', async ({ page }) => {
  await openVacancy(page);
  const direct=await page.evaluate(async()=>{
    const before=document.querySelector('.explore-card.selected')?.dataset.cardId;
    const target=[...exploreMarkers.keys()].find(id=>id!==before);
    const marker=exploreMarkers.get(target);
    marker.fire('click');
    await new Promise(r=>setTimeout(r,500));
    return {before,target,after:document.querySelector('.explore-card.selected')?.dataset.cardId};
  });
  expect(direct.target).toBeTruthy();
  expect(direct.after).toBe(direct.target);

  await page.evaluate(id=>{ selectExplore(id,false); },direct.before);
  await page.locator('#exploreMap').evaluate(el=>el.scrollIntoView({block:'center'}));
  const candidates=page.locator('.leaflet-marker-icon').filter({has:page.locator('.map-pin:not(.selected)')});
  const clickableIndex=await candidates.evaluateAll(nodes=>nodes.findIndex(node=>{const r=node.getBoundingClientRect(),top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return top===node||node.contains(top)}));
  expect(clickableIndex).toBeGreaterThanOrEqual(0);
  const exposed=candidates.nth(clickableIndex);
  await expect(exposed).toBeVisible();
  await exposed.click();
  await expect.poll(async()=>page.locator('.explore-card.selected').getAttribute('data-card-id'),{timeout:5000}).not.toBe(direct.before);
});

test('detail exposes safety controls, useful facts and location', async ({ page }) => {
  await openVacancy(page);
  await page.locator('.explore-card').first().click({position:{x:8,y:8}});
  await expect(page.getByRole('button',{name:/Save listing|Remove from saved/})).toBeVisible();
  await page.getByRole('button',{name:'Listing safety options'}).click();
  await expect(page.getByRole('button',{name:'Report listing'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Block lister'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Utilities and access'})).toBeVisible();
  await expect(page.locator('.detail-map-card')).toBeVisible();
});

test('first-time lister is gated to sign in with account creation available', async ({ page }) => {
  await openVacancy(page);
  await page.getByRole('button',{name:/List a room/}).click();
  await expect(page).toHaveURL(/#auth$/);
  await expect(page.locator('#authUnified')).toHaveAttribute('data-mode','signin');
  await expect(page.getByRole('button',{name:'Create account'})).toBeVisible();
});

test('responsive layout has no page-level horizontal overflow', async ({ page }) => {
  await openVacancy(page);
  const width=page.viewportSize().width;
  const overflow=await page.evaluate(mobile=>{
    const root=document.documentElement,body=document.body,main=document.querySelector('main'),mainBox=main.getBoundingClientRect();
    return mobile
      ? root.scrollWidth-root.clientWidth
      : Math.max(body.scrollWidth-body.clientWidth,Math.ceil(mainBox.right-innerWidth),Math.ceil(-mainBox.left));
  },width<=820);
  expect(overflow).toBeLessThanOrEqual(1);
  if(width<=820) await expect(page.locator('.mobile-nav')).toBeVisible();
  else await expect(page.locator('.mobile-nav')).toBeHidden();
});

test('SEC weak and leaked passwords are rejected', async ({ page, request }) => {
  await openVacancy(page);
  await page.getByRole('button',{name:/List a room/}).click();
  await page.getByRole('button',{name:'Create account'}).click();
  const signup=page.locator('#authUnified');
  await expect(signup).toHaveAttribute('data-mode','signup');
  await signup.getByLabel('Name').fill('Test User');
  await signup.getByLabel('Email').fill('invalid@example.com');
  await signup.getByLabel('Password').fill('short');
  await signup.getByRole('button',{name:'Create account'}).click();
  expect(await signup.getByLabel('Password').evaluate(el=>el.validationMessage.length>0)).toBeTruthy();
  const res=await request.post(`${SUPABASE_URL}/functions/v1/secure-signup`,{headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},data:{name:'Vacancy Security Test',email:'leaked-password-check@example.invalid',password:'Password123456A'}});
  expect(res.status()).toBe(400);
  expect((await res.json()).error).toBe('leaked_password');
});
