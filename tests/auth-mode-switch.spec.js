const {test,expect}=require('@playwright/test');
const base='http://127.0.0.1:8765';
test.beforeEach(async({page})=>{
 await page.route('**/*',async route=>{if(new URL(route.request().url()).origin!==base)return route.fulfill({status:200,contentType:'application/json',body:'[]'});if(new URL(route.request().url()).pathname==='/'){const response=await route.fetch(),headers={...response.headers()};delete headers['content-security-policy'];return route.fulfill({response,headers});}return route.continue();});
 await page.goto(base+'/#auth');await page.waitForFunction(()=>booting===false);
 await page.evaluate(()=>{window.authCalls=[];VACANCY_BACKEND.signIn=async()=>{authCalls.push({mode:'signin'});throw Error('Synthetic sign-in reached')};VACANCY_BACKEND.signUp=async data=>{authCalls.push({mode:'signup',name:data.name});return {}};});
});
test('signup to signin removes constraints and allows an existing password',async({page})=>{
 const f=page.locator('#authUnified');await f.locator('.auth-mode-switch').click();await f.locator('[name=email]').fill('test@example.invalid');await f.locator('[name=password]').fill('oldpass');await f.locator('.auth-mode-switch').click();await f.locator('button.primary').click();await expect.poll(()=>page.evaluate(()=>authCalls.length)).toBe(1);await expect(f.locator('[name=password]')).not.toHaveAttribute('pattern');await expect(f.locator('button.primary')).toBeEnabled();
});
test('signup constraints survive switching and reject blank names',async({page})=>{
 const f=page.locator('#authUnified');for(let i=0;i<3;i++)await f.locator('.auth-mode-switch').click();await f.locator('[name=email]').fill('test@example.invalid');await f.locator('[name=name]').fill('   ');await f.locator('[name=password]').fill('ValidPassword123');await f.locator('button.primary').click();expect(await page.evaluate(()=>authCalls.length)).toBe(0);await f.locator('[name=name]').fill('  Test User  ');await f.locator('[name=password]').fill('short');await f.locator('button.primary').click();expect(await page.evaluate(()=>authCalls.length)).toBe(0);await f.locator('[name=password]').fill('ValidPassword123');await f.locator('[name=password]').press('Enter');await expect.poll(()=>page.evaluate(()=>authCalls.length)).toBe(1);expect(await page.evaluate(()=>authCalls[0])).toEqual({mode:'signup',name:'Test User'});
});
