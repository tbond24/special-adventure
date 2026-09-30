const {test,expect}=require('@playwright/test');
const APP_URL=process.env.VACANCY_E2E_URL;
const vacancy={id:'guest-v',rentAmount:18000,rentCurrency:'KES',rentPeriod:'month',deposit:0,billsIncluded:false,availableFrom:'2026-10-01',minimumStayWeeks:null,room:{id:'r',name:'Guest-ready studio',roomType:'Studio',furnished:false,ensuite:false,maxOccupants:1,description:'A test vacancy',media:[]},property:{id:'p',title:'Guest house',suburb:'Kasarani',city:'Nairobi',state:'Nairobi',country:'Kenya',parkingSpaces:0,petsConsidered:false,smokingAllowed:false,householdSummary:'Quiet property',waterAvailable:true,electricityAvailable:true,securityAvailable:true,internetAvailable:false,publicLatitude:-1.2,publicLongitude:36.9},owner:{id:'owner',displayName:'Owner',bio:''}};

async function open(page){await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));await page.goto(`${APP_URL}/#home`);await page.waitForFunction(()=>booting===false);await page.evaluate(v=>{currentUser=null;vacancies=[v];renderDetail(v.id)},vacancy)}

test('visitor reaches the enquiry form without registration',async({page})=>{await open(page);await page.getByRole('button',{name:'Message'}).click();await expect(page).toHaveURL(/#enquire\/guest-v$/);await expect(page.getByLabel('Your name')).toBeVisible();await expect(page.getByText(/no account or password needed/i)).toBeVisible()});

test('visitor sends a private enquiry and stays in its chat',async({page})=>{
  await open(page);
  await page.getByRole('button',{name:'Message'}).click();
  await expect(page.locator('.chat-listing')).toContainText('Guest-ready studio');
  await page.evaluate(()=>{
    window.__guestCalls=[];
    VACANCY_BACKEND.signInGuest=async name=>{window.__guestCalls.push(['guest',name]);currentUser={id:'guest',is_anonymous:true};return{}};
    VACANCY_BACKEND.currentUser=async()=>currentUser;
    VACANCY_BACKEND.savedIds=async()=>[];
    VACANCY_BACKEND.startEnquiry=async(id,input)=>{window.__guestCalls.push(['enquiry',id,input.message]);return 'conversation-1'};
    VACANCY_BACKEND.conversations=async()=>[{id:'conversation-1',created_at:new Date().toISOString(),vacancies:{id:'guest-v',rooms:{name:'Guest-ready studio',properties:{suburb:'Kasarani',owner_id:'owner'}}},conversation_members:[{user_id:'guest',last_read_at:null}],messages:[{id:'message-1',sender_id:'guest',body:'Can I view this studio on Saturday?',created_at:new Date().toISOString()}]}];
    VACANCY_BACKEND.conversationPeer=async()=>({display_name:'Owner',avatar_path:null,last_read_at:null});
  });
  await page.getByLabel('Your name').fill('Amina');
  await page.getByLabel('Message').fill('Can I view this studio on Saturday?');
  await page.getByRole('button',{name:'Send message'}).click();
  await expect(page).toHaveURL(/#messages\/conversation-1$/);
  await expect(page.locator('.chat-log')).toContainText('Can I view this studio on Saturday?');
  await expect(page.locator('#toast')).not.toHaveClass(/show/);
  await page.getByRole('button',{name:'Back to conversations'}).click();
  await expect(page).toHaveURL(/#messages$/);
  expect(await page.evaluate(()=>window.__guestCalls)).toEqual([['guest','Amina'],['enquiry','guest-v','Can I view this studio on Saturday?']]);
});

test('a failed enquiry keeps the draft and does not leave the compose page',async({page})=>{
  await open(page);
  await page.getByRole('button',{name:'Message'}).click();
  await page.evaluate(()=>{currentUser={id:'guest',is_anonymous:true};VACANCY_BACKEND.startEnquiry=async()=>{throw new Error('Send failed')}});
  await page.getByLabel('Message').fill('Can I view this studio?');
  await page.getByRole('button',{name:'Send message'}).click();
  await expect(page).toHaveURL(/#enquire\/guest-v$/);
  await expect(page.getByLabel('Message')).toHaveValue('Can I view this studio?');
  await expect(page.getByRole('button',{name:'Send message'})).toBeEnabled();
});

test('guest session cannot enter account-only surfaces',async({page})=>{await open(page);await page.evaluate(()=>{currentUser={id:'guest',is_anonymous:true};renderList()});await expect(page).toHaveURL(/#auth$/);await expect(page.locator('#toast')).toContainText('Sign in to list a vacancy')});

test('guest report and block actions request permanent sign-in',async({page})=>{await open(page);await page.evaluate(v=>{currentUser={id:'guest',is_anonymous:true};renderDetail(v.id)},vacancy);await page.locator('#listingSafetyToggle').click();await page.locator('#reportListing').click();await expect(page).toHaveURL(/#auth$/);await expect(page.locator('#toast')).toContainText('Sign in to report a vacancy')});

test('guest signup request contains no email or password',async({page})=>{await open(page);let body;await page.route('**/auth/v1/signup',async route=>{body=route.request().postDataJSON();await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'header.eyJleHAiOjQxMDI0NDQ4MDB9.sig',refresh_token:'refresh',user:{id:'guest',is_anonymous:true}})})});await page.evaluate(()=>VACANCY_BACKEND.signInGuest('Amina'));expect(body).toEqual({data:{display_name:'Amina'}});expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('vacancy-session-v01')).user.is_anonymous)).toBeTruthy()});
