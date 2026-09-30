const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';
const token=`head.${Buffer.from(JSON.stringify({sub:'guest-one',exp:4102444800,is_anonymous:true})).toString('base64url')}.sig`;

async function openGuest(page){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.route('**/rest/v1/blocks?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.route('**/rest/v1/saved_vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.addInitScript(value=>localStorage.setItem('vacancy-session-v01',JSON.stringify({access_token:value,refresh_token:'refresh'})),token);
  await page.route('**/auth/v1/user',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'guest-one',is_anonymous:true})}));
  await page.goto(`${APP}/#auth`);
  await page.waitForFunction(()=>booting===false);
}

test('guest asks to verify email without replacing the guest identity',async({page})=>{
  await openGuest(page);
  let update,signups=0;
  await page.route('**/auth/v1/signup',route=>{signups++;return route.abort()});
  await page.route('**/auth/v1/user?redirect_to=*',route=>{update={method:route.request().method(),body:route.request().postDataJSON(),authorization:route.request().headers().authorization,url:route.request().url()};return route.fulfill({status:200,contentType:'application/json',body:'{}'})});
  await page.locator('#authUnified').getByRole('button',{name:'Create account'}).click();
  await expect(page.locator('#authUnified [name=password]')).toBeHidden();
  await page.locator('#authUnified [name=email]').fill('new@example.com');
  await page.getByRole('button',{name:'Verify email'}).click();
  await expect(page.locator('#toast')).toContainText('Check your email');
  expect(update.method).toBe('PUT');expect(update.body).toEqual({email:'new@example.com'});
  expect(update.authorization).toBe(`Bearer ${token}`);
  expect(update.url).toContain('account-upgrade%3D1');
  expect(signups).toBe(0);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('vacancy-session-v01')).access_token)).toBe(token);
});

test('existing email conflict leaves the guest session and chats recoverable',async({page})=>{
  await openGuest(page);
  await page.route('**/auth/v1/user?redirect_to=*',route=>route.fulfill({status:422,contentType:'application/json',body:'{"message":"Email already registered"}'}));
  await page.locator('#authUnified').getByRole('button',{name:'Create account'}).click();
  await page.locator('#authUnified [name=email]').fill('existing@example.com');
  await page.getByRole('button',{name:'Verify email'}).click();
  await expect(page.locator('#toast')).toContainText('Email already registered');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('vacancy-session-v01')).access_token)).toBe(token);
  await expect(page.getByRole('button',{name:'Verify email'})).toBeEnabled();
});

test('verified callback sets a password on the same user',async({page})=>{
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.route('**/rest/v1/blocks?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.route('**/rest/v1/saved_vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  let update;
  await page.route('**/auth/v1/user',route=>{if(route.request().method()==='PUT'){update=route.request().postDataJSON();return route.fulfill({status:200,contentType:'application/json',body:'{}'})}return route.fulfill({status:200,contentType:'application/json',body:'{"id":"guest-one","email":"new@example.com","email_confirmed_at":"2026-10-01T00:00:00Z","is_anonymous":false}'})});
  await page.goto(`${APP}/?account-upgrade=1#access_token=${token}&refresh_token=refresh&expires_in=3600&type=email_change`);
  await page.waitForFunction(()=>booting===false);
  await expect(page.locator('#finishGuestAccount')).toBeVisible();
  await page.locator('#finishGuestAccount [name=password]').fill('SecurePassword123');
  await page.locator('#finishGuestAccount [name=confirmation]').fill('SecurePassword123');
  await page.getByRole('button',{name:'Save password'}).click();
  await expect(page.locator('#toast')).toContainText('Account ready');
  expect(update).toEqual({password:'SecurePassword123'});
  expect(await page.evaluate(()=>sessionStorage.getItem('vacancy-finish-upgrade'))).toBeNull();
});

