const { test, expect } = require('@playwright/test');
const crypto = require('crypto');
const APP = process.env.VACANCY_E2E_URL;
const API = process.env.SUPABASE_API_URL;
const ADMIN = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
const adminHeaders = { apikey: ADMIN, Authorization: `Bearer ${ADMIN}` };

test.beforeAll(() => { if (!API || !ADMIN || !ANON || !API.startsWith('http://127.0.0.1:')) throw new Error('An isolated local Supabase stack is required.'); });

test('genuine signup confirmation link confirms email and lands on sign in safely', async ({ page, request }) => {
  const nonce = crypto.randomUUID();
  const email = `confirmation-${nonce}@vacancy.test`;
  const password = `Confirm-${nonce}-aA9`;
  const created = await request.post(`${API}/auth/v1/admin/users`, { headers: adminHeaders, data: { email, password, email_confirm: false } });
  expect(created.ok()).toBeTruthy();
  const user = await created.json();
  try {
    const linkResponse = await request.post(`${API}/auth/v1/admin/generate_link`, { headers: adminHeaders, data: { type: 'signup', email, redirect_to: APP + '/' } });
    expect(linkResponse.ok()).toBeTruthy();
    const link = (await linkResponse.json()).action_link;
    await page.goto(link);
    await expect(page.locator('#authNotice')).toContainText('Email confirmed');
    expect(page.url()).not.toContain('access_token');
    expect(await page.evaluate(() => localStorage.getItem('vacancy-session-v01'))).toBeNull();
    await page.locator('#signin [name=email]').fill(email);
    await page.locator('#signin [name=password]').fill(password);
    await page.locator('#signin button').click();
    await expect(page.locator('#toast')).toContainText('Signed in');
  } finally {
    await request.delete(`${API}/auth/v1/admin/users/${user.id}`, { headers: adminHeaders });
  }
});

test('invalid signup confirmation is scrubbed and explained', async ({ page }) => {
  await page.goto(APP + '/#error=access_denied&error_code=otp_expired&type=signup');
  await expect(page.locator('#authNotice')).toContainText('invalid or expired');
  expect(page.url()).not.toContain('error_code');
});
