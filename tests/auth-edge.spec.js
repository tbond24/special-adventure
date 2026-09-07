const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL;
test('sign-in blocks repeated submissions and explains rate limits',async({page})=>{
  await page.goto(APP+'/#auth');let calls=0;
  await page.route('**/auth/v1/token?grant_type=password',async route=>{calls++;await new Promise(r=>setTimeout(r,300));await route.fulfill({status:429,json:{message:'rate limit exceeded'}})});
  await page.locator('#signin [name=email]').fill('member@vacancy.test');await page.locator('#signin [name=password]').fill('WrongPassword123');
  await page.locator('#signin button').click();await expect(page.locator('#signin button')).toBeDisabled();
  await page.locator('#signin').evaluate(form=>form.dispatchEvent(new Event('submit',{cancelable:true})));
  await expect(page.locator('#toast')).toContainText('rate limit');expect(calls).toBe(1);await expect(page.locator('#signin button')).toBeEnabled();
});
test('already signed-in users cannot reopen auth forms',async({page})=>{
  await page.goto(APP);await page.evaluate(()=>{currentUser={id:'member',email:'member@vacancy.test'};location.hash='auth'});
  await expect(page.locator('#signin')).toHaveCount(0);await expect(page.getByText('member@vacancy.test')).toBeVisible();
});
