const {test,expect}=require('@playwright/test');
const {install,createCloud,owner}=require('../qa/account-drafts/synthetic-cloud.cjs');

let errors;
test.beforeEach(async({page,context})=>{
  errors=[];page.on('pageerror',error=>errors.push(error.message));
  await install(context,createCloud());
  await context.addInitScript(()=>{
    localStorage.setItem('vacancy-theme-v1','light');
    localStorage.setItem('vacancy-market-v1','KE');
    localStorage.setItem('vacancy-analytics-disabled','true');
  });
  await page.goto('/#auth');
  await expect(page.locator('#authUnified')).toBeVisible();
  await page.waitForFunction(()=>!booting);
});
test.afterEach(async({page},info)=>{
  if(!page.isClosed())await info.attach('layout-evidence',{
    body:JSON.stringify(await page.evaluate(()=>({url:location.hash,width:innerWidth,
      documentWidth:document.documentElement.scrollWidth,
      mutations:window.__uiMutations||[],
      duplicateIds:[...document.querySelectorAll('#app [id]')].map(n=>n.id)
        .filter((id,i,all)=>all.indexOf(id)!==i),
    })),null,2),contentType:'application/json',
  });
  expect(errors,'Uncaught browser errors').toEqual([]);
});

async function chooser(page){
  const navigation=page.locator(page.viewportSize().width<=820?'.mobile-nav':'.desktop-nav');
  // Auth deliberately hides desktop navigation; a direct route is also supported.
  if(await navigation.locator('[data-nav=list]').isVisible())await navigation.locator('[data-nav=list]').click();
  else await page.evaluate(()=>nav('list','new'));
  await expect(page.locator('.listing-type-grid [data-listing-type]')).toHaveCount(4);
}
async function createRoom(page){
  await chooser(page);
  await page.locator('[data-listing-type=Residential]').click();
  await page.locator('[data-preset=Room]').click();
  await page.getByRole('button',{name:'New property',exact:true}).click();
  await expect(page.locator('#listingForm')).toHaveAttribute('data-journey-step','0');
}
async function contained(page){
  expect(await page.evaluate(()=>Math.max(document.body.scrollWidth,
    document.documentElement.scrollWidth)-innerWidth),'Horizontal page overflow').toBeLessThanOrEqual(1);
  await expect(page.locator('.current-page-loading,.listing-transition-loading')).toHaveCount(0);
  const duplicates=await page.locator('#app [id]').evaluateAll(nodes=>
    nodes.map(n=>n.id).filter((id,i,all)=>all.indexOf(id)!==i));
  expect(duplicates,'Duplicate IDs in the current page').toEqual([]);
}
async function reachable(locator){
  await locator.scrollIntoViewIfNeeded();await expect(locator).toBeVisible();
  expect(await locator.evaluate(node=>{
    const box=node.getBoundingClientRect();
    const hit=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);
    return node.contains(hit);
  }),'Action is covered by another element').toBe(true);
}

test('auth and recovery remain contained with enlarged text and validation',async({page})=>{
  await page.addStyleTag({content:'html{font-size:200%}'});
  await page.locator('#authUnified [name=email]').fill('invalid-email');
  const signIn=page.locator('#authUnified').getByRole('button',{name:'Sign in',exact:true});
  await reachable(signIn);
  await signIn.click();
  await expect(page.locator('#authUnified')).toBeVisible();await contained(page);
  await page.evaluate(()=>VACANCY_RECOVERY.renderRequest());
  await contained(page);
});

test('listing chooser and location form have one copy and accessible actions',async({page})=>{
  await createRoom(page);await contained(page);
  await expect(page.locator('#listingForm')).toHaveCount(1);
  await reachable(page.locator('#listingForm .journey-next'));
  await page.locator('#listingForm .journey-next').click();
  await expect(page.locator('#listingForm')).toHaveAttribute('data-journey-step','0');
  await contained(page);
});

test('repeated dashboard renders share the in-flight listing read',async({page})=>{
  await page.evaluate(async user=>{
    currentUser=user;localStorage.setItem('vacancy-list-entry-account-v1:'+user.id,'1');
    window.__listingReads=0;window.__uiMutations=[];
    VACANCY_BACKEND.myProperties=async()=>[];
    VACANCY_BACKEND.myVacancies=async()=>{
      window.__listingReads++;await new Promise(resolve=>setTimeout(resolve,200));return [];
    };
    new MutationObserver(()=>{
      if(__uiMutations.length<100)__uiMutations.push({at:performance.now(),
        forms:document.querySelectorAll('#listingForm').length,
        obsolete:!!document.querySelector('.listing-type-grid [data-listing-type="Studio"]')});
    }).observe(document.querySelector('#app'),{childList:true,subtree:true});
    history.replaceState(null,'','#list');route=parseHash();
    await Promise.all([renderList(),renderList(),renderList()]);
  },owner);
  await expect(page.locator('#createNewListing')).toBeVisible();
  expect(await page.evaluate(()=>__listingReads)).toBe(1);
  expect(await page.evaluate(()=>__uiMutations.some(row=>row.forms||row.obsolete))).toBe(false);
  await contained(page);
  await page.evaluate(()=>renderList());
  expect(await page.evaluate(()=>__listingReads),'A later refresh must fetch fresh data').toBe(2);
  await page.evaluate(()=>{nav('privacy');nav('list')});
  await expect.poll(()=>page.evaluate(()=>__listingReads)).toBe(3);
  await expect(page.locator('#createNewListing')).toBeVisible();
  expect(await page.evaluate(()=>__listingReads),'Queued route events share one dashboard read').toBe(3);
});

test('slow account load cannot replace a newer page',async({page})=>{
  await page.evaluate(user=>{
    currentUser=user;
    VACANCY_BACKEND.profile=()=>new Promise(resolve=>{window.__releaseProfile=()=>resolve({display_name:'Synthetic member'})});
    VACANCY_BACKEND.blockedUsers=async()=>[];
    VACANCY_BACKEND.adminMembership=async()=>false;
    nav('account');
  },owner);
  await page.waitForFunction(()=>typeof __releaseProfile==='function');
  await page.evaluate(()=>nav('privacy'));
  await expect(page.getByRole('heading',{name:/Privacy/i}).first()).toBeVisible();
  await page.evaluate(async()=>{__releaseProfile();await new Promise(resolve=>setTimeout(resolve,100));});
  await expect(page.getByRole('heading',{name:/Privacy/i}).first()).toBeVisible();
  await expect(page.locator('.account-page')).toHaveCount(0);
  await contained(page);
});

test('dashboard recovers after a shared failed request',async({page})=>{
  const result=await page.evaluate(async user=>{
    currentUser=user;localStorage.setItem('vacancy-list-entry-account-v1:'+user.id,'1');
    history.replaceState(null,'','#list');route=parseHash();let reads=0;
    VACANCY_BACKEND.myProperties=async()=>[];
    VACANCY_BACKEND.myVacancies=async()=>{
      reads++;await new Promise(resolve=>setTimeout(resolve,100));
      if(reads===1)throw Error('Synthetic interrupted request');return [];
    };
    await Promise.allSettled([renderList(),renderList()]);
    const afterFailure=reads;
    await renderList();
    return {afterFailure,afterRetry:reads};
  },owner);
  expect(result).toEqual({afterFailure:1,afterRetry:2});
  await expect(page.locator('#createNewListing')).toBeVisible();await contained(page);
});

test('Find and listing details contain long listing content',async({page})=>{
  const rows=[1,2,3].map(n=>({
    id:'30000000-0000-4000-8000-'+String(n).padStart(12,'0'),status:'active',
    rent_amount:25000,rent_currency:'KES',rent_period:'month',monthly_rent:25000,
    confirmed_at:'2026-10-21T00:00:00Z',expires_at:'2027-10-21T00:00:00Z',
    available_from:'2026-10-01',minimum_stay_weeks:4,
    rooms:{id:'room-'+n,name:'Synthetic spacious room near transport '+n,unit_type:'Bedsitter',
      room_type:'Private room',max_occupants:1,description:'Synthetic description. '.repeat(30),
      media:[{url:'/assets/vacancy-logo.png'}],properties:{id:'property-'+n,
        title:'SyntheticPropertyTitleWithoutSpacesThatShouldStillFitOnSmallScreens',
        suburb:'Westlands',city:'Nairobi',country:'Kenya',state:'Nairobi County',
        market_code:'KE',property_type:'Apartment',public_latitude:-1.26+n/1000,
        public_longitude:36.8+n/1000,owner_id:owner.id,
        profiles:{id:owner.id,display_name:'Synthetic lister'}}},
  }));
  await page.route('**/rest/v1/vacancies?**',route=>{
    const id=new URL(route.request().url()).searchParams.get('id')?.replace(/^eq\./,'');
    return route.fulfill({json:id?rows.filter(row=>row.id===id):rows});
  });
  await page.goto('/?ui-audit=inventory#home');
  await expect(page.locator('#exploreMap')).toBeVisible();
  await expect(page.locator('.explore-card')).toHaveCount(3);
  await contained(page);
  await page.evaluate(id=>nav('detail',id),rows[0].id);
  await expect(page.locator('#app h1').first()).toBeVisible();
  await contained(page);
});

test('long account name and email fit without covering profile actions',async({page})=>{
  await page.evaluate(async user=>{
    currentUser={...user,email:'a-very-long-synthetic-member-address-without-spaces@example.test'};
    VACANCY_BACKEND.profile=async()=>({display_name:'VeryLongSyntheticMemberNameWithoutAnySpacesForLayoutTesting'});
    VACANCY_BACKEND.blockedUsers=async()=>[];
    VACANCY_BACKEND.adminMembership=async()=>false;
    history.replaceState(null,'','#account');route=parseHash();await renderAccount();
  },owner);
  await expect(page.locator('#editProfile')).toBeVisible();await contained(page);
  await reachable(page.locator('#editProfile'));await page.locator('#editProfile').click();
  await expect(page.locator('#profileForm')).toBeVisible();await contained(page);
});

test('rapid navigation and Back/Forward leave a single current form',async({page})=>{
  await chooser(page);
  for(let i=0;i<3;i++){
    await page.evaluate(()=>{nav('auth');nav('list','new');nav('auth')});
    await expect(page.locator('#authUnified')).toBeVisible();
    await expect(page.locator('.listing-start')).toHaveCount(0);await contained(page);
  }
  await page.evaluate(()=>nav('list','new'));
  await expect(page.locator('.listing-type-grid [data-listing-type]')).toHaveCount(4);
  await page.goBack();await expect(page.locator('#authUnified')).toBeVisible();
  await page.goForward();await expect(page.locator('.listing-type-grid [data-listing-type]')).toHaveCount(4);
  await contained(page);
});

test('approved auth appearance @visual',async({page})=>{
  await contained(page);
  await expect(page).toHaveScreenshot('auth.png',{animations:'disabled',fullPage:true});
});
test('approved chooser appearance @visual',async({page})=>{
  await chooser(page);await contained(page);
  await expect(page).toHaveScreenshot('listing-chooser.png',{animations:'disabled',fullPage:true});
});
