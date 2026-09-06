const { test, expect } = require('@playwright/test');

const SUPABASE_URL='https://xtutkwiivqkgkqjpkxvj.supabase.co';
const SUPABASE_KEY='sb_publishable_w3YAIocUnB-Nc4ISHZqTWw_wg0zZR2R';
const APP_URL=process.env.VACANCY_E2E_URL || 'https://vacancy-nine.vercel.app';

async function openVacancy(page){
  await page.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1000);
}

// 1. Budget renter
// Goal: find an affordable room in a chosen suburb and inspect it.
test('S1 budget renter can find an affordable Subiaco room', async ({ page }) => {
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

// 2. Urgent mover
// Goal: only see rooms available by a specific date.
test('S2 urgent mover can filter by move-in deadline', async ({ page }) => {
  await openVacancy(page);
  await page.getByLabel('Move in by').fill('2026-09-12');
  await expect(page.locator('.card')).toHaveCount(1);
  await expect(page.locator('.card').first()).toContainText('Subiaco');
});

// 3. Ensuite seeker
// Goal: isolate rooms with a private bathroom.
test('S3 ensuite seeker can isolate ensuite inventory', async ({ page }) => {
  await openVacancy(page);
  await page.locator('#ensuite').check();
  await expect(page.locator('.card')).toHaveCount(1);
  await expect(page.locator('.card').first()).toContainText('Victoria Park');
});

// 4. Driver
// Goal: avoid rooms without parking.
test('S4 driver can require parking', async ({ page }) => {
  await openVacancy(page);
  await page.locator('#parking').check();
  await expect(page.locator('.card')).toHaveCount(3);
});

// 5. Two-person household
// Goal: avoid rooms that only permit one occupant.
test('S5 two-person household can filter by occupancy', async ({ page }) => {
  await openVacancy(page);
  await page.locator('#twoOccupants').check();
  await expect(page.locator('.card')).toHaveCount(1);
  await expect(page.locator('.card').first()).toContainText('Victoria Park');
});

// 6. Short-stay student
// Goal: find rooms whose minimum-stay requirement fits a 10-week stay.
test('S6 short-stay student can filter by planned stay', async ({ page }) => {
  await openVacancy(page);
  await page.getByLabel('Planned stay').fill('10');
  await expect(page.locator('.card')).toHaveCount(1);
  await expect(page.locator('.card').first()).toContainText('Subiaco');
});

// 7. Pet owner
// Goal: identify rooms where pets may be considered before enquiring.
test('S7 pet owner can filter pets-considered inventory', async ({ page }) => {
  await openVacancy(page);
  await page.locator('#pets').check();
  await expect(page.locator('.card')).toHaveCount(1);
  await expect(page.locator('.card').first()).toContainText('Subiaco');
});

// 8. First-time lister
// Goal: understand how to start listing a room without already knowing the product.
test('S8 first-time lister reaches account creation cleanly', async ({ page }) => {
  await openVacancy(page);
  await page.getByRole('button',{name:'List a room'}).click();
  await expect(page.getByRole('heading',{name:'Create account'})).toBeVisible();
  await expect(page.locator('#signup').getByLabel('Name')).toBeVisible();
  await expect(page.locator('#signup').getByLabel('Email')).toBeVisible();
  await expect(page.locator('#signup').getByLabel('Password')).toBeVisible();
});

// 9. Safety-conscious renter
// Goal: inspect a room and find obvious safety/report controls before contacting.
test('S9 safety-conscious renter can report or block from detail', async ({ page }) => {
  await openVacancy(page);
  await page.locator('.card').first().getByRole('button',{name:'View room'}).click();
  await expect(page.getByRole('button',{name:'Report listing'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Block lister'})).toBeVisible();
});

// 10. Mobile renter
// Goal: browse and search without horizontal layout breakage.
test('S10 mobile renter can browse without horizontal overflow', async ({ page }) => {
  await openVacancy(page);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
  expect(overflow).toBeFalsy();
  await page.getByLabel('Search location').fill('6008');
  await expect(page.locator('.card')).toHaveCount(1);
});

// Separate security/validation checks — not counted as user scenarios.
test('SEC signup form rejects weak password client-side', async ({ page }) => {
  await openVacancy(page);
  await page.getByRole('button',{name:'List a room'}).click();
  const signup=page.locator('#signup');
  await signup.getByLabel('Name').fill('Test User');
  await signup.getByLabel('Email').fill('invalid@example.com');
  await signup.getByLabel('Password').fill('short');
  await signup.getByRole('button',{name:'Create account'}).click();
  const password=signup.getByLabel('Password');
  expect(await password.evaluate(el=>el.validationMessage.length>0)).toBeTruthy();
});

test('SEC secure-signup rejects known leaked password', async ({ request }) => {
  const res=await request.post(`${SUPABASE_URL}/functions/v1/secure-signup`,{
    headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},
    data:{name:'Vacancy Security Test',email:'leaked-password-check@example.invalid',password:'Password123456A'}
  });
  expect(res.status()).toBe(400);
  const body=await res.json();
  expect(body.error).toBe('leaked_password');
});
