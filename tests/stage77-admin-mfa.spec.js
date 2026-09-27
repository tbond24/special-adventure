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

test('MFA factor lookup uses the signed-in user response, not the enrollment endpoint',async({page})=>{
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(()=>{
    const token='header.'+btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600,aal:'aal1'}))+'.signature';
    localStorage.setItem('vacancy-session-v01',JSON.stringify({access_token:token,refresh_token:'test-refresh'}));
  });
  let badEndpointCalls=0;
  await page.route('**/auth/v1/factors',route=>{badEndpointCalls++;return route.fulfill({status:405,contentType:'application/json',body:'{}'})});
  await page.route('**/auth/v1/user',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'admin-one',factors:[{id:'factor-one',factor_type:'totp',status:'verified'}]})}));
  const factors=await page.evaluate(()=>VACANCY_BACKEND.mfaFactors());
  expect(factors).toEqual([{id:'factor-one',factor_type:'totp',status:'verified'}]);
  await page.evaluate(async()=>{currentUser={id:'admin-one',email:'owner@example.com'};VACANCY_BACKEND.adminMembership=async()=>true;await renderAdmin()});
  await page.locator('#verifyAdminMfa').click();
  await expect(page.getByRole('heading',{name:'Verify it is you'})).toBeVisible();
  await expect(page.getByLabel('Authenticator code')).toBeFocused();
  expect(badEndpointCalls).toBe(0);
});

test('setup renders Supabase SVG QR and replaces an unverified factor',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{
    window.__removedFactors=[];
    VACANCY_BACKEND.mfaFactors=async()=>[{id:'old-factor',factor_type:'totp',status:'unverified'}];
    VACANCY_BACKEND.mfaUnenroll=async id=>{window.__removedFactors.push(id)};
    VACANCY_BACKEND.mfaEnroll=async()=>({id:'fresh-factor',totp:{qr_code:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" fill="black"/></svg>',secret:'TESTKEYONLY'}});
    VACANCY_BACKEND.adminMembership=async()=>true;
  });
  await page.evaluate(()=>renderAdmin());
  await page.locator('#verifyAdminMfa').click();
  await expect(page.getByRole('heading',{name:'Set up authenticator'})).toBeVisible();
  const image=page.locator('.security-dialog .mfa-qr');
  await expect(image).toHaveAttribute('src',/^data:image\/svg\+xml/);
  await expect.poll(()=>image.evaluate(element=>element.complete&&element.naturalWidth>0)).toBe(true);
  await expect(page.locator('.mfa-secret')).not.toBeVisible();
  expect(await page.evaluate(()=>window.__removedFactors)).toEqual(['old-factor']);
  await page.locator('.security-dialog .tour-close').click();
  await expect.poll(()=>page.evaluate(()=>window.__removedFactors)).toEqual(['old-factor','fresh-factor']);
});

test('setup stops if an unfinished factor cannot be revoked',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{
    window.__enrollCalls=0;
    VACANCY_BACKEND.mfaFactors=async()=>[{id:'old-factor',factor_type:'totp',status:'unverified'}];
    VACANCY_BACKEND.mfaUnenroll=async()=>{throw new Error('revocation failed')};
    VACANCY_BACKEND.mfaEnroll=async()=>{window.__enrollCalls++;return {}};
  });
  await page.evaluate(()=>renderAdmin());
  await page.locator('#verifyAdminMfa').click();
  await expect(page.locator('.security-dialog')).toContainText('revocation failed');
  expect(await page.evaluate(()=>window.__enrollCalls)).toBe(0);
});
