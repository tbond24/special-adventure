const {test,expect}=require('@playwright/test');
let server,base;
test.beforeEach(async({page})=>{const {createLiveAnalyticsServer}=await import('../scripts/live-analytics-server.mjs');server=createLiveAnalyticsServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort())});
test.afterEach(async()=>{server?.closeAllConnections();await new Promise(resolve=>server.close(resolve))});
test('separate live viewer is locked before sign-in and exposes no source or API proxy',async({page})=>{
 await page.goto(base);await expect(page.locator('#signin')).toBeVisible();await expect(page.locator('#dashboard')).toBeHidden();
 for(const path of ['/__admin-preview','/api/test','/.env','/app/index.html','/tests/admin-visual-fixture.js'])expect((await page.request.get(base+path)).status()).toBe(404);
 const response=await page.request.get(base+'/src/backend.js');const source=await response.text();expect(source).toContain('vacancy-live-analytics-session-v1');expect(source).not.toContain('localStorage');expect(source).toContain('/auth/v1/logout?scope=local');expect(response.headers()['content-security-policy']).toContain("connect-src https://xtutkwiivqkgkqjpkxvj.supabase.co");
 expect((await page.request.post(base)).status()).toBe(405);
});
test('real auth adapter gates report reads behind MFA, renders both modules and clears rejected sessions',async({page})=>{
 const id='00000000-0000-4000-8000-000000000001',factor='00000000-0000-4000-8000-000000000002',exp=Math.floor(Date.now()/1000)+3600;let reportReads=0,deny=false,logoutScope=null;
 const jwt=aal=>'test.'+Buffer.from(JSON.stringify({sub:id,aal,exp})).toString('base64url')+'.test';const user={id,is_anonymous:false,factors:[{id:factor,status:'verified',factor_type:'totp',friendly_name:'Synthetic authenticator'}]};
 const session=aal=>({access_token:jwt(aal),refresh_token:'synthetic-only',expires_at:exp,expires_in:3600,user});
 await page.route('https://xtutkwiivqkgkqjpkxvj.supabase.co/**',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname;let body={};try{body=request.postDataJSON()||{}}catch{}
  const json=(value,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(value)});
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'}});
  if(path==='/auth/v1/token'){expect(body.email).toBe('synthetic@example.invalid');return json(session('aal1'))}
  if(path==='/auth/v1/user')return json(user);
  if(path.endsWith('/challenge'))return json({id:'synthetic-challenge'});
  if(path.endsWith('/verify'))return json(session('aal2'));
  if(path==='/auth/v1/logout'){logoutScope=url.searchParams.get('scope');return json({})}
  if(path==='/rest/v1/admin_users')return json([{user_id:id}]);
  if(path.startsWith('/rest/v1/rpc/')){
   reportReads++;expect(request.headers().authorization).toBe('Bearer '+jwt('aal2'));if(deny)return json({message:'Session revoked'},401);
   if(path.endsWith('/admin_traffic_metrics'))return json({schemaVersion:1,source:'connected_v2',generatedAt:new Date().toISOString(),lastRecordedAt:new Date().toISOString(),visits:12,unique:10,repeat:{total:2,registered:1,nonRegistered:1,unknown:0},unidentifiedEvents:0,series:body.p_buckets.map(b=>({at:b.end,visits:2,unique:1,registered:1,nonRegistered:1,unknown:0}))});
   if(path.endsWith('/admin_daily_metrics_local'))return json({metric:body.p_metric,days:180,timeZone:body.p_timezone,total:180,series:Array.from({length:180},(_,i)=>({date:new Date(Date.now()-(179-i)*864e5).toISOString().slice(0,10),value:1}))});
   if(path.endsWith('/admin_metric_comparison'))return json({metric:body.p_metric,total:Math.ceil((Date.parse(body.p_to)-Date.parse(body.p_from))/864e5),previous:Math.ceil((Date.parse(body.p_previous_to)-Date.parse(body.p_previous_from))/864e5),from:body.p_from,to:body.p_to,previousFrom:body.p_previous_from,previousTo:body.p_previous_to});
   if(path.endsWith('/admin_journey_map'))return json({schemaVersion:1,generatedAt:new Date().toISOString(),from:body.p_from,to:body.p_to,device:body.p_device,total:10,nodes:[{id:'find',count:10},{id:'listing',count:5}],edges:[{from:'find',to:'listing',count:5}]});
  }
  return json({message:'Unexpected mock request'},400);
 });
 await page.goto(base);await page.locator('[name=email]').fill('synthetic@example.invalid');await page.locator('[name=password]').fill('synthetic-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.locator('#mfa')).toBeVisible();expect(reportReads).toBe(0);
 await page.locator('[name=code]').fill('123456');await page.getByRole('button',{name:'Verify',exact:true}).click();await expect(page.locator('#dashboard')).toBeVisible();
 await expect(page.locator('.overview-metric-card[data-metric=visitors] [data-metric-value]')).toHaveText('12');await expect(page.locator('.overview-metric-card[data-metric=repeat_visitors] [data-metric-value]')).toHaveText('2');
 const map=page.locator('.overview-journey-map');await map.scrollIntoViewIfNeeded();await expect(map.locator('.journey-map-centre strong')).toHaveText('10');await expect(map.locator('.journey-map-switch')).toBeHidden();
 expect(await page.evaluate(()=>typeof VACANCY_BACKEND.createListing)).toBe('undefined');deny=true;await map.getByRole('button',{name:'Refresh map',exact:true}).click();await expect(page.locator('#dashboard')).toBeHidden();await expect(page.locator('.journey-map-node')).toHaveCount(0);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect.poll(()=>logoutScope).toBe('local');await expect(page.locator('#signin')).toBeVisible();
});
