const {test,expect}=require('@playwright/test');
const {install,owner}=require('../account-drafts/synthetic-cloud.cjs');
const emailUser={...owner,user_metadata:{display_name:'Synthetic User'},identities:[{provider:'email'}],app_metadata:{provider:'email',providers:['email']}};
const originalContacts={phone_number:'+254700000001',whatsapp_number:'+254700000002',enquiry_in_app:true,enquiry_email:true,enquiry_phone:false,enquiry_whatsapp:false};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
async function setup(page,context,{width=390,dark=false,user=emailUser,admin=false}={}){
 await page.setViewportSize({width,height:844});
 const state=await install(context,undefined,{signedIn:owner});state.overrideUser=user;
 state.profile={id:owner.id,display_name:'Synthetic User',avatar_path:null,phone_verified:true};state.contacts={...originalContacts};state.profileWrites=[];state.contactWrites=[];state.avatarWrites=[];state.adminReads=[];state.failProfileRead=false;state.failProfileWrite=false;state.holdProfile=null;
 await context.route('**/rest/v1/profiles?**',async route=>{const request=route.request();if(request.method()==='GET'){if(state.holdProfile)await state.holdProfile;if(state.failProfileRead)return route.fulfill({status:503,json:{message:'Profile unavailable'}});return route.fulfill({json:[state.profile]});}if(request.method()==='PATCH'){const body=request.postDataJSON();state.profileWrites.push(body);if(state.failProfileWrite)return route.fulfill({status:503,json:{message:'Synthetic save unavailable'}});Object.assign(state.profile,body);return route.fulfill({json:[state.profile]});}throw Error('Unexpected profile method');});
 await context.route('**/rest/v1/profile_private_contacts**',async route=>{const request=route.request();if(request.method()==='GET')return route.fulfill({json:[state.contacts]});const body=request.postDataJSON();state.contactWrites.push(body);Object.assign(state.contacts,body);return route.fulfill({json:[state.contacts]});});
 await context.route('**/storage/v1/object/profile-avatars/**',async route=>{state.avatarWrites.push({method:route.request().method(),url:route.request().url()});return route.fulfill({json:{}});});
 await context.route('**/rest/v1/admin_users?**',route=>route.fulfill({json:admin?[{user_id:owner.id}]:[]}));
 await context.route('**/rest/v1/rpc/admin_*',route=>{state.adminReads.push(route.request().url());return route.fulfill({json:{}});});
 await context.addInitScript(dark=>localStorage.setItem('vacancy-theme-v1',dark?'dark':'light'),dark);
 await page.goto('/#account');await page.waitForFunction(()=>typeof booting!=='undefined'&&!booting);
 await expect(page.locator('.you-page')).toBeVisible();
 return state;
}
async function enter(page,screen){await page.locator(screen==='profile'?'#editProfile':'#youSecurityEntry').click();await expect(page).toHaveURL(/#account$/);await expect(page.locator(screen==='profile'?'#youProfile':'#youSecurity')).toBeVisible();await expect(page.locator(screen==='profile'?'#editProfile':'#youSecurityEntry')).toHaveAttribute('aria-expanded','true');}
function noPrivateWrites(state){expect(state.contactWrites).toEqual([]);expect(state.contacts).toEqual(originalContacts);}

for(const width of [320,390,1280])for(const dark of [false,true])test(`${width}px ${dark?'dark':'light'} You shows one identity and only real account controls`,async({page,context},info)=>{
 const state=await setup(page,context,{width,dark});
 await expect(page.getByRole('heading',{name:'You',exact:true})).toHaveCount(0);
 await expect(page.locator('.account-identity')).toContainText('Synthetic User');
 await expect(page.locator('.you-page')).toContainText(owner.email);
 expect(await page.locator('.you-page').innerText()).toMatch(/Signs out this account on every device/);
 await expect(page.locator('#app > .page-back')).toHaveCount(0);
 await expect(page.locator('#contactPreferences,#yourListings,#signoutAllAction,.account-tier')).toHaveCount(0);
 await expect(page.locator('.you-page')).not.toContainText(/Message contact|Ratings|My account|Your activity|Properties and listings/);
 await expect(page.locator('#adminEntry')).toBeHidden();
 for(const selector of ['#editProfile','#youSecurityEntry','#signout'])expect((await page.locator(selector).boundingBox()).height).toBeGreaterThanOrEqual(44);
 await page.screenshot({path:info.outputPath('you-home.png'),fullPage:true});
 await page.locator('#editProfile').focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(/#account$/);
 await expect(page.locator('#editProfile')).toBeFocused();await expect(page.locator('#editProfile')).toHaveAttribute('aria-expanded','true');await expect(page.locator('#youProfile')).toBeVisible();
 await expect(page.locator('[name=phoneNumber],[name=whatsappNumber],input[type=email]')).toHaveCount(0);
 await expect(page.locator('.you-page')).toContainText('Your account email stays private.');
 await expect(page.locator('#avatarInput')).toBeVisible();
 await page.locator('#cancelProfile').click();await expect(page.locator('#editProfile')).toBeFocused();await enter(page,'security');
 await expect(page.locator('#authenticatorSecurity,#blockedAccounts,#accountSecurity')).toHaveCount(3);
 await expect(page.locator('#deleteEntry')).toBeDisabled();await expect(page.locator('#deleteEntry')).toContainText('Temporarily unavailable');
 await expect(page.locator('#signout')).toBeVisible();await expect(page.locator('#signoutAllAction')).toHaveCount(0);
 await page.screenshot({path:info.outputPath('you-security.png'),fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 expect(state.profileWrites).toEqual([]);noPrivateWrites(state);expect(state.authRequests).toEqual([]);expect(state.adminReads).toEqual([]);
});

test('name-only saves retain legacy private contacts and survive save failure',async({page,context})=>{
 const state=await setup(page,context);await enter(page,'profile');
 await page.getByLabel('Display name',{exact:true}).fill('Updated Public Name');state.failProfileWrite=true;
 await page.getByRole('button',{name:'Save changes'}).click();await expect(page.locator('#profileStatus')).toContainText('Synthetic save unavailable');
 await expect(page.getByLabel('Display name',{exact:true})).toHaveValue('Updated Public Name');await expect(page.getByRole('button',{name:'Save changes'})).toBeEnabled();noPrivateWrites(state);
 state.failProfileWrite=false;await page.getByRole('button',{name:'Save changes'}).click();await expect(page).toHaveURL(/#account$/);await expect(page.locator('.account-identity h2')).toHaveText('Updated Public Name');
 expect(state.profileWrites).toEqual([{display_name:'Updated Public Name'},{display_name:'Updated Public Name'}]);noPrivateWrites(state);
 await page.locator('#editProfile').click();await page.getByLabel('Display name',{exact:true}).fill('   ');await page.getByRole('button',{name:'Save changes'}).click();expect(state.profileWrites).toHaveLength(2);
});

test('photo updates preserve the unsaved name and do not write contacts',async({page,context})=>{
 const state=await setup(page,context);await enter(page,'profile');await page.getByLabel('Display name',{exact:true}).fill('Unsaved Name');
 await page.locator('#avatarInput').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:png});await expect(page.locator('#profileStatus')).toHaveText('Profile photo updated.');
 await expect(page.locator('.mobile-nav [data-nav=account] .account-nav-avatar')).toBeVisible();
 await expect(page.locator('.mobile-nav [data-nav=account] .account-nav-avatar')).toHaveAttribute('src',new RegExp(owner.id+'/avatar\\.png'));
 await expect(page.getByLabel('Display name',{exact:true})).toHaveValue('Unsaved Name');expect(state.avatarWrites).toHaveLength(1);expect(state.profileWrites).toEqual([{avatar_path:owner.id+'/avatar.png'}]);noPrivateWrites(state);
 await page.locator('#avatarInput').setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('not an image')});await expect(page.locator('#profileStatus')).toContainText('Use a JPG, PNG or WebP');expect(state.avatarWrites).toHaveLength(1);
});

test('profile load retry and interrupted navigation never overwrite a newer screen',async({page,context})=>{
 const state=await setup(page,context);state.failProfileRead=true;await page.evaluate(()=>renderAccount());
 await expect(page.locator('#retryYouProfile')).toBeVisible();await expect(page.locator('#profileForm')).toHaveCount(0);
 state.failProfileRead=false;await page.locator('#retryYouProfile').click();await enter(page,'profile');
 let release;state.holdProfile=new Promise(resolve=>{release=resolve;});await page.evaluate(()=>{void renderAccount();});
 await page.evaluate(()=>{location.hash='home';});release();state.holdProfile=null;
 await expect(page).toHaveURL(/#home$/);await expect(page.locator('.map-first-shell')).toBeVisible();await expect(page.locator('.you-page')).toHaveCount(0);noPrivateWrites(state);
});

test('inline sections preserve navigation and cancel an unsaved name with keyboard',async({page,context})=>{
 const state=await setup(page,context);const length=await page.evaluate(()=>history.length);
 await enter(page,'profile');await page.getByLabel('Display name',{exact:true}).fill('Not saved');
 await page.locator('#editProfile').click();await expect(page.locator('#youProfile')).toBeHidden();await page.locator('#editProfile').click();await expect(page.getByLabel('Display name',{exact:true})).toHaveValue('Not saved');
 await page.locator('#youSecurityEntry').focus();await page.keyboard.press('Space');
 await expect(page.locator('#youSecurity')).toBeVisible();await expect(page.locator('#youProfile')).toBeVisible();
 await page.locator('#youSecurityEntry').press('Enter');await expect(page.locator('#youSecurity')).toBeHidden();
 await page.locator('#cancelProfile').click();await expect(page.locator('#youProfile')).toBeHidden();await expect(page.locator('#editProfile')).toBeFocused();
 await enter(page,'profile');await expect(page.getByLabel('Display name',{exact:true})).toHaveValue('Synthetic User');
 expect(await page.evaluate(()=>history.length)).toBe(length);expect(state.profileWrites).toEqual([]);noPrivateWrites(state);
});

for(const [label,providers,recovery,copy]of [
 ['email',['email'],true,'Email'],['Google',['google'],false,'Google'],['linked Google and email',['google','email'],true,'Google, Email'],['unknown',[],true,'Sign-in method unavailable'],
])test(`${label} security reports actual connected methods without inventing password state`,async({page,context})=>{
 const user={...emailUser,identities:providers.map(provider=>({provider})),app_metadata:providers.length?{provider:providers[0],providers}:{}};
 const state=await setup(page,context,{user});await enter(page,'security');await expect(page.locator('.you-signin-methods')).toContainText(copy);
 await expect(page.locator('#accountSecurity')).toHaveCount(recovery?1:0);
 if(providers.includes('google'))await expect(page.locator('.you-signin-methods')).toContainText('Manage your Google password in your Google Account.');
 await page.locator('#authenticatorSecurity').click();await expect(page.locator('.security-dialog')).toContainText('No verified authenticator is set up.');await expect(page.locator('[data-start-mfa-setup]')).toBeVisible();
 expect(state.authRequests).toEqual([]);expect(state.profileWrites).toEqual([]);noPrivateWrites(state);
 await page.locator('.security-dialog .tour-close').click();
 if(recovery){await page.locator('#accountSecurity').click();await expect(page).toHaveURL(/#forgot-password$/);await expect(page.locator('#recoveryRequest')).toBeVisible();}
});

test('authorized admin entry retains the existing AAL2 gate and no early admin data reads',async({page,context})=>{
 const state=await setup(page,context,{admin:true});await expect(page.locator('#adminEntry')).toBeVisible();expect(state.adminReads).toEqual([]);
 await page.locator('#adminEntry').click();await expect(page.getByRole('heading',{name:'Admin verification'})).toBeVisible();await expect(page.locator('#adminHost')).toHaveCount(0);expect(state.adminReads).toEqual([]);
});

for(const failure of ['none','http','network'])test(`single global sign-out preserves local cleanup on ${failure} revocation`,async({page,context})=>{
 const state=await setup(page,context);const requests=[];
 await context.route('**/auth/v1/logout?**',route=>{requests.push(route.request().url());return failure==='network'?route.abort('failed'):route.fulfill({status:failure==='http'?503:200,json:failure==='http'?{message:'Unavailable'}:{}});});
 await page.evaluate(()=>saved.add('synthetic-saved'));await expect(page.locator('#signoutAllAction')).toHaveCount(0);await page.locator('#signout').click();
 await expect(page).toHaveURL(/#home$/);expect(requests).toHaveLength(1);expect(new URL(requests[0]).searchParams.get('scope')).toBe('global');
 expect(await page.evaluate(()=>({user:currentUser,saved:saved.size,session:localStorage.getItem('vacancy-session-v01')}))).toEqual({user:null,saved:0,session:null});
 await expect(page.locator('#toast')).toContainText(failure==='none'?'All sessions signed out':'Signed out on this device; other sessions could not be revoked');noPrivateWrites(state);
});

test('legacy explicit single-contact edits preserve an omitted sibling field',async({page,context})=>{
 const state=await setup(page,context);await page.evaluate(()=>VACANCY_BACKEND.updateProfile({phoneNumber:'+254700000003'}));
 expect(state.profileWrites).toEqual([]);expect(state.contactWrites).toHaveLength(1);expect(state.contactWrites[0]).toMatchObject({phone_number:'+254700000003'});expect(state.contactWrites[0]).not.toHaveProperty('whatsapp_number');expect(state.contacts.whatsapp_number).toBe(originalContacts.whatsapp_number);
});

 test('repeated security expansion retains exactly one real MFA handler and blocked-account control',async({page,context})=>{
 const state=await setup(page,context);for(let i=0;i<3;i++){await enter(page,'security');await expect(page.locator('#authenticatorSecurity')).toHaveCount(1);await expect(page.locator('#blockedAccounts')).toHaveCount(1);await page.locator('#authenticatorSecurity').click();await expect(page.locator('.security-dialog')).toHaveCount(1);await expect(page.locator('[data-start-mfa-setup]')).toBeVisible();await page.locator('.security-dialog .tour-close').click();await page.locator('#youSecurityEntry').click();await expect(page.locator('#youSecurity')).toBeHidden();}
 expect(state.adminReads).toEqual([]);expect(state.authRequests).toEqual([]);noPrivateWrites(state);
 });

test('a late profile response cannot replace a newer inline form after returning to Account',async({page,context})=>{
 await setup(page,context);await page.evaluate(()=>{const profile=VACANCY_BACKEND.profile;window.__finishOldProfile=null;let calls=0;VACANCY_BACKEND.profile=()=>++calls===1?new Promise(resolve=>{window.__finishOldProfile=()=>resolve({display_name:'Older response'});}):profile();void renderAccount();});
 await page.evaluate(()=>nav('saved'));await expect(page.locator('.saved-heading')).toBeVisible();await page.evaluate(()=>nav('account'));await expect(page.locator('#editProfile')).toBeVisible();await enter(page,'profile');await page.getByLabel('Display name',{exact:true}).fill('Current unsaved edit');await page.evaluate(()=>window.__finishOldProfile());
 await expect(page.getByLabel('Display name',{exact:true})).toHaveValue('Current unsaved edit');await expect(page.locator('.account-identity h2')).toHaveText('Synthetic User');await expect(page.locator('#authenticatorSecurity')).toHaveCount(1);
});

test('a delayed explicit profile save locks the submitted name until acknowledgement',async({page,context})=>{
 await setup(page,context);await enter(page,'profile');await page.getByLabel('Display name',{exact:true}).fill('Submitted name');
 await page.evaluate(()=>{const update=VACANCY_BACKEND.updateProfile;VACANCY_BACKEND.updateProfile=input=>new Promise(resolve=>{window.__finishProfileSave=async()=>{await update(input);resolve();};});});
 await page.getByRole('button',{name:'Save changes'}).click();await expect(page.getByLabel('Display name',{exact:true})).toHaveJSProperty('readOnly',true);await expect(page.locator('#cancelProfile')).toBeDisabled();await expect(page.locator('#avatarInput')).toBeDisabled();
 await page.getByLabel('Display name',{exact:true}).focus();await page.keyboard.type('Newer text');await expect(page.getByLabel('Display name',{exact:true})).toHaveValue('Submitted name');
 await page.evaluate(()=>window.__finishProfileSave());await expect(page.locator('.account-identity h2')).toHaveText('Submitted name');await expect(page.locator('#youProfile')).toBeHidden();await enter(page,'profile');await expect(page.getByLabel('Display name',{exact:true})).toHaveJSProperty('readOnly',false);await expect(page.locator('#cancelProfile')).toBeEnabled();
});
