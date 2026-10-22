// Reuses the reviewed route/identity enquiry cases from 084eaf3. Synthetic only.
const {test,expect}=require('@playwright/test');
const {install,owner}=require('../qa/account-drafts/synthetic-cloud.cjs');
const listing={id:'60000000-0000-4000-8000-000000000006',rentAmount:25000,rentCurrency:'KES',rentPeriod:'month',deposit:25000,availableFrom:'2026-10-12',minimumStayWeeks:4,
  room:{name:'SyntheticVeryLongListingNameWithoutSpacesForMobileLayoutTesting',roomType:'Studio',description:'Synthetic listing description. '.repeat(30),maxOccupants:1,media:[{url:'/assets/vacancy-logo.png'},{url:'/assets/vacancy-logo.png'}]},
  property:{id:'40000000-0000-4000-8000-000000000004',suburb:'Westlands',city:'Nairobi',country:'Kenya',propertyType:'House',publicLatitude:-1.26,publicLongitude:36.8,parkingSpaces:0},
  owner:{id:'70000000-0000-4000-8000-000000000007',displayName:'SyntheticVeryLongListerNameWithoutSpacesForMobileLayoutTesting',bio:'Synthetic biography. '.repeat(35)}};

test.beforeEach(async({page,context})=>{
  await install(context);
  await context.addInitScript(()=>{
    localStorage.setItem('vacancy-analytics-disabled','true');
    localStorage.setItem('vacancy-market-v1','KE');
  });
  await page.goto('/#auth');await page.waitForFunction(()=>!booting);
  await expect(page.locator('#authUnified')).toBeVisible();
  await page.evaluate(({listing,user})=>{
    window.__uiErrors=[];addEventListener('error',event=>__uiErrors.push(event.message));
    addEventListener('unhandledrejection',event=>__uiErrors.push(String(event.reason)));
    vacancies=[listing];
    window.__threads=[{id:'synthetic-conversation',created_at:'2026-10-21T01:00:00Z',
      vacancies:{id:listing.id,rooms:{name:listing.room.name,properties:{suburb:'Westlands',owner_id:listing.owner.id}}},
      conversation_members:[{user_id:user.id,last_read_at:null}],
      messages:[{id:'message-one',sender_id:listing.owner.id,body:'SyntheticMessageWithoutSpaces'.repeat(15),created_at:'2026-10-21T01:00:00Z'}]}];
    VACANCY_BACKEND.conversations=async()=>__threads;
    VACANCY_BACKEND.conversationPeer=async()=>({display_name:listing.owner.displayName,last_read_at:null});
    VACANCY_BACKEND.markConversationRead=async()=>{};
    VACANCY_BACKEND.profile=async()=>({display_name:'Synthetic member'});
    VACANCY_BACKEND.blockedUsers=async()=>[];
    VACANCY_BACKEND.adminMembership=async()=>false;
    VACANCY_BACKEND.listerProfile=async()=>({id:listing.owner.id,display_name:listing.owner.displayName,bio:listing.owner.bio});
    VACANCY_BACKEND.activeVacancies=async()=>[listing];
  },{listing,user:owner});
});

async function contained(page){
  await expect(page.locator('.current-page-loading,.listing-transition-loading')).toHaveCount(0);
  expect(await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth),'Horizontal overflow').toBeLessThanOrEqual(1);
  expect(await page.locator('#app [id]').evaluateAll(nodes=>nodes.map(n=>n.id).filter((id,i,all)=>all.indexOf(id)!==i)),'Duplicate page IDs').toEqual([]);
}
async function reachable(node){
  await node.scrollIntoViewIfNeeded();await expect(node).toBeVisible();
  expect(await node.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}),'Covered action').toBe(true);
}
async function capture(page,info,name){
  await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
  const image=await page.screenshot({path:info.outputPath(name+'.png'),fullPage:true});
  await info.attach(name,{body:image,contentType:'image/png'});
}
test.afterEach(async({page},info)=>{
  if(page.isClosed())return;
  await info.attach('page-layout',{body:JSON.stringify(await page.evaluate(()=>({route:location.hash,width:innerWidth,documentWidth:document.documentElement.scrollWidth,errors:window.__uiErrors})),null,2),contentType:'application/json'});
  expect(await page.evaluate(()=>window.__uiErrors||[])).toEqual([]);
});
async function signedIn(page){await page.evaluate(user=>{currentUser=user},owner);}
async function open(page,name,id){await page.evaluate(({name,id})=>nav(name,id),{name,id});await expect(page).toHaveURL(new RegExp('#'+name+(id?'/'+id:'')+'$'));}

test('a completed enquiry cannot pull the visitor back after leaving',async({page})=>{
  await page.evaluate(()=>{currentUser={id:'synthetic-guest',is_anonymous:true};VACANCY_BACKEND.startEnquiry=()=>new Promise(resolve=>{window.finishEnquiry=()=>resolve('synthetic-conversation')})});
  await open(page,'enquire',listing.id);await page.getByLabel('Message',{exact:true}).fill('Synthetic enquiry only');
  await page.getByRole('button',{name:'Send message',exact:true}).click();await page.waitForFunction(()=>window.finishEnquiry);
  await open(page,'privacy');await expect(page.locator('.information-page')).toBeVisible();
  await page.evaluate(()=>finishEnquiry());await page.waitForTimeout(150);
  await expect(page).toHaveURL(/#privacy$/);await expect(page.locator('.information-page')).toBeVisible();
});

test('guest enquiry submits once and opens the resulting conversation',async({page})=>{
  await page.evaluate(()=>{
    window.enquirySends=0;
    VACANCY_BACKEND.signInGuest=async()=>{currentUser={id:'synthetic-guest',is_anonymous:true};return {user:currentUser}};
    VACANCY_BACKEND.currentUser=async()=>currentUser;
    VACANCY_BACKEND.savedIds=async()=>[];
    VACANCY_BACKEND.startEnquiry=()=>{enquirySends++;return new Promise(resolve=>{window.finishEnquiry=()=>resolve('synthetic-conversation')})};
  });
  await open(page,'enquire',listing.id);await page.getByLabel('Your name').fill('Synthetic guest');
  await page.getByLabel('Message',{exact:true}).fill('A synthetic viewing enquiry');
  await page.getByRole('button',{name:'Send message',exact:true}).click();await page.waitForFunction(()=>window.finishEnquiry);
  await page.locator('#enquiryForm').evaluate(form=>form.requestSubmit());
  expect(await page.evaluate(()=>enquirySends)).toBe(1);
  // Refreshing the same user's object is not an account switch.
  await page.evaluate(()=>{currentUser={...currentUser}});
  await page.evaluate(()=>finishEnquiry());await expect(page).toHaveURL(/#messages\/synthetic-conversation$/);
  await expect(page.locator('#chatForm')).toBeVisible();
});

test('a failed enquiry retains its draft and enables retry',async({page})=>{
  await page.evaluate(()=>{currentUser={id:'synthetic-guest',is_anonymous:true};VACANCY_BACKEND.startEnquiry=async()=>{throw Error('Synthetic send interruption')}});
  await open(page,'enquire',listing.id);await page.getByLabel('Message',{exact:true}).fill('Keep this synthetic draft');
  await page.getByRole('button',{name:'Send message',exact:true}).click();
  await expect(page.locator('#toast')).toContainText('Synthetic send interruption');
  await expect(page.getByLabel('Message',{exact:true})).toHaveValue('Keep this synthetic draft');
  await expect(page.getByRole('button',{name:'Send message',exact:true})).toBeEnabled();
});

test('leaving while guest authentication finishes never starts an old enquiry',async({page})=>{
  await page.evaluate(()=>{
    window.enquirySends=0;
    VACANCY_BACKEND.signInGuest=()=>new Promise(resolve=>{window.finishGuestAuth=()=>resolve({})});
    VACANCY_BACKEND.startEnquiry=async()=>{enquirySends++;return 'synthetic-conversation'};
  });
  await open(page,'enquire',listing.id);await page.getByLabel('Your name').fill('Synthetic guest');
  await page.getByLabel('Message',{exact:true}).fill('Synthetic pending-auth enquiry');
  await page.getByRole('button',{name:'Send message',exact:true}).click();await page.waitForFunction(()=>window.finishGuestAuth);
  await open(page,'terms');await expect(page.locator('.information-page')).toBeVisible();
  await page.evaluate(()=>finishGuestAuth());await page.waitForTimeout(100);
  expect(await page.evaluate(()=>enquirySends)).toBe(0);await expect(page).toHaveURL(/#terms$/);
});

