const { test, expect } = require('@playwright/test');
const crypto=require('crypto');
const APP=process.env.VACANCY_E2E_URL, API=process.env.SUPABASE_API_URL, ADMIN=process.env.SUPABASE_SERVICE_ROLE_KEY, ANON=process.env.SUPABASE_ANON_KEY;
const adminHeaders={apikey:ADMIN,Authorization:`Bearer ${ADMIN}`};
test.beforeAll(()=>{if(!API||!ADMIN||!API.startsWith('http://127.0.0.1:'))throw new Error('Isolated local Supabase required')});

test('deleted account loses local session, Auth access, refresh and protected routes',async({page,request})=>{
  const nonce=crypto.randomUUID(),email=`delete-${nonce}@vacancy.test`,password=`Qa-${nonce}-aA9`;
  const created=await request.post(`${API}/auth/v1/admin/users`,{headers:adminHeaders,data:{email,password,email_confirm:true}});expect(created.ok()).toBeTruthy();
  const user=await created.json();
  await page.goto(APP+'/#auth');await page.locator('#signin [name=email]').fill(email);await page.locator('#signin [name=password]').fill(password);await page.locator('#signin button').click();await expect(page.locator('#toast')).toContainText('Signed in');
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('vacancy-session-v01')));
  await page.goto(APP+'/#account');page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Delete account'}).click();
  await expect(page.locator('#toast')).toContainText('Account deleted');expect(await page.evaluate(()=>localStorage.getItem('vacancy-session-v01'))).toBeNull();
  const userCheck=await request.get(`${API}/auth/v1/user`,{headers:{apikey:ANON,Authorization:`Bearer ${before.access_token}`}});expect(userCheck.ok()).toBeFalsy();
  const refresh=await request.post(`${API}/auth/v1/token?grant_type=refresh_token`,{headers:{apikey:ANON},data:{refresh_token:before.refresh_token}});expect(refresh.ok()).toBeFalsy();
  const adminCheck=await request.get(`${API}/auth/v1/admin/users/${user.id}`,{headers:adminHeaders});expect(adminCheck.ok()).toBeFalsy();
  await page.goto(APP+'/#list');await expect(page.locator('#signin')).toBeVisible();
});
