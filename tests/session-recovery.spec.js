const {test,expect}=require('@playwright/test');

const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';
const sessionKey='vacancy-session-v01';
const token=exp=>`header.${btoa(JSON.stringify({exp}))}.signature`;

test('an invalid refresh token returns visitors to public Find',async({page})=>{
  await page.addInitScript(({key})=>localStorage.setItem(key,JSON.stringify({access_token:'expired.jwt.value',refresh_token:'invalid-refresh'})),{key:sessionKey});
  let refreshes=0,authorization='';
  await page.route('**/auth/v1/token?grant_type=refresh_token',route=>{refreshes++;return route.fulfill({status:400,json:{error_code:'refresh_token_not_found',msg:'Invalid refresh token'}})});
  await page.route('**/rest/v1/vacancies?**',route=>{authorization=route.request().headers().authorization||'';return route.fulfill({status:200,json:[]})});
  await page.goto(`${APP}/#home`);
  await expect(page.locator('#exploreMap')).toBeVisible();
  await expect(page.getByText('We could not load current vacancies.')).toHaveCount(0);
  expect(refreshes).toBe(1);
  expect(authorization).toMatch(/^Bearer sb_publishable_/);
  expect(await page.evaluate(key=>localStorage.getItem(key),sessionKey)).toBeNull();
});

test('simultaneous requests share one token refresh',async({page})=>{
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,json:[]}));
  await page.goto(`${APP}/#home`);
  await expect(page.locator('#exploreMap')).toBeVisible();
  const fresh={access_token:token(Math.floor(Date.now()/1000)+3600),refresh_token:'fresh-refresh'};
  let refreshes=0;
  await page.route('**/auth/v1/token?grant_type=refresh_token',async route=>{refreshes++;await new Promise(resolve=>setTimeout(resolve,100));await route.fulfill({status:200,json:fresh})});
  await page.route('**/auth/v1/user',route=>route.fulfill({status:200,json:{id:'test-user'}}));
  await page.route('**/rest/v1/blocks?**',route=>route.fulfill({status:200,json:[]}));
  const result=await page.evaluate(async({key,oldToken})=>{
    localStorage.setItem(key,JSON.stringify({access_token:oldToken,refresh_token:'old-refresh'}));
    const [user,listings]=await Promise.all([VACANCY_BACKEND.currentUser(),VACANCY_BACKEND.activeVacancies()]);
    return {user:user?.id,listings:listings.length};
  },{key:sessionKey,oldToken:token(1)});
  expect(result).toEqual({user:'test-user',listings:0});
  expect(refreshes).toBe(1);
});

test('a token refreshed in another tab is kept when the old refresh fails',async({page})=>{
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,json:[]}));
  await page.goto(`${APP}/#home`);
  await expect(page.locator('#exploreMap')).toBeVisible();
  const fresh={access_token:token(Math.floor(Date.now()/1000)+3600),refresh_token:'other-tab-refresh'};
  await page.route('**/auth/v1/token?grant_type=refresh_token',async route=>{
    await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:sessionKey,value:fresh});
    await route.fulfill({status:400,json:{error_code:'refresh_token_not_found'}});
  });
  await page.route('**/auth/v1/user',route=>route.fulfill({status:200,json:{id:'test-user'}}));
  await page.evaluate(({key,oldToken})=>localStorage.setItem(key,JSON.stringify({access_token:oldToken,refresh_token:'old-refresh'})),{key:sessionKey,oldToken:token(1)});
  expect((await page.evaluate(()=>VACANCY_BACKEND.currentUser())).id).toBe('test-user');
  expect(JSON.parse(await page.evaluate(key=>localStorage.getItem(key),sessionKey)).refresh_token).toBe(fresh.refresh_token);
});
