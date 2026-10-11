const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

test.beforeEach(async({page})=>{
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);
  await page.waitForFunction(()=>booting===false);
});

test('List hides intermediate layouts until the dashboard is ready',async({page})=>{
  await page.evaluate(()=>{
    currentUser={id:'owner',email:'owner@example.com'};
    VACANCY_BACKEND.myProperties=async()=>{await new Promise(resolve=>setTimeout(resolve,250));return []};
    VACANCY_BACKEND.myVacancies=async()=>{await new Promise(resolve=>setTimeout(resolve,250));return []};
    VACANCY_BACKEND.ownerMetrics=async()=>({});
    nav('list');
  });
  await expect(page.locator('.listing-transition-loading')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Dashboard'})).toBeVisible();
  await expect(page.locator('.listing-transition-loading')).toHaveCount(0);
  await expect(page.locator('#ownerListSummary')).toHaveCount(0);
});

test('Edit profile expands inline and saves only the display name',async({page})=>{
  await page.evaluate(async()=>{
    currentUser={id:'owner',email:'owner@example.com',user_metadata:{display_name:'Owner'}};
    window.__accountProfile={display_name:'Owner'};
    VACANCY_BACKEND.profile=async()=>window.__accountProfile;
    VACANCY_BACKEND.blockedUsers=async()=>[];
    VACANCY_BACKEND.adminMembership=async()=>false;
    VACANCY_BACKEND.updateProfile=async data=>{window.__savedProfile=data;window.__accountProfile.display_name=data.displayName};
    await renderAccount();
  });
  await expect(page.locator('#profileForm')).toBeHidden();
  await page.locator('#editProfile').click();
  await expect(page.locator('#editProfile')).toHaveAttribute('aria-expanded','true');
  const account=page.locator('#profileForm');
  await expect(account.locator('[name=phoneNumber],[name=whatsappNumber]')).toHaveCount(0);
  await account.locator('[name=displayName]').fill('New owner');
  await account.getByRole('button',{name:'Save changes'}).click();
  await expect.poll(()=>page.evaluate(()=>window.__savedProfile)).toEqual({displayName:'New owner'});
  await expect(page.locator('#youProfile')).toBeHidden();
  await expect(page.locator('.account-identity h2')).toHaveText('New owner');
});
