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

test('Saved handles long listing names, unavailable entries and guest removal',async({page})=>{
  await page.evaluate(async id=>{await VACANCY_FAVOURITES.toggleGuest(id)},listing.id);
  await open(page,'saved');await expect(page.getByRole('heading',{name:'Saved rooms'})).toBeVisible();
  await contained(page);
  await page.evaluate(()=>{vacancies=[];renderSaved()});
  const remove=page.getByRole('button',{name:'Remove from saved'});await reachable(remove);await remove.click();
  await expect(page.getByText('Nothing saved yet.',{exact:true})).toBeVisible();await contained(page);
});

test('Inbox and long conversation content fit without covering controls',async({page},info)=>{
  await signedIn(page);await open(page,'messages');
  const thread=page.locator('[data-thread]');await expect(thread).toHaveCount(1);await contained(page);await reachable(thread);
  await thread.click();await expect(page.locator('#chatForm')).toBeVisible();await contained(page);
  expect(await page.locator('.bubble').first().evaluate(el=>el.scrollWidth-el.clientWidth),'Message text escapes its bubble').toBeLessThanOrEqual(1);
  await capture(page,info,'conversation');
  await reachable(page.getByRole('button',{name:'Back to conversations'}));
  await page.getByRole('button',{name:'Back to conversations'}).click();
  await expect(page.locator('[data-thread]')).toHaveCount(1);await contained(page);
});

test('conversation refresh preserves typing and a single composer',async({page})=>{
  await signedIn(page);await open(page,'messages','synthetic-conversation');
  const input=page.locator('#chatForm [name=body]');await expect(input).toBeVisible();await input.fill('Keep my unsent synthetic message');
  await page.evaluate(async()=>{
    __threads[0].messages.push({id:'message-two',sender_id:__threads[0].messages[0].sender_id,body:'A new synthetic reply',created_at:'2026-10-21T02:00:00Z'});
    await pollMessagesOnce(true);
  });
  await expect(input).toHaveValue('Keep my unsent synthetic message');await expect(page.locator('#chatForm')).toHaveCount(1);await contained(page);
});

test('moving between delayed Account and Inbox leaves no obsolete loading cover',async({page})=>{
  await signedIn(page);
  await page.evaluate(()=>{VACANCY_BACKEND.profile=()=>new Promise(resolve=>{window.finishAccount=()=>resolve({display_name:'Delayed synthetic member'})})});
  await open(page,'account');await page.waitForFunction(()=>window.finishAccount);
  await open(page,'messages');await expect(page.locator('[data-thread]')).toBeVisible();
  await expect(page.locator('.current-page-loading')).toHaveCount(0);
  await page.evaluate(()=>finishAccount());await expect(page.locator('[data-thread]')).toBeVisible();await contained(page);
});

test('an account change during a pending profile read starts a fresh render',async({page})=>{
  await signedIn(page);
  await page.evaluate(()=>{
    window.profileReads=0;
    VACANCY_BACKEND.profile=()=>{profileReads++;return profileReads===1?new Promise(resolve=>{window.finishOldAccount=()=>resolve({display_name:'Old synthetic member'})}):Promise.resolve({display_name:'New synthetic member'})};
  });
  await open(page,'account');await page.waitForFunction(()=>window.finishOldAccount);
  await page.evaluate(()=>{currentUser={...currentUser,id:'80000000-0000-4000-8000-000000000008'};void renderAccount()});
  await expect(page.locator('.account-identity h2')).toHaveText('New synthetic member');
  await page.evaluate(()=>finishOldAccount());await expect(page.locator('.account-identity h2')).toHaveText('New synthetic member');await contained(page);
});

test('concurrent Inbox renders share one read but later refreshes remain fresh',async({page})=>{
  await signedIn(page);
  await page.evaluate(async()=>{
    history.replaceState(null,'','#messages');route=parseHash();window.inboxReads=0;
    VACANCY_BACKEND.conversations=async()=>{inboxReads++;await new Promise(resolve=>setTimeout(resolve,100));return __threads};
    await Promise.all([renderMessages(),renderMessages(),renderMessages()]);
  });
  expect(await page.evaluate(()=>inboxReads)).toBe(1);await expect(page.locator('[data-thread]')).toHaveCount(1);
  await page.evaluate(()=>renderMessages());expect(await page.evaluate(()=>inboxReads)).toBe(2);await contained(page);
});

test('enquiry names and message controls remain accessible with enlarged text',async({page},info)=>{
  await open(page,'enquire',listing.id);await expect(page.locator('#enquiryForm')).toBeVisible();
  await page.addStyleTag({content:'html{font-size:150%}'});
  await contained(page);await reachable(page.getByRole('button',{name:'Send message',exact:true}));
  await reachable(page.getByRole('button',{name:'Go back',exact:true}));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await capture(page,info,'enquiry');
});

test('a completed enquiry cannot pull the visitor back after leaving',async({page})=>{
  await page.evaluate(()=>{currentUser={id:'synthetic-guest',is_anonymous:true};VACANCY_BACKEND.startEnquiry=()=>new Promise(resolve=>{window.finishEnquiry=()=>resolve('synthetic-conversation')})});
  await open(page,'enquire',listing.id);await page.getByLabel('Message',{exact:true}).fill('Synthetic enquiry only');
  await page.getByRole('button',{name:'Send message',exact:true}).click();await page.waitForFunction(()=>window.finishEnquiry);
  await open(page,'privacy');await expect(page.locator('.information-page')).toBeVisible();
  await page.evaluate(()=>finishEnquiry());await page.waitForTimeout(150);
  await expect(page).toHaveURL(/#privacy$/);await expect(page.locator('.information-page')).toBeVisible();await contained(page);
});

test('lister profile with a long name remains within the page',async({page},info)=>{
  await open(page,'lister',listing.owner.id);await expect(page.locator('#app h1')).toBeVisible();await contained(page);
  await capture(page,info,'lister-profile');
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
  await expect(page.locator('#chatForm')).toBeVisible();await contained(page);
});

test('a failed enquiry retains its draft and enables retry',async({page})=>{
  await page.evaluate(()=>{currentUser={id:'synthetic-guest',is_anonymous:true};VACANCY_BACKEND.startEnquiry=async()=>{throw Error('Synthetic send interruption')}});
  await open(page,'enquire',listing.id);await page.getByLabel('Message',{exact:true}).fill('Keep this synthetic draft');
  await page.getByRole('button',{name:'Send message',exact:true}).click();
  await expect(page.locator('#toast')).toContainText('Synthetic send interruption');
  await expect(page.getByLabel('Message',{exact:true})).toHaveValue('Keep this synthetic draft');
  await expect(page.getByRole('button',{name:'Send message',exact:true})).toBeEnabled();await contained(page);
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
  expect(await page.evaluate(()=>enquirySends)).toBe(0);await expect(page).toHaveURL(/#terms$/);await contained(page);
});

test('auth mode changes keep one form, password toggle and readable mobile inputs',async({page})=>{
  const form=page.locator('#authUnified');
  for(let i=0;i<4;i++){
    await form.locator('.auth-mode-switch').click();await expect(form).toHaveCount(1);await contained(page);
    if(page.viewportSize().width<=820){
      const small=await form.locator('input:visible').evaluateAll(nodes=>nodes.filter(n=>parseFloat(getComputedStyle(n).fontSize)<16).map(n=>n.name));
      expect(small,'Visible inputs below the iOS focus-zoom threshold').toEqual([]);
    }
  }
  await form.getByRole('button',{name:'Show password',exact:true}).click();
  await expect(form.locator('[name=password]')).toHaveAttribute('type','text');
  await expect(form.getByRole('button',{name:'Hide password',exact:true})).toHaveCount(1);
});

test('listing safety dialog and photo viewer do not accumulate duplicate overlays',async({page})=>{
  await signedIn(page);await open(page,'detail',listing.id);await expect(page.locator('.quiet-gallery')).toBeVisible();
  for(let i=0;i<2;i++){
    await page.getByRole('button',{name:'Report or block',exact:true}).click();
    const dialog=page.locator('.quiet-moderation-dialog');await expect(dialog).toHaveCount(1);
    await dialog.getByRole('button',{name:'Report listing',exact:true}).click();
    await expect(dialog.locator('.quiet-report-form')).toBeVisible();await reachable(dialog.getByRole('button',{name:'Close',exact:true}));
    await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
  }
  await reachable(page.locator('.quiet-message'));await contained(page);
});

test('Find type filters and long search suggestions stay within the viewport',async({page})=>{
  await open(page,'home');await expect(page.locator('#exploreMap')).toBeVisible();
  await page.locator('.map-type-current').click();await expect(page.locator('#mapTypeChoices')).toBeVisible();
  await page.getByRole('button',{name:'Rooms',exact:true}).click();await expect(page.locator('#mapTypeChoices')).toBeVisible();
  await page.locator('#resultCount').click();await expect(page.locator('#mapTypeChoices')).toBeHidden();
  await page.route('**/api/geocode?**',route=>route.fulfill({json:{suggestions:[{lat:-1.26,lon:36.8,label:'SyntheticVeryLongPlaceNameWithoutSpacesForSearchSuggestionLayoutTesting, Nairobi, Kenya'}]}}));
  await page.locator('#searchBtn').click();await page.locator('#q').fill('Synthetic');
  const option=page.getByRole('option');await expect(option).toHaveCount(1);
  const bounds=await option.boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(page.viewportSize().width+1);
  await contained(page);
});

test('owner dashboard actions and a cross-page tour keep the current layout',async({page})=>{
  await signedIn(page);
  await page.evaluate(({id,user})=>{VACANCY_BACKEND.myVacancies=async()=>[{id,status:'active',rooms:{name:'Synthetic owned listing',properties:{owner_id:user.id}}}]},{id:listing.id,user:owner});
  await open(page,'dashboard');await expect(page.getByRole('heading',{name:'Dashboard',exact:true})).toBeVisible();
  await reachable(page.locator('[data-owner-inbox]'));await page.locator('[data-owner-inbox]').click();
  await expect(page.locator('[data-thread]')).toHaveCount(1);await contained(page);
  for(const [name,id,marker]of [['saved',null,'.saved-heading'],['detail',listing.id,'.quiet-gallery'],['home',null,'#exploreMap'],['account',null,'.account-identity'],['privacy',null,'.information-page']]){
    await open(page,name,id);await expect(page.locator(marker)).toBeVisible();await contained(page);
  }
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.locator('body')).not.toHaveClass(/message-thread-active|detail-quiet-active/);
});

test('legal, storage, recovery and unknown-route screens remain usable',async({page})=>{
  for(const name of ['privacy','terms','storage','safety','forgot-password','reset-password','not-a-route']){
    await open(page,name);await expect(page.locator('#app h1').first()).toBeVisible();await contained(page);
  }
});

test('listing gallery opens once, closes and restores navigation after resize',async({page})=>{
  await open(page,'detail',listing.id);await expect(page.locator('.quiet-gallery')).toBeVisible();
  await page.getByRole('button',{name:'Open photo 1 of 2',exact:true}).click();
  await expect(page.locator('.listing-lightbox')).toHaveCount(1);
  await page.keyboard.press('Escape');await expect(page.locator('.listing-lightbox')).not.toBeVisible();
  const viewport=page.viewportSize();await page.setViewportSize({width:568,height:320});await contained(page);
  await page.setViewportSize(viewport);await contained(page);
});
