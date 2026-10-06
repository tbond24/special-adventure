const {test,expect}=require('@playwright/test');
const base='http://127.0.0.1:8776',key='vacancy-session-v01';
const access='header.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600,aal:'aal1'})).toString('base64url')+'.synthetic';
const callback='#access_token='+access+'&refresh_token=synthetic-refresh&token_type=bearer&expires_in=3600';
test.beforeEach(async({page})=>{
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.origin===base){if(u.pathname==='/'){const r=await route.fetch(),headers={...r.headers()};delete headers['content-security-policy'];return route.fulfill({response:r,headers});}return route.continue();}
  if(u.pathname==='/auth/v1/user')return route.fulfill({status:200,json:{id:'synthetic-google-user',email:'test@example.invalid',user_metadata:{display_name:'Test'},is_anonymous:false}});
  return route.fulfill({status:200,json:u.pathname.includes('/rpc/')?{}:[]});
 });
});
test('Google callback creates normal session and survives reload without reset page',async({page})=>{
 await page.goto(base+'/'+callback);await page.waitForFunction(()=>booting===false);
 expect(new URL(page.url()).hash).toBe('#home');await expect(page.getByRole('heading',{name:'Choose a new password'})).toHaveCount(0);
 expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).refresh_token,key)).toBe('synthetic-refresh');
 expect(await page.evaluate(()=>currentUser.id)).toBe('synthetic-google-user');
 await page.reload();await page.waitForFunction(()=>booting===false);expect(await page.evaluate(()=>currentUser.id)).toBe('synthetic-google-user');
});
test('explicit recovery stays isolated and allows password reset submission',async({page})=>{
 let resetCalls=0;await page.route('**/functions/v1/secure-password-reset',route=>{resetCalls++;return route.fulfill({status:200,json:{}})});
 await page.goto(base+'/'+callback+'&type=recovery');await expect(page.locator('#resetPassword')).toBeVisible();expect(new URL(page.url()).hash).toBe('#reset-password');expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull();
 await page.locator('[name=password]').fill('SyntheticReset123');await page.locator('[name=confirmation]').fill('SyntheticReset123');await page.getByRole('button',{name:'Save new password'}).click();await expect(page.locator('#resetHost')).toContainText('Password updated');expect(resetCalls).toBe(1);
});
test('signup confirmation keeps email confirmation flow without saving session',async({page})=>{
 await page.goto(base+'/'+callback+'&type=signup');await expect(page.locator('#authNotice')).toContainText('Email confirmed');expect(new URL(page.url()).hash).toBe('#auth');expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull();
});
test('OAuth failure returns to sign in with a safe notice instead of password reset',async({page})=>{
 await page.goto(base+'/#error=server_error&error_description=OAuth+state+not+found+or+expired');await expect(page.locator('#authNotice')).toContainText('Sign-in could not be completed');expect(new URL(page.url()).hash).toBe('#auth');await expect(page.locator('#resetStatus')).toHaveCount(0);expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull();
});
test('invalid recovery and signup links keep their own errors',async({page})=>{
 await page.goto(base+'/#error=access_denied&error_code=otp_expired&type=recovery');await expect(page.locator('#resetStatus')).toContainText('invalid or expired');await expect(page.locator('#resetPassword')).toHaveCount(0);
 await page.goto(base+'/#error=access_denied&error_code=otp_expired&type=signup');await expect(page.locator('#authNotice')).toContainText('confirmation link is invalid or expired');
});
