const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL;
const open=async(page,path='')=>{await page.route('**/rest/v1/vacancies**',route=>route.fulfill({status:200,headers:{'content-type':'application/json','content-range':'0-0/0'},body:'[]'}));await page.goto(APP+path)};
test('sign-in blocks repeated submissions and explains rate limits',async({page})=>{
  await open(page,'/#auth');let calls=0,releaseRequest;
  const requestHeld=new Promise(resolve=>{releaseRequest=resolve});
  await page.route('**/auth/v1/token?grant_type=password',async route=>{calls++;await requestHeld;await route.fulfill({status:429,json:{message:'rate limit exceeded'}})});
  await page.locator('#authUnified [name=email]').fill('member@vacancy.test');await page.locator('#authUnified [name=password]').fill('WrongPassword123');
  const submit=page.locator('#authUnified').getByRole('button',{name:'Sign in',exact:true});await submit.click();await expect(submit).toBeDisabled();
  await page.locator('#authUnified').evaluate(form=>form.dispatchEvent(new Event('submit',{cancelable:true})));
  await page.waitForTimeout(100);expect(calls).toBe(1);releaseRequest();
  await expect(page.locator('#toast')).toContainText('rate limit');await expect(submit).toBeEnabled();
});
test('already signed-in users cannot reopen auth forms',async({page})=>{
  const user={id:'synthetic-auth-edge-member',email:'member@vacancy.test',email_confirmed_at:'2026-10-11T00:00:00Z',is_anonymous:false};
  await page.route('**/auth/v1/user',route=>route.fulfill({json:user}));
  await page.route('**/rest/v1/profiles?**',route=>route.fulfill({json:[{id:user.id,display_name:'Member'}]}));
  await page.route('**/rest/v1/profile_private_contacts?**',route=>route.fulfill({json:[]}));
  await open(page);await expect(page.locator('#exploreMap')).toBeVisible();
  await page.evaluate(user=>{localStorage.setItem('vacancy-session-v01',JSON.stringify({access_token:'synthetic.'+btoa(JSON.stringify({sub:user.id,exp:4102444800,aal:'aal1'}))+'.synthetic',refresh_token:'synthetic-auth-edge-refresh',expires_at:4102444800,user}));currentUser=user;nav('auth')},user);
  await expect(page.locator('#authUnified')).toHaveCount(0);await expect(page.getByText('member@vacancy.test')).toBeVisible();
});
