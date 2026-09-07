const { test, expect } = require('@playwright/test');

const SUPABASE_URL='https://xtutkwiivqkgkqjpkxvj.supabase.co';
const SUPABASE_KEY='sb_publishable_w3YAIocUnB-Nc4ISHZqTWw_wg0zZR2R';
const APP_URL=process.env.VACANCY_E2E_URL || 'https://vacancy-nine.vercel.app';

async function openVacancy(page){
  await page.addInitScript(()=>localStorage.setItem('vacancy-market-v1','KE'));
  await page.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#exploreMap',{timeout:15000});
  await expect(page.locator('.explore-card')).toHaveCount(3,{timeout:15000});
}

test('G7 boot renders Explore with Kenya inventory', async ({ page }) => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await openVacancy(page);
  await expect(page.locator('#marketSelect')).toHaveValue('KE');
  await expect(page.locator('.map-pin')).toHaveCount(3);
  await expect(page.locator('.explore-card.selected')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('market switch changes defaults without fake FX conversion', async ({ page }) => {
  await openVacancy(page);
  await page.locator('#marketSelect').selectOption('US');
  await expect(page.locator('#rentUnitLabel')).toContainText('USD/month');
  await expect(page.locator('#radiusLabel')).toContainText('mi');
  await expect(page.locator('.explore-card')).toHaveCount(0);
  await page.locator('#marketSelect').selectOption('KE');
  await expect(page.locator('.explore-card')).toHaveCount(3);
});

test('area search finds Kasarani listing', async ({ page }) => {
  await openVacancy(page);
  await page.getByLabel('Search location').fill('Kasarani');
  await expect(page.locator('.explore-card')).toHaveCount(1);
  await expect(page.locator('.explore-card')).toContainText('Kasarani');
});

test('priority and more filters work', async ({ page }) => {
  await openVacancy(page);
  await page.locator('#water').check();
  await expect(page.locator('.explore-card')).toHaveCount(3);
  await page.getByText('More filters',{exact:true}).click();
  await expect(page.locator('#pets')).toBeVisible();
  await page.locator('#pets').check();
  await expect(page.locator('.explore-card')).toHaveCount(1);
  await expect(page.locator('.explore-card')).toContainText('Ruiru');
});

test('radius search uses browser location and approximate pins', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'],{origin:APP_URL});
  await context.setGeolocation({latitude:-1.218,longitude:36.896});
  await openVacancy(page);
  await page.getByRole('button',{name:/Use my location/}).click();
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
  const unselected=page.locator('.leaflet-marker-icon').filter({has:page.locator('.map-pin:not(.selected)')}).first();
  await expect(unselected).toBeVisible();
  const box=await unselected.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  await expect.poll(async()=>page.locator('.explore-card.selected').getAttribute('data-card-id'),{timeout:5000}).not.toBe(direct.before);
});

test('detail exposes safety controls and property hierarchy', async ({ page }) => {
  await openVacancy(page);
  await page.locator('.explore-card').first().getByRole('button',{name:'View'}).click();
  await expect(page.getByRole('button',{name:'Report listing'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Block lister'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Property facts'})).toBeVisible();
});

test('first-time lister is gated to account creation', async ({ page }) => {
  await openVacancy(page);
  await page.getByRole('button',{name:/List a room/}).click();
  await expect(page.getByRole('heading',{name:'Create account'})).toBeVisible();
});

test('responsive layout has no page-level horizontal overflow', async ({ page }) => {
  await openVacancy(page);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
  expect(overflow).toBeFalsy();
  const width=page.viewportSize().width;
  if(width<=820) await expect(page.locator('.mobile-nav')).toBeVisible();
  else await expect(page.locator('.mobile-nav')).toBeHidden();
});

test('SEC weak and leaked passwords are rejected', async ({ page, request }) => {
  await openVacancy(page);
  await page.getByRole('button',{name:/List a room/}).click();
  const signup=page.locator('#signup');
  await signup.getByLabel('Name').fill('Test User');
  await signup.getByLabel('Email').fill('invalid@example.com');
  await signup.getByLabel('Password').fill('short');
  await signup.getByRole('button',{name:'Create account'}).click();
  expect(await signup.getByLabel('Password').evaluate(el=>el.validationMessage.length>0)).toBeTruthy();
  const res=await request.post(`${SUPABASE_URL}/functions/v1/secure-signup`,{headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},data:{name:'Vacancy Security Test',email:'leaked-password-check@example.invalid',password:'Password123456A'}});
  expect(res.status()).toBe(400);
  expect((await res.json()).error).toBe('leaked_password');
});
