const { test, expect } = require('@playwright/test');
const crypto = require('crypto');
const APP = process.env.VACANCY_E2E_URL;
const API = process.env.SUPABASE_API_URL;
const ADMIN = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
const adminHeaders = { apikey: ADMIN, Authorization: `Bearer ${ADMIN}` };
test.beforeAll(() => { if (!API || !ADMIN || !ANON || !API.startsWith('http://127.0.0.1:')) throw new Error('An isolated local Supabase stack is required.'); });

async function account(request) {
  const nonce=crypto.randomUUID(), email=`session-${nonce}@vacancy.test`, password=`Qa-${nonce}-aA9`;
  const response=await request.post(`${API}/auth/v1/admin/users`,{headers:adminHeaders,data:{email,password,email_confirm:true}});
  expect(response.ok()).toBeTruthy(); return {user:await response.json(),email,password};
}
async function login(page, credentials) {
  await page.goto(APP+'/#auth');
  await page.locator('#signin [name=email]').fill(credentials.email);
  await page.locator('#signin [name=password]').fill(credentials.password);
  await page.locator('#signin button').click();
  await expect(page.locator('#toast')).toContainText('Signed in');
}

test('session survives reload and refreshes an invalid access token', async ({page,request}) => {
  const a=await account(request);
  try {
    await login(page,a); await page.goto(APP+'/#account');
    await expect(page.getByText(a.email)).toBeVisible();
    await page.reload(); await expect(page.getByText(a.email)).toBeVisible();
    await page.evaluate(()=>{const key='vacancy-session-v01',s=JSON.parse(localStorage.getItem(key));s.access_token='invalid';localStorage.setItem(key,JSON.stringify(s))});
    await page.reload(); await expect(page.getByText(a.email)).toBeVisible();
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('vacancy-session-v01')).access_token);
    expect(stored).not.toBe('invalid');
  } finally { await request.delete(`${API}/auth/v1/admin/users/${a.user.id}`,{headers:adminHeaders}); }
});

test('network loss preserves recoverable state; malformed state is removed', async ({page,request}) => {
  const a=await account(request);
  try {
    await login(page,a);
    const before=await page.evaluate(()=>localStorage.getItem('vacancy-session-v01'));
    await page.route('**/auth/v1/user',route=>route.abort());
    const outcome=await page.evaluate(()=>VACANCY_BACKEND.currentUser().then(()=>null,e=>e.name));
    expect(outcome).toBeTruthy();
    expect(await page.evaluate(()=>localStorage.getItem('vacancy-session-v01'))).toBe(before);
    await page.unroute('**/auth/v1/user');
    await page.evaluate(()=>localStorage.setItem('vacancy-session-v01','{broken'));
    await page.reload();
    expect(await page.evaluate(()=>localStorage.getItem('vacancy-session-v01'))).toBeNull();
    await page.goto(APP+'/#account'); await expect(page.locator('#signin')).toBeVisible();
  } finally { await request.delete(`${API}/auth/v1/admin/users/${a.user.id}`,{headers:adminHeaders}); }
});

test('wrong password is rejected and signout clears local state and revokes refresh', async ({page,request}) => {
  const a=await account(request);
  try {
    const wrong=await request.post(`${API}/auth/v1/token?grant_type=password`,{headers:{apikey:ANON},data:{email:a.email,password:'WrongPassword123'}});
    expect(wrong.ok()).toBeFalsy();
    await login(page,a);
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('vacancy-session-v01')));
    await page.goto(APP+'/#account'); await page.getByRole('button',{name:'Sign out'}).click();
    await expect(page.locator('#toast')).toContainText('Signed out');
    expect(await page.evaluate(()=>localStorage.getItem('vacancy-session-v01'))).toBeNull();
    const refresh=await request.post(`${API}/auth/v1/token?grant_type=refresh_token`,{headers:{apikey:ANON},data:{refresh_token:saved.refresh_token}});
    expect(refresh.ok()).toBeFalsy();
    await page.goto(APP+'/#account'); await expect(page.locator('#signin')).toBeVisible();
  } finally { await request.delete(`${API}/auth/v1/admin/users/${a.user.id}`,{headers:adminHeaders}); }
});
