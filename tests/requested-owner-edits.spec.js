const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL;

async function boot(page){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);
  await page.waitForFunction(()=>booting===false);
}

test('owner metrics change period and property rows reveal their units',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{
    currentUser={id:'owner'};
    VACANCY_BACKEND.myProperties=async()=>[];
    const property={id:'p1',title:'Plot 10',suburb:'Kilimani',city:'Nairobi',country:'Kenya'};
    VACANCY_BACKEND.myVacancies=async()=>Array.from({length:4},(_,index)=>({id:`v${index}`,status:'active',rent_amount:10000,rooms:{name:`Unit ${index+1}`,properties:property}}));
    window.__ranges=[];
    VACANCY_BACKEND.ownerDashboardMetrics=async(from,to)=>{window.__ranges.push({from,to});return {impressions:4,clicks:2,messages:1}};
    nav('list');
  });
  const group=page.locator('#mine details.property-tree');
  await expect(group).toHaveCount(1);
  await expect(group).not.toHaveAttribute('open','');
  await expect(group.locator('summary')).toContainText('Plot 10');
  await group.locator('summary').click();
  await expect(group.locator('.room-manage')).toHaveCount(4);
  await page.getByLabel('Metrics period').selectOption('30');
  await expect.poll(()=>page.evaluate(()=>window.__ranges.length)).toBeGreaterThanOrEqual(2);
  await page.getByLabel('Metrics period').selectOption('custom');
  await page.getByLabel('Metrics from').fill('2026-09-01');
  await page.getByLabel('Metrics to').fill('2026-09-03');
  await expect.poll(()=>page.evaluate(()=>window.__ranges.at(-1)?.from)).toContain('2026-08-31T16:00:00');
  await expect(page.locator('#createNewListing')).toHaveCSS('color','rgb(255, 255, 255)');
});

test('inbox shows the site header and saved has no back row',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{currentUser={id:'owner'};VACANCY_BACKEND.conversations=async()=>[];nav('messages')});
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.locator('.topbar .brand')).toBeVisible();
  await page.evaluate(()=>nav('saved'));
  await expect(page.locator('#app > .page-back')).toHaveCount(0);
});

test('admin adds a safe icon that a lister can select for a feature',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{
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
    VACANCY_BACKEND.siteIconSlots=async()=>[{slot:'custom-test',label:'BBQ',listing_kind:'amenity'}];
    VACANCY_BACKEND.siteIconOverrides=async()=>[{slot:'custom-test',path_d:'M2 2 L22 22'}];
    VACANCY_BACKEND.adminAddListingIcon=async()=> 'custom-test';
    renderAdmin();
  });
  await page.evaluate(()=>document.querySelector('#adminSectionMenu [data-section=icons]')?.click());
  const form=page.locator('#addListingIcon');
  await form.locator('[name=label]').fill('BBQ');
  await form.locator('[name=file]').setInputFiles({name:'bbq.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 2 L22 22"/></svg>')});
  await form.getByRole('button',{name:'Add to library'}).click();
  await expect(form.locator('[role=status]')).toContainText('Added');
  await expect.poll(()=>page.evaluate(()=>document.querySelector('#icon-custom-test path')?.getAttribute('d'))).toBe('M2 2 L22 22');
});
