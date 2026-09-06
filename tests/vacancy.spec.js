const { test, expect } = require('@playwright/test');

const SUPABASE_URL='https://xtutkwiivqkgkqjpkxvj.supabase.co';
const SUPABASE_KEY='sb_publishable_w3YAIocUnB-Nc4ISHZqTWw_wg0zZR2R';
const APP_URL=process.env.VACANCY_E2E_URL || 'https://vacancy-nine.vercel.app';

async function openVacancy(page){
  await page.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1000);
}

async function bootDiagnostics(page){
  const consoleErrors=[];
  const failed=[];
  const bad=[];
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  page.on('requestfailed',r=>failed.push(`${r.failure()?.errorText||'failed'} ${r.url()}`));
  page.on('response',r=>{if(r.status()>=400)bad.push(`${r.status()} ${r.url()}`)});
  await openVacancy(page);
  await page.waitForTimeout(2000);
  const body=(await page.locator('body').innerText()).slice(0,2000);
  console.log('VACANCY_DIAG_URL',page.url());
  console.log('VACANCY_DIAG_BODY',JSON.stringify(body));
  console.log('VACANCY_DIAG_CONSOLE',JSON.stringify(consoleErrors));
  console.log('VACANCY_DIAG_FAILED',JSON.stringify(failed));
  console.log('VACANCY_DIAG_BAD',JSON.stringify(bad));
  return {consoleErrors,failed,bad,body};
}

test('production boot diagnostic', async ({ page }) => {
  const d=await bootDiagnostics(page);
  expect(d.body).toContain('Find a room');
});

test('public marketplace loads and filters', async ({ page }) => {
  const errors=[]; page.on('console', m=>{ if(m.type()==='error') errors.push(m.text()) });
  const responses=[]; page.on('response', r=>{ if(r.status()>=400) responses.push(`${r.status()} ${r.url()}`) });
  await openVacancy(page);
  await expect(page.getByRole('heading',{name:/Find a room/i})).toBeVisible();
  await expect(page.locator('.card')).toHaveCount(3);
  await page.getByLabel('Search location').fill('Subiaco');
  await expect(page.locator('.card')).toHaveCount(1);
  await page.getByLabel('Search location').fill('');
  await page.getByLabel('Max weekly rent').fill('280');
  await expect(page.locator('.card')).toHaveCount(1);
  await page.locator('.card').first().getByRole('button',{name:'View room'}).click();
  await expect(page.getByRole('button',{name:'Enquire'})).toBeVisible();
  expect(errors).toEqual([]);
  expect(responses.filter(x=>!x.includes('favicon'))).toEqual([]);
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

test('mobile layout remains usable', async ({ page }) => {
  await openVacancy(page);
  await expect(page.getByRole('heading',{name:/Find a room/i})).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
  expect(overflow).toBeFalsy();
  await page.getByLabel('Search location').fill('6008');
  await expect(page.locator('.card')).toHaveCount(1);
});
