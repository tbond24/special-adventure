const {test,expect}=require('@playwright/test');
const APP_URL=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4178';

async function open(page){
  await page.goto(APP_URL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof renderHome==='function'&&booting===false);
  await page.evaluate(()=>{
    const make=(id,name,lat,lon)=>({id,rentAmount:12000,rentCurrency:'KES',rentPeriod:'month',deposit:12000,billsIncluded:false,availableFrom:'2026-10-01',minimumStayWeeks:8,status:'active',room:{id:`room-${id}`,name,roomType:'Studio',furnished:false,ensuite:true,maxOccupants:1,description:'A bright, secure home.',media:[]},property:{id:`property-${id}`,title:'Test property',suburb:'Kasarani',city:'Nairobi',state:'Nairobi',country:'Kenya',propertyType:'Apartment',parkingSpaces:1,petsConsidered:false,smokingAllowed:false,householdSummary:'Quiet managed property.',landmark:'Near transport',waterAvailable:true,electricityAvailable:true,securityAvailable:true,internetAvailable:true,publicLatitude:lat,publicLongitude:lon},owner:{id:`owner-${id}`,displayName:'Test lister',bio:'Responsive property manager'}});
    vacancyInventoryRefreshBusy=true;vacancies=[make('v1','Kasarani Studio',-1.218,36.896),make('v2','Ruiru Room',-1.15,36.96),make('v3','Westlands Unit',-1.267,36.81)];booting=false;renderHome();
  });
  await expect(page.locator('.explore-card')).toHaveCount(3);
}

test('mobile shell covers the safe area without horizontal movement',async({page})=>{
  await page.setViewportSize({width:390,height:844});await open(page);
  const result=await page.evaluate(()=>({viewport:document.querySelector('meta[name=viewport]').content,overflow:document.documentElement.scrollWidth-innerWidth,icons:getComputedStyle(document.querySelector('.mobile-nav .nav-icon')).width,currency:getComputedStyle(document.querySelector('#marketSelect')).width,blur:getComputedStyle(document.querySelector('.topbar')).backdropFilter}));
  expect(result.viewport).toContain('viewport-fit=cover');expect(result.overflow).toBeLessThanOrEqual(1);expect(result.icons).toBe('18px');expect(parseFloat(result.currency)).toBeLessThanOrEqual(60);expect(result.blur).toContain('7px');
});

test('detail heart and safety sheet use compact controls',async({page})=>{
  await open(page);await page.locator('.explore-card').first().click({position:{x:6,y:6}});
  await expect(page.getByRole('button',{name:'Save listing'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Listing safety options'})).toBeVisible();
  await expect(page.locator('#listingSafetySheet')).toBeHidden();await page.getByRole('button',{name:'Listing safety options'}).click();
  await expect(page.locator('#listingSafetySheet')).toBeVisible();await page.locator('#listingSafetyBackdrop').click({position:{x:2,y:2}});await expect(page.locator('#listingSafetySheet')).toBeHidden();
});

test('account settings are working line rows and admin is permission-gated',async({page})=>{
  await open(page);await page.evaluate(async()=>{currentUser={id:'member',email:'member@example.com'};VACANCY_BACKEND.adminOverview=async()=>({error:'admin required'});renderAccount()});
  await expect(page.locator('.settings-row')).toHaveCount(11);await expect(page.locator('#adminEntry')).toBeHidden();
  await page.locator('#settingNotifications').click();expect(await page.evaluate(()=>localStorage.getItem('vacancy-notification-pref-v1'))).toBe('off');
  await page.locator('#settingDistance').click();expect(await page.evaluate(()=>localStorage.getItem('vacancy-distance-unit-v1'))).toBeTruthy();
});

test('admin dashboard exposes health, queues, search and audited actions',async({page})=>{
  await open(page);await page.evaluate(async()=>{currentUser={id:'admin',email:'admin@example.com'};VACANCY_BACKEND.adminDashboard=async()=>({users_total:12,properties:5,units:7,active_listings:6,open_reports:1,oldest_report_hours:30,enquiries_7d:3,listings_7d:2,errors_24h:0});VACANCY_BACKEND.adminSearch=async()=>({users:[{id:'u1',display_name:'Member',account_status:'active'}],listings:[{id:'v1',name:'Studio',title:'House',suburb:'Perth',city:'Perth',status:'active'}]});VACANCY_BACKEND.adminReports=async()=>[{id:'r1',reason:'Incorrect details',status:'open',created_at:new Date().toISOString()}];VACANCY_BACKEND.adminAuditLog=async()=>[{id:1,action:'vacancy_paused',target_type:'vacancy',reason:'Owner request',created_at:new Date().toISOString()}];await renderAdmin()});
  await expect(page.getByRole('heading',{name:'Admin operations'})).toBeVisible();await expect(page.getByText('Core services reporting')).toBeVisible();await expect(page.getByRole('heading',{name:'Report queue'})).toBeVisible();await expect(page.getByRole('heading',{name:'Moderation history'})).toBeVisible();
});
