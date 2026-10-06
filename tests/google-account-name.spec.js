const {test,expect}=require('@playwright/test');const base='http://127.0.0.1:8776';
test.beforeEach(async({page})=>{await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.fulfill({status:200,json:[]}));await page.goto(base+'/#auth');await page.waitForFunction(()=>booting===false);});
for(const scenario of [
 {name:'Google blank profile',saved:'',provider:'google',email:'alex.test@gmail.com',expected:'alex.test'},
 {name:'Google placeholder profile',saved:'Vacancy member',provider:'google',email:'alex@gmail.com',expected:'alex'},
 {name:'custom name retained',saved:'My chosen name',provider:'google',email:'alex@gmail.com',expected:'My chosen name'},
 {name:'email account unchanged',saved:'',provider:'email',email:'alex@example.invalid',expected:'Vacancy member'},
 {name:'Google identity address used',saved:'',provider:'email',email:'backup@example.invalid',google:'original@gmail.com',expected:'original'},
 {name:'missing email safe fallback',saved:'',provider:'google',email:'',expected:'Vacancy member'}
])test(scenario.name,async({page})=>{
 await page.evaluate(async s=>{currentUser={id:'synthetic-account',email:s.email,app_metadata:{provider:s.provider},user_metadata:{},identities:s.google?[{provider:'google',identity_data:{email:s.google}}]:[]};VACANCY_BACKEND.profile=async()=>({display_name:s.saved});VACANCY_BACKEND.adminOverview=async()=>({error:'not admin'});VACANCY_BACKEND.adminMembership=async()=>false;await renderAccount();},scenario);
 await expect(page.locator('.account-identity h1')).toHaveText(scenario.expected);await expect(page.locator('#profileForm [name=displayName]')).toHaveValue(scenario.expected);
});
