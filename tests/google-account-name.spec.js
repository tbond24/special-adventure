const {test,expect}=require('@playwright/test');const base='http://127.0.0.1:8776';
test.beforeEach(async({page})=>{await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.fulfill({status:200,json:[]}));await page.goto(base+'/#auth');await page.waitForFunction(()=>booting===false);});
for(const scenario of [
 {name:'Google blank profile',saved:'',provider:'google',email:'alex.test@gmail.com',expected:'alex.test'},
 {name:'explicit saved name retained',saved:'Vacancy member',provider:'google',email:'alex@gmail.com',expected:'Vacancy member'},
 {name:'custom name retained',saved:'My chosen name',provider:'google',email:'alex@gmail.com',expected:'My chosen name'},
 {name:'email account unchanged',saved:'',provider:'email',email:'alex@example.invalid',expected:'Vacancy member'},
 {name:'Google identity address used',saved:'',provider:'email',email:'backup@example.invalid',google:'original@gmail.com',expected:'original'},
 {name:'missing email safe fallback',saved:'',provider:'google',email:'',expected:'Vacancy member'}
])test(scenario.name,async({page})=>{
 await page.evaluate(async s=>{currentUser={id:'synthetic-account',email:s.email,app_metadata:{provider:s.provider},user_metadata:{},identities:s.google?[{provider:'google',identity_data:{email:s.google}}]:[]};VACANCY_BACKEND.profile=async()=>({display_name:s.saved});VACANCY_BACKEND.adminOverview=async()=>({error:'not admin'});VACANCY_BACKEND.adminMembership=async()=>false;await renderAccount();},scenario);
 await expect(page.locator('.account-identity h1')).toHaveText(scenario.expected);await expect(page.locator('#profileForm [name=displayName]')).toHaveValue(scenario.expected);
});
for(const photo of ['https://lh3.googleusercontent.com/a/example=s96-c','synthetic-account/avatar.png'])test('account renders stored photo '+photo,async({page})=>{
 await page.route('**/a/example*',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aR1sAAAAASUVORK5CYII=','base64')}));
 await page.route('**/profile-avatars/synthetic-account/avatar.png',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aR1sAAAAASUVORK5CYII=','base64')}));
 await page.evaluate(async avatar=>{currentUser={id:'synthetic-account',email:'alex@gmail.com',app_metadata:{provider:'google'},user_metadata:{}};VACANCY_BACKEND.profile=async()=>({display_name:'alex',avatar_path:avatar});VACANCY_BACKEND.adminOverview=async()=>({error:'not admin'});VACANCY_BACKEND.adminMembership=async()=>false;await renderAccount();},photo);
 await expect(page.locator('.account-avatar img')).toBeVisible();await expect.poll(()=>page.locator('.account-avatar img').evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);
});
