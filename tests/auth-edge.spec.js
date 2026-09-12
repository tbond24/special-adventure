const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL;
const open=async(page,path='')=>{await page.route('**/rest/v1/vacancies**',route=>route.fulfill({status:200,headers:{'content-type':'application/json','content-range':'0-0/0'},body:'[]'}));await page.goto(APP+path)};
test('sign-in blocks repeated submissions and explains rate limits',async({page})=>{
  await open(page,'/#auth');let calls=0;
  await page.route('**/auth/v1/token?grant_type=password',async route=>{calls++;await new Promise(r=>setTimeout(r,300));await route.fulfill({status:429,json:{message:'rate limit exceeded'}})});
  await page.locator('#authUnified [name=email]').fill('member@vacancy.test');await page.locator('#authUnified [name=password]').fill('WrongPassword123');
  const submit=page.locator('#authUnified').getByRole('button',{name:'Sign in',exact:true});await submit.click();await expect(submit).toBeDisabled();
  await page.locator('#authUnified').evaluate(form=>form.dispatchEvent(new Event('submit',{cancelable:true})));
  await expect(page.locator('#toast')).toContainText('rate limit');expect(calls).toBe(1);await expect(submit).toBeEnabled();
});
test('already signed-in users cannot reopen auth forms',async({page})=>{
  await open(page);await expect(page.locator('#exploreMap')).toBeVisible();
  await page.evaluate(()=>{currentUser={id:'member',email:'member@vacancy.test'};nav('auth')});
  await expect(page.locator('#authUnified')).toHaveCount(0);await expect(page.getByText('member@vacancy.test')).toBeVisible();
});
