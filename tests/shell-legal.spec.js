const {test,expect}=require('@playwright/test');
const APP_URL=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4178';

test('loading screen is branded and accessible while inventory loads',async({page})=>{
  let releaseInventory;
  const inventoryGate=new Promise(resolve=>{releaseInventory=resolve});
  await page.route('**/rest/v1/vacancies?**',async route=>{await inventoryGate;await route.fulfill({status:200,contentType:'application/json',body:'[]'})});
  await page.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await expect(page.locator('.loading-screen')).toBeVisible();
  await expect(page.locator('.loading-word')).toContainText('vacancy');
  await expect(page.locator('.loading-screen')).toHaveAttribute('role','status');
  releaseInventory();
});

test('unknown hash renders a useful 404 and returns home',async({page})=>{
  await page.goto(`${APP_URL}/#something-that-does-not-exist`,{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{name:'This place is not on the map.'})).toBeVisible();
  await expect(page.locator('.not-found-code')).toContainText('404');
  await page.getByRole('link',{name:'Back to Find'}).click();
  await expect(page).toHaveURL(/#home$/);
});

for(const [route,title] of [['privacy','Privacy'],['terms','Terms of use'],['storage','Device storage and cookies'],['safety','Safety centre']]){
  test(`${title} is reachable from the global footer and contains substantive guidance`,async({page})=>{
    await page.goto(`${APP_URL}/#home`,{waitUntil:'domcontentloaded'});
    if(page.viewportSize().width<=820){await page.getByRole('button',{name:'Information and policies'}).click();await page.locator(`#mapInfoSheet a[href="#${route}"]`).click()}else await page.locator(`.site-footer a[href="#${route}"]`).click();
    await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
    expect(await page.locator('.information-page section').count()).toBeGreaterThanOrEqual(4);
    expect(await page.locator('.information-page').innerText()).toMatch(/Vacancy/);
  });
}

test('information routes remain contained in both themes at narrow mobile width',async({page})=>{
  await page.setViewportSize({width:320,height:844});
  await page.goto(`${APP_URL}/#privacy`,{waitUntil:'domcontentloaded'});
  for(const theme of ['dark','light'])for(const route of ['privacy','terms','storage','safety']){
    await page.evaluate(({theme,route})=>{setVacancyTheme(theme);location.hash=route},{theme,route});
    await expect(page.locator('.information-page')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
}
});
