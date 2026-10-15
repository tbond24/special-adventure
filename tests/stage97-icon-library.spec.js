const {test,expect}=require('@playwright/test');
const {installPresentationBackend}=require('./presentation-backend-fixture.cjs');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';
async function open(page){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.route('**/rest/v1/site_icon_overrides?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(APP+'/#home');
  await page.waitForFunction(()=>booting===false);
}
async function publish(host){await host.locator('[data-brand-save]').click();await expect(host.locator('[data-brand-status]')).toContainText('Private draft saved');await host.locator('[data-brand-review]').click();await host.locator('[data-brand-reason]').fill('Synthetic reviewed icon');await host.locator('[data-brand-publish]').click();await expect(host.locator('[data-brand-status]')).toContainText('verified in public settings');}
test('admin previews, saves and restores a shared icon',async({page})=>{
  await open(page);
  await page.evaluate(async()=>{
    currentUser={id:'admin',email:'admin@example.com'};
    VACANCY_BACKEND.adminMembership=async()=>true;
    VACANCY_BACKEND.assuranceLevel=()=> 'aal2';
    VACANCY_BACKEND.adminDashboard=async()=>({open_reports:0,oldest_report_hours:0,active_listings:0,users_total:1,properties:0,units:0,enquiries_7d:0,listings_7d:0,errors_24h:0});
    VACANCY_BACKEND.adminSearch=async()=>({users:[],listings:[]});
    VACANCY_BACKEND.adminReports=async()=>[];
    VACANCY_BACKEND.adminAuditLog=async()=>[];
    VACANCY_BACKEND.adminDailyMetrics=async()=>({total:0,days:7,series:[]});
    VACANCY_BACKEND.adminOperationalHealth=async()=>({email_sent:0,email_delivered:0,email_bounced:0,email_complained:0,email_failed:0,storage_bytes:0,client_errors:0});
    VACANCY_BACKEND.adminIconRevisions=async()=>[];
    window.iconWrites=[];
    VACANCY_BACKEND.adminSetSiteIcon=async(...args)=>{window.iconWrites.push(args)};
    history.replaceState(null,'','#admin');
  });
  await installPresentationBackend(page,{preserve:true});await page.evaluate(()=>renderAdmin());
  await page.evaluate(()=>document.querySelector('#adminSectionMenu [data-section=icons]')?.click());
  const panel=page.locator('#siteIconLibrary'),editor=page.locator('#iconEditor');
  await expect(panel).toBeVisible();expect(await panel.evaluate(n=>n.scrollWidth<=n.clientWidth+2)).toBeTruthy();
  const original=await page.locator('#icon-find').innerHTML();await editor.locator('[data-icon-source]').selectOption('house');expect(await page.locator('#icon-find').innerHTML()).toBe(original);
  await publish(editor);expect(await page.locator('#icon-find').innerHTML()).not.toBe(original);expect(await page.evaluate(()=>iconWrites)).toEqual([]);
  await editor.locator('[data-icon-original]').click();await publish(editor);expect(await page.locator('#icon-find').innerHTML()).toBe(original);
  await editor.locator('[data-icon-upload]').setInputFiles({name:'unsafe.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><script>alert(1)</script><path d="M1 1L22 22"/></svg>')});await expect(editor.locator('[data-brand-status]')).toContainText('Unsupported SVG');
  await editor.locator('[data-icon-upload]').setInputFiles({name:'safe.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 2 L22 22"/></svg>')});await publish(editor);await expect(page.locator('#icon-find path')).toHaveAttribute('d','M2 2 L22 22');
});

test('icon library is not shown before admin MFA verification',async({page})=>{
  await open(page);
  await page.evaluate(async()=>{
    currentUser={id:'admin',email:'admin@example.com'};
    VACANCY_BACKEND.adminMembership=async()=>true;
    VACANCY_BACKEND.assuranceLevel=()=> 'aal1';
    await renderAdmin();
  });
  await expect(page.locator('#siteIconLibrary')).toHaveCount(0);
  await expect(page.locator('.admin-security-gate')).toBeVisible();
});

test('MFA admin privately drafts an existing display setting without immediate publication',async({page})=>{
  await open(page);
  await page.evaluate(async()=>{
    currentUser={id:'admin',email:'admin@example.com'};
    VACANCY_BACKEND.adminMembership=async()=>true;
    VACANCY_BACKEND.assuranceLevel=()=> 'aal2';
    VACANCY_BACKEND.adminDashboard=async()=>({open_reports:0,oldest_report_hours:0,active_listings:0,users_total:1,properties:0,units:0,enquiries_7d:0,listings_7d:0,errors_24h:0});
    VACANCY_BACKEND.adminSearch=async()=>({users:[],listings:[]});
    VACANCY_BACKEND.adminReports=async()=>[];
    VACANCY_BACKEND.adminAuditLog=async()=>[];
    VACANCY_BACKEND.adminDailyMetrics=async()=>({total:0,days:7,series:[]});
    VACANCY_BACKEND.adminOperationalHealth=async()=>({email_sent:0,email_delivered:0,email_bounced:0,email_complained:0,email_failed:0,storage_bytes:0,client_errors:0});
    VACANCY_BACKEND.adminIconRevisions=async()=>[];
    VACANCY_BACKEND.listingDisplayOptions=async()=>[{slot:'listing-wifi',label:'Wi-Fi in listing details',enabled:true}];
    VACANCY_BACKEND.adminSetListingDisplayOption=async(...args)=>{window.__listingOptionWrite=args};
    history.replaceState(null,'','#admin');
  });
  await installPresentationBackend(page,{preserve:true});await page.evaluate(()=>renderAdmin());
  await page.evaluate(()=>document.querySelector('#adminSectionMenu [data-section=icons]')?.click());
  const check=page.locator('[data-display-enabled]');await expect(check).toBeChecked();await check.uncheck();
  await page.locator('[data-display-save]').click();await expect(page.locator('[data-display-status]')).toContainText('Private draft saved');
  expect(await page.evaluate(()=>window.__listingOptionWrite)).toBeUndefined();
});
