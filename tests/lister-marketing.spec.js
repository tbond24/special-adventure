const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:8765';
test.beforeEach(async({page})=>{
  if(!['127.0.0.1','localhost'].includes(new URL(APP).hostname))throw Error('Marketing fixtures require a local development target');
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin!==new URL(APP).origin)return route.fulfill({status:200,contentType:'application/json',body:url.pathname.includes('/rpc/')?'{}':'[]'});
    if(url.pathname==='/') {
      // Permit requests to reach Playwright's mocks, never the external network.
      const response=await route.fetch(),headers={...response.headers()};delete headers['content-security-policy'];
      return route.fulfill({response,headers});
    }
    return route.continue();
  });
});

async function open(page,url){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.route('**/rest/v1/site_icon_overrides?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(APP+url);
  await page.waitForFunction(()=>booting===false);
}

test('first touch and session source persist without changing Find',async({page})=>{
  const events=[];
  await page.route('**/rest/v1/rpc/record_lister_journey',route=>{
    events.push(...JSON.parse(route.request().postData()).p_events);
    return route.fulfill({status:200,contentType:'application/json',body:'1'});
  });
  await open(page,'/?utm_source=flyer&utm_medium=qr&utm_campaign=kenya_launch#home');
  await expect(page.locator('#adminSectionMenu')).toHaveCount(0);
  await page.waitForFunction(()=>window.VACANCY_LISTER_JOURNEY);
  await page.evaluate(()=>VACANCY_LISTER_JOURNEY.flush());
  expect(events.find(event=>event.event_name==='lister_landing_viewed')).toMatchObject({source:'flyer',medium:'qr',campaign:'kenya_launch',first_source:'flyer'});
  const first=events[0];
  await page.goto(APP+'/#home');
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(()=>VACANCY_LISTER_JOURNEY.track('list_property_clicked'));
  await page.evaluate(()=>VACANCY_LISTER_JOURNEY.flush());
  const last=events.at(-1);
  expect(last.visitor_id).toBe(first.visitor_id);
  expect(last.session_id).toBe(first.session_id);
  expect(last.first_source).toBe('flyer');
  expect(last.source).toBe('flyer');
});

test('analytics storage failure does not block listing choices',async({page})=>{
  await page.route('**/rest/v1/rpc/record_lister_journey',route=>route.fulfill({status:503,contentType:'application/json',body:'{"message":"offline"}'}));
  await open(page,'/#home');
  await page.evaluate(async()=>{history.replaceState(null,'','#list');currentUser={id:'owner'};VACANCY_BACKEND.myProperties=async()=>[];VACANCY_BACKEND.myVacancies=async()=>[];await renderList();nav('list','new')});
  await page.locator('[data-listing-type=House]').click();
  await page.getByRole('button',{name:'New property'}).click();
  await expect(page.locator('#listingForm[data-journey-step="0"]')).toBeVisible();
  await page.evaluate(()=>VACANCY_LISTER_JOURNEY.flush());
  await expect(page.locator('#listingForm[data-journey-step="0"]')).toBeVisible();
});

test('Marketing results are added only after verified admin rendering',async({page})=>{
  await open(page,'/#home');
  await page.evaluate(async()=>{
    currentUser={id:'visitor',email:'visitor@example.com'};
    VACANCY_BACKEND.adminMembership=async()=>false;
    await renderAdmin();
  });
  await expect(page.locator('[data-admin-section=marketing]')).toHaveCount(0);
  await page.evaluate(async()=>{
    currentUser={id:'admin',email:'admin@example.com'};
    VACANCY_BACKEND.adminMembership=async()=>true;
    VACANCY_BACKEND.assuranceLevel=()=> 'aal2';
    VACANCY_BACKEND.adminDashboard=async()=>({open_reports:0,oldest_report_hours:0,active_listings:0,users_total:0,properties:0,units:0,enquiries_7d:0,listings_7d:0,errors_24h:0});
    VACANCY_BACKEND.adminSearch=async()=>({users:[],listings:[]});
    VACANCY_BACKEND.adminReports=async()=>[];
    VACANCY_BACKEND.adminAuditLog=async()=>[];
    VACANCY_BACKEND.adminDailyMetrics=async()=>({total:0,days:7,series:[]});
    VACANCY_BACKEND.adminOperationalHealth=async()=>({email_sent:0,email_delivered:0,email_bounced:0,email_complained:0,email_failed:0,storage_bytes:0,client_errors:0});
    VACANCY_BACKEND.adminIconRevisions=async()=>[];
    VACANCY_BACKEND.adminListerMarketing=async()=>({generated_at:new Date().toISOString(),events:[
      {id:'event1',event_name:'lister_landing_viewed',visitor_id:'visitor1',session_id:'session1',source:'flyer',created_at:'2026-10-04T00:00:00Z'},
      {id:'event2',event_name:'listing_started',visitor_id:'visitor1',session_id:'session1',source:'flyer',created_at:'2026-10-04T00:01:00Z'},
      {id:'event3',event_name:'listing_submitted',visitor_id:'visitor1',session_id:'session1',source:'flyer',vacancy_id:'listing1',created_at:'2026-10-04T00:05:00Z'}
    ],publications:[{vacancy_id:'listing1',property_id:'property1',visitor_id:'visitor1',session_id:'session1',source:'flyer',is_first_property_publication:true,created_at:'2026-10-04T00:05:01Z'}]});
    await renderAdmin();
  });
  if(await page.locator('.admin-section-select').isVisible())await page.locator('.admin-section-select').selectOption('marketing');
  else await page.locator('#adminSectionMenu [data-section=marketing]').click();
  await expect(page.locator('[data-admin-section=marketing]')).toBeVisible();
  await expect(page.locator('[data-admin-section=marketing]')).toContainText('First recorded publications');
  await expect(page.locator('[data-admin-section=marketing]')).toContainText('1');
  await expect(page.locator('[data-marketing-results]')).toContainText('Recorded stage activity');
  await expect(page.locator('[data-marketing-view=funnel]')).toHaveCount(0);
});
