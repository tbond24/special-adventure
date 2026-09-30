const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL;
const API='https://xtutkwiivqkgkqjpkxvj.supabase.co';
const KEY='sb_publishable_w3YAIocUnB-Nc4ISHZqTWw_wg0zZR2R';

test('deployed preview starts without script errors and serves public discovery',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const response=await page.goto(`${APP}/#home`,{waitUntil:'domcontentloaded'});
  expect(response.status()).toBe(200);
  await page.waitForFunction(()=>booting===false);
  await expect(page.locator('#exploreMap')).toBeVisible();
  expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
  const timings=await page.evaluate(()=>({navigation:Math.round(performance.getEntriesByType('navigation')[0]?.responseEnd||0),resources:performance.getEntriesByType('resource').length}));
  console.log('PUBLIC_DISCOVERY',JSON.stringify(timings));
});

test('a temporary vacancy load failure offers a working Retry',async({page})=>{
  let calls=0;
  await page.route('**/rest/v1/vacancies?**',route=>{
    calls++;
    return route.fulfill(calls===1?{status:503,contentType:'application/json',body:'{"message":"temporary outage"}'}:{status:200,contentType:'application/json',body:'[]'});
  });
  await page.route('**/rest/v1/rpc/record_client_error',route=>route.fulfill({status:200,contentType:'application/json',body:'null'}));
  await page.goto(`${APP}/#home`);
  await expect(page.getByRole('button',{name:'Retry'})).toBeVisible();
  await page.getByRole('button',{name:'Retry'}).click();
  await expect(page.locator('#exploreMap')).toBeVisible();
  expect(calls).toBe(2);
});

test('anonymous visitor cannot read messages or private account tables',async({request})=>{
  const headers={apikey:KEY};
  for(const table of ['conversations','conversation_members','messages','admin_users','profile_private_contacts']){
    const response=await request.get(`${API}/rest/v1/${table}?select=*&limit=1`,{headers});
    expect(response.status(),table).toBeLessThan(500);
    if(response.ok())expect(await response.json(),table).toEqual([]);
    else expect([401,403],table).toContain(response.status());
  }
});

test('mobile cold sign-in page remains usable on a constrained connection',async({page,isMobile})=>{
  test.skip(!isMobile);
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:95000});
  const start=Date.now(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${APP}/#auth`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>booting===false,null,{timeout:30000});
  await expect(page.locator('#authUnified')).toBeVisible();
  console.log('MOBILE_THROTTLED_AUTH_READY_MS',Date.now()-start);
  expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});

test('mobile inbox opens a thread and sends once without losing the chat',async({page,isMobile})=>{
  test.skip(!isMobile);
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(()=>{
    currentUser={id:'renter',email:'renter@vacancy.test'};
    window.__sent=[];
    const now=new Date().toISOString();
    const conversation={id:'thread-1',created_at:now,peer:{display_name:'Amina',avatar_path:null,last_read_at:null},vacancies:{id:'listing-1',rooms:{name:'Nairobi studio',properties:{suburb:'Kilimani',owner_id:'owner'}}},conversation_members:[{user_id:'renter',last_read_at:null}],messages:[{id:'initial',sender_id:'owner',body:'Hello',created_at:now}]};
    VACANCY_BACKEND.conversations=async()=>[conversation];
    VACANCY_BACKEND.conversationPeer=async()=>({display_name:'Amina',avatar_path:null,last_read_at:null});
    VACANCY_BACKEND.sendMessage=async(id,body)=>{window.__sent.push([id,body]);conversation.messages.push({id:'reply',sender_id:'renter',body,created_at:new Date().toISOString()});await new Promise(resolve=>setTimeout(resolve,100))};
  });
  const start=Date.now();
  await page.evaluate(()=>nav('messages'));
  await expect(page.locator('.thread-item')).toContainText('Amina');
  console.log('MOBILE_INBOX_RENDER_MS',Date.now()-start);
  await page.locator('.thread-item').click();
  await expect(page.locator('.chat-listing')).toContainText('Nairobi studio');
  await page.locator('#chatForm [name=body]').fill('Is Saturday possible?');
  await page.locator('#chatForm button.primary').click();
  await expect(page.locator('.chat-log')).toContainText('Is Saturday possible?');
  expect(await page.evaluate(()=>window.__sent)).toEqual([['thread-1','Is Saturday possible?']]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});
