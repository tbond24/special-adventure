const {test, expect} = require('@playwright/test');
test.use({viewport:{width:390,height:844}});

test('guest can open the listing chooser and start a room on a small screen', async ({page}) => {
  const errors=[]; page.on('pageerror', error=>errors.push(error.message));
  // Boot intentionally has no inventory service. Navigate after that isolated
  // failure so the normal guest composer can render without hosted data.
  await page.goto('/#auth');
  await expect(page.locator('#authUnified')).toBeVisible();
  await page.locator('.mobile-nav [data-nav=list]').click();
  await expect(page.locator('[data-listing-type=Residential]')).toBeVisible();
  await page.locator('[data-listing-type=Residential]').click();
  await page.locator('[data-preset=Room]').click();
  await page.getByRole('button',{name:'New property',exact:true}).click();
  await expect(page.locator('#listingForm')).toBeVisible();
  await expect(page.locator('#listingForm')).toHaveAttribute('data-journey-step','0');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect(errors).toEqual([]);
});

test('invalid email stays on sign in without making an auth request', async ({page}) => {
  const submitted=[];
  page.on('request', request=>{if(request.method()==='POST' && request.url().includes('/auth/')) submitted.push(request.url());});
  await page.goto('/#auth');
  const form=page.locator('#authUnified');
  await form.locator('[name=email]').fill('invalid-email');
  await form.getByRole('button',{name:'Sign in',exact:true}).click();
  expect(await form.locator('[name=email]').evaluate(el=>el.validity.typeMismatch)).toBe(true);
  await expect(form).toBeVisible();
  expect(submitted).toEqual([]);
});

test('PostHog stays inert on normal navigation and cannot bypass preview isolation', async ({page}) => {
  const requests=[];
  page.on('request', request=>{if(/posthog/i.test(request.url())) requests.push(request.url());});
  await page.goto('/#auth');
  await expect(page.locator('#authUnified')).toBeVisible();
  expect(await page.evaluate(()=>VACANCY_POSTHOG.capture('vacancy_smoke_completed'))).toBe(false);
  // The adapter itself is a local asset; it must not fetch config or load an SDK.
  expect(requests.filter(url=>!url.includes('/src/posthog-analytics.js'))).toEqual([]);
  await page.goto('/#privacy');
  expect(await page.evaluate(()=>VACANCY_POSTHOG.setConsent(true))).toBe(false);
  expect(requests.some(url=>url.includes('/vendor/posthog/'))).toBe(false);
});
