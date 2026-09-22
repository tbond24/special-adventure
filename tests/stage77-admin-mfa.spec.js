const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

async function boot(page){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(()=>{
    currentUser={id:'admin-one',email:'owner@example.com',is_anonymous:false,user_metadata:{display_name:'Owner'}};
    VACANCY_BACKEND.profile=async()=>({display_name:'Owner'});
    VACANCY_BACKEND.blockedUsers=async()=>[];
    VACANCY_BACKEND.adminMembership=async()=>true;
    VACANCY_BACKEND.mfaFactors=async()=>[{id:'factor-one',factor_type:'totp',status:'verified'}];
    VACANCY_BACKEND.assuranceLevel=()=> 'aal1';
  });
}

test('account exposes authenticator security without exposing admin data',async({page})=>{
  await boot(page);
  await page.evaluate(()=>renderAccount());
  await expect(page.locator('#authenticatorSecurity')).toContainText('Authenticator app');
  await expect(page.locator('#adminEntry')).toBeVisible();
});

test('admin route requires a verified AAL2 session',async({page})=>{
  await boot(page);
  await page.evaluate(()=>renderAdmin());
  await expect(page.getByRole('heading',{name:'Admin verification'})).toBeVisible();
  await page.locator('#verifyAdminMfa').click();
  await expect(page.getByRole('heading',{name:'Verify it is you'})).toBeVisible();
  await expect(page.getByLabel('Authenticator code')).toBeFocused();
  await expect(page.locator('#adminHost')).toHaveCount(0);
});
