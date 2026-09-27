const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';
async function open(page,hash='auth'){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.route('**/rest/v1/site_icon_overrides?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(APP+'/#'+hash);
  await page.waitForFunction(()=>booting===false);
}
test('password visibility and account field feedback work in both auth modes',async({page})=>{
  await open(page);
  const form=page.locator('#authUnified');
  await expect(form).toBeVisible();
  const password=form.locator('input[name=password]');
  await form.getByRole('button',{name:'Show password'}).click();
  await expect(password).toHaveAttribute('type','text');
  await form.getByRole('button',{name:'Hide password'}).click();
  await expect(password).toHaveAttribute('type','password');
  await form.getByRole('button',{name:'Create account'}).click();
  await form.locator('input[name=name]').fill('Test User');
  await form.locator('input[name=email]').fill('test@example.com');
  await password.fill('SecurePassword123');
  await expect(form.locator('label.credential-complete')).toHaveCount(3);
  await expect(form.locator('input[name=password]')).toHaveAttribute('type','password');
});
test('password reset has separate visibility controls and matching feedback',async({page})=>{
  await page.route('**/auth/v1/user',route=>route.fulfill({status:200,contentType:'application/json',body:'{"id":"test"}'}));
  await open(page,'access_token=test-reset-token&type=recovery');
  const form=page.locator('#resetPassword');
  await expect(form).toBeVisible();
  await form.getByRole('button',{name:'Show password'}).first().click();
  await expect(form.locator('input[name=password]')).toHaveAttribute('type','text');
  await form.locator('input[name=password]').fill('SecurePassword123');
  await form.locator('input[name=confirmation]').fill('DifferentPassword123');
  await form.locator('input[name=confirmation]').blur();
  await expect(form.locator('input[name=confirmation]')).toHaveJSProperty('validationMessage','Passwords do not match');
  await form.locator('input[name=confirmation]').fill('SecurePassword123');
  await expect(form.locator('label.credential-complete')).toHaveCount(2);
});
test('admin section menu keeps real activity controls and switches graph to table',async({page})=>{
  await open(page,'home');
  await page.evaluate(async()=>{
    currentUser={id:'admin',email:'admin@example.com'};
    VACANCY_BACKEND.adminMembership=async()=>true;
    VACANCY_BACKEND.assuranceLevel=()=> 'aal2';
    VACANCY_BACKEND.adminDashboard=async()=>({open_reports:0,oldest_report_hours:0,active_listings:2,users_total:3,properties:2,units:2,enquiries_7d:1,listings_7d:1,errors_24h:0});
    VACANCY_BACKEND.adminSearch=async()=>({users:[],listings:[]});
    VACANCY_BACKEND.adminReports=async()=>[];
    VACANCY_BACKEND.adminAuditLog=async()=>[];
    VACANCY_BACKEND.adminDailyMetrics=async()=>({total:2,days:7,series:[{date:'2026-09-26',value:2}]});
    VACANCY_BACKEND.adminOperationalHealth=async()=>({email_sent:0,email_delivered:0,email_bounced:0,email_complained:0,email_failed:0,storage_bytes:0,client_errors:0});
    VACANCY_BACKEND.adminIconRevisions=async()=>[];
    await renderAdmin();
  });
  await expect(page.locator('#adminSectionMenu')).toBeAttached();
  await expect(page.locator('[data-admin-section=overview]')).toBeVisible();
  await page.evaluate(()=>document.querySelector('#adminSectionMenu [data-section=activity]').click());
  await expect(page.locator('[data-admin-section=activity]')).toBeVisible();
  await page.locator('#adminMetricView').selectOption('table');
  await expect(page.locator('.admin-metric-table')).toContainText('2026-09-26');
  await page.locator('#adminMetricView').selectOption('graph');
  await expect(page.locator('.metric-bars')).toBeVisible();
  await page.evaluate(()=>document.querySelector('#adminSectionMenu [data-section=icons]').click());
  await expect(page.locator('#siteIconLibrary')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBeTruthy();
});
