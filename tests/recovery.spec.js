const { test, expect } = require('@playwright/test');
const crypto = require('crypto');
const APP = process.env.VACANCY_E2E_URL;
const API = process.env.SUPABASE_API_URL;
const ADMIN = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
const adminHeaders = { apikey: ADMIN, Authorization: `Bearer ${ADMIN}` };
test.beforeAll(() => { if (!API || !ADMIN || !ANON || !API.startsWith('http://127.0.0.1:')) throw new Error('An isolated local Supabase stack is required.'); });

test('genuine recovery request and Supabase link change password; old password fails', async ({ page, request }) => {
  const nonce = crypto.randomUUID();
  const email = `recovery-${nonce}@vacancy.test`;
  const oldPassword = `Old-${nonce}-aA9`;
  const password = `New-${crypto.randomUUID()}-aA9`;
  const created = await request.post(`${API}/auth/v1/admin/users`, { headers: adminHeaders, data: { email, password: oldPassword, email_confirm: true } });
  expect(created.ok()).toBeTruthy();
  const user = await created.json();
  try {
    await page.goto(APP + '/#auth');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await page.locator('#recoveryRequest [name=email]').fill(email);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.locator('#recoveryRequest [role=status]')).toContainText('If an account exists');
    // Generates a real Supabase recovery link; this does not claim branded email delivery.
    const linkResponse = await request.post(`${API}/auth/v1/admin/generate_link`, { headers: adminHeaders, data: { type: 'recovery', email, redirect_to: APP + '/#reset-password' } });
    expect(linkResponse.ok()).toBeTruthy();
    const link = (await linkResponse.json()).action_link;
    await page.goto(link);
    await expect(page.locator('#resetPassword')).toBeVisible();
    expect(page.url()).not.toContain('access_token');
    expect(await page.evaluate(() => localStorage.getItem('vacancy-session-v01'))).toBeNull();
    await page.locator('#resetPassword [name=password]').fill(password);
    await page.locator('#resetPassword [name=confirmation]').fill('Mismatch12345');
    await page.getByRole('button', { name: 'Save new password' }).click();
    await expect(page.locator('#resetPassword [role=status]')).toContainText('do not match');
    await page.locator('#resetPassword [name=confirmation]').fill(password);
    await page.getByRole('button', { name: 'Save new password' }).click();
    await expect(page.locator('#resetHost')).toContainText('Password updated', { timeout: 30000 });
    const oldLogin = await request.post(`${API}/auth/v1/token?grant_type=password`, { headers: { apikey: ANON }, data: { email, password: oldPassword } });
    expect(oldLogin.ok()).toBeFalsy();
    await page.getByRole('link', { name: 'Sign in', exact: true }).click();
    await page.locator('#signin [name=email]').fill(email);
    await page.locator('#signin [name=password]').fill(password);
    await page.locator('#signin button').click();
    await expect(page.locator('#toast')).toContainText('Signed in');
    await page.goto(link);
    await expect(page.locator('#resetStatus')).toContainText('invalid or expired');
  } finally {
    const removed = await request.delete(`${API}/auth/v1/admin/users/${user.id}`, { headers: adminHeaders });
    expect(removed.ok()).toBeTruthy();
  }
});

test('invalid, expired and absent recovery credentials fail safely', async ({ page }) => {
  for (const hash of ['#reset-password', '#error=access_denied&error_code=otp_expired&type=recovery', '#access_token=invalid&type=recovery']) {
    await page.goto(APP + '/' + hash);
    await expect(page.locator('#resetStatus')).toContainText('invalid or expired');
    await expect(page.locator('#resetPassword')).toHaveCount(0);
    expect(page.url()).not.toContain('access_token');
  }
});

test('request handles network failure, rate limit and duplicate submissions (injected transport faults)', async ({ page }) => {
  await page.goto(APP + '/#forgot-password');
  await page.locator('[name=email]').fill('unknown@vacancy.test');
  await page.route('**/auth/v1/recover?*', route => route.abort());
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.locator('[role=status]').filter({ hasText: 'Connection unavailable' })).toBeVisible();
  await page.unroute('**/auth/v1/recover?*');
  let calls = 0;
  await page.route('**/auth/v1/recover?*', async route => { calls++; await new Promise(r => setTimeout(r, 300)); await route.fulfill({ status: 429, json: {} }); });
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('button', { name: 'Send reset link' })).toBeDisabled();
  await page.locator('form').evaluate(form => form.dispatchEvent(new Event('submit', { cancelable: true })));
  await expect(page.locator('#recoveryRequest [role=status]')).toContainText('Too many attempts');
  expect(calls).toBe(1);
  await expect(page.getByRole('button', { name: 'Send reset link' })).toBeEnabled();
});
