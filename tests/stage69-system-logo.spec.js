const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

async function open(page,hash='home'){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.addInitScript(()=>localStorage.setItem('vacancy-market-v1','KE'));
  await page.goto(`${APP}/#${hash}`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>booting===false);
}

test('the interface uses the native system UI font stack',async({page})=>{
  await open(page);
  for(const selector of ['body','button','input','.leaflet-container']){
    const family=await page.locator(selector).first().evaluate(node=>getComputedStyle(node).fontFamily);
    expect(family.toLowerCase()).toContain('system-ui');
  }
});

test('all brand surfaces are larger and keep a transparent box in both themes',async({page})=>{
  await open(page);
  for(const theme of ['light','dark']){
    await page.evaluate(value=>{document.documentElement.dataset.theme=value;renderHome()},theme);
    for(const selector of ['.brand .brand-logo','.footer-brand .brand-logo']){
      const result=await page.locator(selector).evaluate(node=>{const box=node.getBoundingClientRect(),style=getComputedStyle(node);return{height:box.height,background:style.backgroundColor,padding:style.padding}});
      expect(result.height).toBeGreaterThanOrEqual(25);
      expect(result.background).toBe('rgba(0, 0, 0, 0)');
      expect(result.padding).toBe('0px');
    }
  }
  await page.evaluate(()=>{currentUser=null;renderAuth()});
  const auth=await page.locator('.auth-brand .brand-logo').evaluate(node=>{const box=node.getBoundingClientRect(),style=getComputedStyle(node);return{height:box.height,background:style.backgroundColor}});
  expect(auth.height).toBeGreaterThanOrEqual(64);
  expect(auth.background).toBe('rgba(0, 0, 0, 0)');
});

test('larger logos do not cause horizontal overflow at phone widths',async({page})=>{
  for(const width of [320,375,390,430]){
    await page.setViewportSize({width,height:844});
    await open(page);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await open(page,'auth');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }
});
