const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

async function open(page){await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));await page.goto(`${APP}/#home`);await page.waitForFunction(()=>booting===false)}

test('header and footer logos retain their brand typography in both themes',async({page})=>{await open(page);for(const theme of ['light','dark']){await page.evaluate(value=>{document.documentElement.dataset.theme=value;renderHome()},theme);for(const selector of ['.brand','.footer-brand']){const result=await page.locator(selector).evaluate(node=>({weight:Number(getComputedStyle(node).fontWeight),spacing:getComputedStyle(node).letterSpacing,family:getComputedStyle(node).fontFamily}));expect(result.weight).toBeGreaterThanOrEqual(750);expect(parseFloat(result.spacing)).toBeLessThan(0);expect(result.family.length).toBeGreaterThan(0)}}});

test('loading mark and word retain their original strong wordmark weights',async({page})=>{await open(page);await page.evaluate(()=>renderLoading());await expect(page.locator('.loading-screen')).toBeVisible();expect(await page.locator('.loading-mark').evaluate(node=>Number(getComputedStyle(node).fontWeight))).toBe(850);expect(await page.locator('.loading-word').evaluate(node=>Number(getComputedStyle(node).fontWeight))).toBe(800)});
