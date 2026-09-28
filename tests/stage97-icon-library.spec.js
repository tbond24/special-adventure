const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';
async function open(page){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.route('**/rest/v1/site_icon_overrides?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(APP+'/#home');
  await page.waitForFunction(()=>booting===false);
}
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
    await renderAdmin();
  });
  await page.evaluate(()=>document.querySelector('#adminSectionMenu [data-section=icons]')?.click());
  const panel=page.locator('#siteIconLibrary');
  await expect(panel).toBeVisible();
  expect(await panel.evaluate(element=>element.scrollWidth<=element.clientWidth+2)).toBeTruthy();
  await panel.locator('#iconSource').selectOption('house');
  await expect(panel.locator('.icon-library-preview')).toContainText('');
  await panel.getByRole('button',{name:'Save icon'}).click();
  await expect.poll(()=>page.evaluate(()=>document.querySelector('#icon-find').innerHTML)).toContain('m3 11');
  expect(await page.evaluate(()=>window.iconWrites)).toEqual([['find','house',null]]);
  await panel.getByRole('button',{name:'Restore original'}).click();
  await panel.getByRole('button',{name:'Save icon'}).click();
  expect(await page.evaluate(()=>window.iconWrites)).toEqual([['find','house',null],['find',null,null]]);
  await expect.poll(()=>page.evaluate(()=>document.querySelector('#icon-find').innerHTML)).toContain('circle');
  await panel.locator('input[type=file]').setInputFiles({name:'unsafe.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg viewBox="0 0 24 24"><script>alert(1)</script><path d="M1 1L22 22"/></svg>')});
  await expect(panel.locator('#iconMessage')).toContainText('Only simple path-based SVG');
  await panel.locator('input[type=file]').setInputFiles({name:'safe.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg viewBox="0 0 24 24"><path d="M2 2 L22 22"/></svg>')});
  await expect(panel.locator('#iconMessage')).toContainText('ready to preview');
  await panel.getByRole('button',{name:'Save icon'}).click();
  await expect.poll(()=>page.evaluate(()=>document.querySelector('#icon-find path')?.getAttribute('d'))).toBe('M2 2 L22 22');
  expect(await page.evaluate(()=>window.iconWrites.at(-1))).toEqual(['find',null,'M2 2 L22 22']);
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

test('MFA admin can turn an existing listing detail off in Appearance',async({page})=>{
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
    await renderAdmin();
  });
  await page.evaluate(()=>document.querySelector('#adminSectionMenu [data-section=icons]')?.click());
  const check=page.getByLabel('Wi-Fi in listing details');
  await expect(check).toBeChecked();
  await check.uncheck();
  await expect(page.locator('#listingDisplayOptions [role=status]')).toContainText('hidden');
  expect(await page.evaluate(()=>window.__listingOptionWrite)).toEqual(['listing-wifi',false]);
});
