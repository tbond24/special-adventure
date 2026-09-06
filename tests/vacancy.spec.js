const { test, expect } = require('@playwright/test');

const SUPABASE_URL='https://xtutkwiivqkgkqjpkxvj.supabase.co';
const SUPABASE_KEY='sb_publishable_w3YAIocUnB-Nc4ISHZqTWw_wg0zZR2R';
const APP_URL=process.env.VACANCY_E2E_URL || 'https://vacancy-nine.vercel.app';

async function openVacancy(page){
  await page.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1000);
}

test('production boot diagnostic', async ({ page }) => {
  await openVacancy(page);
  await expect(page.getByText('Find a room.',{exact:false})).toBeVisible();
});

test('budget renter can search filter and inspect a room', async ({ page }) => {
  const errors=[]; page.on('console', m=>{ if(m.type()==='error') errors.push(m.text()) });
  await openVacancy(page);
  await expect(page.locator('.card')).toHaveCount(3);
  await page.getByLabel('Search location').fill('Subiaco');
  await page.getByLabel('Max weekly rent').fill('280');
  await expect(page.locator('.card')).toHaveCount(1);
  await page.locator('.card').first().getByRole('button',{name:'View room'}).click();
  await expect(page.getByRole('button',{name:'Enquire'})).toBeVisible();
  expect(errors).toEqual([]);
});

test('student can filter by move-in deadline', async ({ page }) => {
  await openVacancy(page);
  await page.getByLabel('Move in by').fill('2026-09-12');
  await expect(page.locator('.card')).toHaveCount(1);
  await expect(page.locator('.card').first()).toContainText('Subiaco');
});

test('ensuite seeker can isolate ensuite inventory', async ({ page }) => {
  await openVacancy(page);
  await page.locator('#ensuite').check();
  await expect(page.locator('.card')).toHaveCount(1);
  await expect(page.locator('.card').first()).toContainText('Victoria Park');
});

test('driver can require parking', async ({ page }) => {
  await openVacancy(page);
  await page.locator('#parking').check();
  await expect(page.locator('.card')).toHaveCount(3);
});

test('two-occupant seeker gets an honest empty state when no room fits', async ({ page }) => {
  await openVacancy(page);
  await page.locator('#twoOccupants').check();
  await expect(page.locator('.card')).toHaveCount(0);
  await expect(page.getByText('No active vacancies match those filters.')).toBeVisible();
});

test('auth gating and signup validation', async ({ page }) => {
  await openVacancy(page);
  await page.getByRole('button',{name:'List a room'}).click();
  await expect(page.getByRole('heading',{name:'Create account'})).toBeVisible();
  const signup=page.locator('#signup');
  await signup.getByLabel('Name').fill('Test User');
  await signup.getByLabel('Email').fill('invalid@example.com');
  await signup.getByLabel('Password').fill('short');
  await signup.getByRole('button',{name:'Create account'}).click();
  const password=signup.getByLabel('Password');
  expect(await password.evaluate(el=>el.validationMessage.length>0)).toBeTruthy();
});

test('secure signup rejects a known leaked password', async ({ request }) => {
  const res=await request.post(`${SUPABASE_URL}/functions/v1/secure-signup`,{
    headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},
    data:{name:'Vacancy Security Test',email:'leaked-password-check@example.invalid',password:'Password123456A'}
  });
  expect(res.status()).toBe(400);
  const body=await res.json();
  expect(body.error).toBe('leaked_password');
});

test('mobile layout remains usable with expanded filters', async ({ page }) => {
  await openVacancy(page);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
  expect(overflow).toBeFalsy();
  await page.getByLabel('Search location').fill('6008');
  await expect(page.locator('.card')).toHaveCount(1);
  await expect(page.getByLabel('Move in by')).toBeVisible();
});
