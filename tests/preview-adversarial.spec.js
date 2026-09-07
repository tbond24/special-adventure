const { test, expect } = require('@playwright/test');

const APP_URL=process.env.VACANCY_E2E_URL;
const SUPABASE_URL='https://xtutkwiivqkgkqjpkxvj.supabase.co';
const SUPABASE_KEY='sb_publishable_w3YAIocUnB-Nc4ISHZqTWw_wg0zZR2R';

async function openPreview(page){
  await page.addInitScript(()=>localStorage.setItem('vacancy-market-v1','KE'));
  await page.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#exploreMap',{timeout:15000});
  await expect.poll(()=>page.locator('.explore-card').count(),{timeout:15000}).toBeGreaterThan(0);
}

test('location denial leaves discovery usable and radius inactive',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('vacancy-market-v1','KE');
    Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(_ok,fail){fail({code:1,message:'denied'})}}});
  });
  await page.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#exploreMap');
  const before=await page.locator('.explore-card').count();
  expect(before).toBeGreaterThan(0);
  await page.getByRole('button',{name:/Use my location/}).click();
  await expect(page.locator('#toast')).toContainText('Location permission was not granted');
  await expect(page.locator('#radiusStatus')).toContainText('Radius activates');
  await expect(page.locator('.explore-card')).toHaveCount(before);
});

test('zero-result search recovers immediately when query is cleared',async({page})=>{
  await openPreview(page);
  const q=page.getByLabel('Search location');
  await q.fill('zzzz-no-such-vacancy-area-987654');
  await expect(page.locator('.explore-card')).toHaveCount(0);
  await expect(page.locator('#cards')).toContainText('No current vacancies');
  await q.fill('');
  await expect.poll(()=>page.locator('.explore-card').count()).toBeGreaterThan(0);
});

test('search text cannot inject executable markup into results',async({page})=>{
  await openPreview(page);
  await page.getByLabel('Search location').fill('<img id="qa-injection" src=x onerror="window.__qaInjected=1">');
  await expect(page.locator('#qa-injection')).toHaveCount(0);
  expect(await page.evaluate(()=>window.__qaInjected||0)).toBe(0);
});

test('invalid detail hash fails closed without JavaScript error',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('vacancy-market-v1','KE'));
  await page.goto(`${APP_URL}/#detail/not-a-real-vacancy`,{waitUntil:'domcontentloaded'});
  await expect(page.getByText('Vacancy not found.')).toBeVisible({timeout:15000});
  expect(errors).toEqual([]);
});

test('anonymous protected actions route to authentication instead of mutating',async({page})=>{
  await openPreview(page);
  const card=page.locator('.explore-card').first();
  await card.getByRole('button',{name:'Save'}).click();
  await expect(page.getByRole('heading',{name:'Create account'})).toBeVisible();
  await page.goto(`${APP_URL}/#home`);
  await page.waitForSelector('.explore-card');
  await page.locator('.explore-card').first().getByRole('button',{name:'View'}).click();
  await page.getByRole('button',{name:'Enquire'}).click();
  await expect(page.getByRole('heading',{name:'Create account'})).toBeVisible();
});

test('direct protected routes fail closed for anonymous user',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('vacancy-market-v1','KE'));
  for(const route of ['list','messages','account','admin','edit/not-a-real-vacancy']){
    await page.goto(`${APP_URL}/#${route}`,{waitUntil:'domcontentloaded'});
    await expect(page.getByRole('heading',{name:'Create account'})).toBeVisible({timeout:15000});
  }
});

test('anonymous API cannot read exact private property addresses',async({request})=>{
  const res=await request.get(`${SUPABASE_URL}/rest/v1/property_private_locations?select=address_line`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
  expect(res.ok()).toBeTruthy();
  expect(await res.json()).toEqual([]);
});

test('anonymous vacancy API exposes only currently public vacancy rows',async({request})=>{
  const res=await request.get(`${SUPABASE_URL}/rest/v1/vacancies?select=id,status,expires_at`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
  expect(res.ok()).toBeTruthy();
  const rows=await res.json();
  expect(rows.length).toBeGreaterThan(0);
  const now=Date.now();
  for(const row of rows){
    expect(row.status).toBe('active');
    if(row.expires_at)expect(new Date(row.expires_at).getTime()).toBeGreaterThan(now);
  }
});

test('market and radius preferences survive reload',async({page})=>{
  await openPreview(page);
  await page.locator('#radius').fill('27');
  await expect(page.locator('#radiusLabel')).toContainText('27 km');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForSelector('#exploreMap');
  await expect(page.locator('#radiusLabel')).toContainText('27 km');
  await page.locator('#marketSelect').selectOption('US');
  await expect(page.locator('#marketSelect')).toHaveValue('US');
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#marketSelect')).toHaveValue('US');
  await expect(page.locator('#radiusLabel')).toContainText('27 mi');
});

test('temporary inventory refresh failure preserves last known discovery instead of blanking',async({page})=>{
  await openPreview(page);
  const before=await page.locator('.explore-card').count();
  expect(before).toBeGreaterThan(0);
  await page.goto(`${APP_URL}/#saved`);
  await page.route(`${SUPABASE_URL}/rest/v1/vacancies**`,route=>route.abort());
  await page.goto(`${APP_URL}/#home`);
  await page.waitForSelector('#exploreMap');
  await expect(page.locator('.explore-card')).toHaveCount(before);
});

test('map tile failure does not remove list-based access to vacancies',async({page})=>{
  await page.route('https://tile.openstreetmap.org/**',route=>route.abort());
  await openPreview(page);
  await expect.poll(()=>page.locator('.explore-card').count()).toBeGreaterThan(0);
  await page.locator('.explore-card').first().getByRole('button',{name:'View'}).click();
  await expect(page.getByRole('heading',{name:'Property facts'})).toBeVisible();
});

test('repeated primary navigation does not create page overflow or crash',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await openPreview(page);
  for(let i=0;i<3;i++){
    await page.goto(`${APP_URL}/#home`);
    await page.waitForSelector('#exploreMap');
    await page.goto(`${APP_URL}/#saved`);
    await page.goto(`${APP_URL}/#home`);
    await page.waitForSelector('#exploreMap');
  }
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
  expect(overflow).toBeFalsy();
  expect(errors).toEqual([]);
});
