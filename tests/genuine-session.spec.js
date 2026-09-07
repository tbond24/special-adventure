const { test, expect, request: playwrightRequest } = require('@playwright/test');
const crypto = require('crypto');

const APP_URL = process.env.VACANCY_E2E_URL || 'http://127.0.0.1:4173';
const API = process.env.SUPABASE_API_URL;
const ANON = process.env.SUPABASE_ANON_KEY;

function uniqueUser(prefix){
  const nonce = crypto.randomUUID();
  return { email: `${prefix}-${nonce}@vacancy.test`, password: `Qa-${nonce}-aA9` };
}

async function createUser(api, prefix){
  const u = uniqueUser(prefix);
  const res = await api.post(`${API}/auth/v1/signup`, {
    headers: { apikey: ANON, 'Content-Type':'application/json' },
    data: { email:u.email, password:u.password, data:{display_name:prefix==='lister'?'QA Lister':'QA Renter'} }
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  return u;
}

async function configureContext(context){
  await context.addInitScript(() => localStorage.setItem('vacancy-market-v1','KE'));
}

async function signIn(page,user){
  await page.goto(`${APP_URL}/#auth`,{waitUntil:'domcontentloaded'});
  const form = page.locator('#signin');
  await form.locator('[name=email]').fill(user.email);
  await form.locator('[name=password]').fill(user.password);
  await form.getByRole('button',{name:'Sign in'}).click();
  await expect(page.locator('#toast')).toContainText('Signed in');
}

async function publishFirstListing(page){
  await page.goto(`${APP_URL}/#list`,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#listingForm')).toBeVisible();
  const f = page.locator('#listingForm');
  await f.locator('[name=region]').fill('Nairobi County');
  await f.locator('[name=city]').fill('Nairobi');
  await f.locator('[name=locality]').fill('Kasarani');
  await f.locator('[name=landmark]').fill('QA Mall');
  await f.locator('[name=address]').fill('Private QA exact address');
  await f.locator('[name=household]').fill('Quiet QA property with reliable utilities.');
  await f.locator('[name=roomName]').fill('QA Bedsitter One');
  await f.locator('[name=rentAmount]').fill('12000');
  await f.locator('[name=deposit]').fill('12000');
  await f.locator('[name=availableFrom]').fill('2026-09-20');
  await f.locator('[name=description]').fill('Bright QA unit for marketplace end-to-end testing.');
  const map = page.locator('#newPropertyMap');
  await expect(map).toBeVisible();
  const box = await map.boundingBox();
  expect(box).toBeTruthy();
  await map.click({position:{x:box.width*0.55,y:box.height*0.48}});
  await expect(f.locator('[name=publicLatitude]')).not.toHaveValue('');

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zp8sAAAAASUVORK5CYII=','base64');
  await f.locator('[name=images]').setInputFiles({name:'qa-room.png',mimeType:'image/png',buffer:png});
  await f.getByRole('button',{name:'Publish vacancy'}).click();
  await expect(page.locator('#toast')).toContainText('Vacancy published');
  await expect(page.getByText('QA Bedsitter One')).toBeVisible();
}

test('real renter and lister sessions complete the core marketplace loop', async ({ browser }) => {
  test.skip(!API || !ANON,'Local Supabase environment variables are required');
  const api = await playwrightRequest.newContext();
  const lister = await createUser(api,'lister');
  const renter = await createUser(api,'renter');

  const listerContext = await browser.newContext();
  const renterContext = await browser.newContext();
  await configureContext(listerContext);
  await configureContext(renterContext);
  const lp = await listerContext.newPage();
  const rp = await renterContext.newPage();

  await signIn(lp,lister);
  await publishFirstListing(lp);

  await rp.goto(`${APP_URL}/#home`,{waitUntil:'domcontentloaded'});
  await expect(rp.getByText('QA Bedsitter One')).toBeVisible();
  await signIn(rp,renter);
  await rp.goto(`${APP_URL}/#home`);
  const card = rp.locator('[data-card-id]').filter({hasText:'QA Bedsitter One'});
  await expect(card).toBeVisible();
  await card.getByRole('button',{name:'Save'}).click();
  await expect(card.getByRole('button',{name:/Saved/})).toBeVisible();
  await card.getByRole('button',{name:'View'}).click();
  await rp.getByRole('button',{name:'Enquire'}).click();
  const ef = rp.locator('#enquiryForm');
  await ef.locator('[name=moveIn]').fill('2026-09-25');
  await ef.locator('[name=stayWeeks]').fill('26');
  await ef.locator('[name=intro]').fill('QA renter testing the real marketplace flow.');
  await ef.locator('[name=message]').fill('Hi, is this QA unit still available for a viewing?');
  await ef.getByRole('button',{name:'Send enquiry'}).click();
  await expect(rp.getByText('Hi, is this QA unit still available for a viewing?')).toBeVisible();

  await lp.goto(`${APP_URL}/#messages`);
  await expect(lp.getByText('Hi, is this QA unit still available for a viewing?')).toBeVisible();
  const listerChat = lp.locator('#chatForm');
  await listerChat.locator('[name=body]').fill('Yes, the QA unit is available.');
  await listerChat.getByRole('button',{name:'Send'}).click();
  await expect(lp.getByText('Yes, the QA unit is available.')).toBeVisible();

  await rp.goto(`${APP_URL}/#messages`);
  await expect(rp.getByText('Yes, the QA unit is available.')).toBeVisible();

  await lp.goto(`${APP_URL}/#list`);
  const row = lp.locator('.room-manage').filter({hasText:'QA Bedsitter One'});
  await row.getByRole('button',{name:'Edit'}).click();
  const edit = lp.locator('#editListingForm');
  await edit.locator('[name=rentAmount]').fill('12500');
  await edit.getByRole('button',{name:'Save changes'}).click();
  await expect(lp.locator('#toast')).toContainText('Vacancy updated');

  await lp.goto(`${APP_URL}/#list`);
  const updated = lp.locator('.room-manage').filter({hasText:'QA Bedsitter One'});
  await updated.getByRole('button',{name:'Still available'}).click();
  await expect(lp.locator('#toast')).toContainText('Availability reconfirmed');

  await rp.goto(`${APP_URL}/#messages`);
  rp.once('dialog',d=>d.accept());
  await rp.getByRole('button',{name:'Block user'}).click();
  await expect(rp.locator('#toast')).toContainText('User blocked');

  await lp.goto(`${APP_URL}/#messages`);
  await lp.locator('#chatForm [name=body]').fill('This should be blocked.');
  await lp.locator('#chatForm').getByRole('button',{name:'Send'}).click();
  await expect(lp.locator('#toast')).toContainText('conversation unavailable');

  await lp.goto(`${APP_URL}/#list`);
  const finalRow = lp.locator('.room-manage').filter({hasText:'QA Bedsitter One'});
  await finalRow.getByRole('button',{name:'Mark filled'}).click();
  await expect(lp.locator('#toast')).toContainText('Vacancy filled');

  await rp.goto(`${APP_URL}/#home`);
  await expect(rp.getByText('QA Bedsitter One')).toHaveCount(0);

  await listerContext.close();
  await renterContext.close();
  await api.dispose();
});

test('multi-unit landlord can add a sibling unit under the same property', async ({ browser }) => {
  test.skip(!API || !ANON,'Local Supabase environment variables are required');
  const api = await playwrightRequest.newContext();
  const lister = await createUser(api,'lister');
  const ctx = await browser.newContext();
  await configureContext(ctx);
  const page = await ctx.newPage();
  await signIn(page,lister);
  await publishFirstListing(page);
  await page.goto(`${APP_URL}/#list`);
  const f = page.locator('#existingListingForm');
  await expect(f).toBeVisible();
  await f.locator('[name=roomName]').fill('QA Bedsitter Two');
  await f.locator('[name=rentAmount]').fill('13500');
  await f.locator('[name=availableFrom]').fill('2026-09-22');
  await f.locator('[name=description]').fill('Second QA sibling unit.');
  await f.getByRole('button',{name:'Publish vacancy'}).click();
  await expect(page.locator('#toast')).toContainText('Vacancy published');
  await expect(page.getByText('QA Bedsitter One')).toBeVisible();
  await expect(page.getByText('QA Bedsitter Two')).toBeVisible();
  await ctx.close();
  await api.dispose();
});
