const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

async function open(page){await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));await page.goto(`${APP}/#home`);await page.waitForFunction(()=>booting===false)}

test('header and footer use the supplied responsive logo in both themes',async({page})=>{await open(page);for(const theme of ['light','dark']){await page.evaluate(value=>{document.documentElement.dataset.theme=value;renderHome()},theme);for(const selector of ['.brand','.footer-brand']){const logo=page.locator(`${selector} .brand-logo`);await expect(logo).toBeVisible();const result=await logo.evaluate(node=>({loaded:node.complete&&node.naturalWidth>0,ratio:node.naturalWidth/node.naturalHeight,height:node.getBoundingClientRect().height,background:getComputedStyle(node).backgroundColor}));expect(result.loaded).toBe(true);expect(result.ratio).toBeGreaterThan(2.5);expect(result.height).toBeGreaterThanOrEqual(20);if(theme==='dark')expect(result.background).not.toBe('rgba(0, 0, 0, 0)')}}});

test('loading screen uses the supplied logo without the retired text mark',async({page})=>{await open(page);await page.evaluate(()=>renderLoading());await expect(page.locator('.loading-screen')).toBeVisible();const logo=page.locator('.loading-logo');await expect(logo).toBeVisible();expect(await logo.evaluate(node=>node.complete&&node.naturalWidth>0)).toBe(true);await expect(page.locator('.loading-mark,.loading-word')).toHaveCount(0)});

test('sign-in page uses the same supplied logo',async({page})=>{await open(page);await page.evaluate(()=>{currentUser=null;renderAuth()});const logo=page.locator('.auth-brand .brand-logo');await expect(logo).toBeVisible();expect(await logo.evaluate(node=>node.complete&&node.naturalWidth>0)).toBe(true);await expect(page.locator('.auth-brand')).toHaveAttribute('aria-label','Vacancy home')});
