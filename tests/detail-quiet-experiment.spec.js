const {test, expect} = require('@playwright/test');
const APP = process.env.VACANCY_E2E_URL || 'http://127.0.0.1:4173';
const photo = colour => `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="${colour}"/></svg>`;
const description = 'A quiet room with natural light. '.repeat(18) + '\n\nThe kitchen is shared with two other residents.';
const row = {
  id:'quiet-room', rentAmount:320, rentCurrency:'AUD', rentPeriod:'week', deposit:640,
  availableFrom:'2026-10-12', minimumStayWeeks:8, billsIncluded:true,
  room:{name:'Furnished room in Joondalup', roomType:'Private room', furnished:true, ensuite:false,
    maxOccupants:1, description, media:[{url:photo('orange')},{url:photo('blue')}]},
  property:{id:'quiet-property', suburb:'Joondalup', city:'Perth', state:'WA', country:'Australia',
    propertyType:'House', parkingSpaces:1, internetAvailable:true, securityAvailable:true,
    waterAvailable:true, electricityAvailable:true, smokingAllowed:false, petsConsidered:false,
    householdSummary:'A calm shared house.', publicLatitude:-31.744, publicLongitude:115.769,
    customFeatures:Array.from({length:9},(_,index)=>({label:`Feature ${index+1}`,icon:'house'}))},
  owner:{id:'quiet-owner', displayName:'Taylor Homes', bio:'Local property manager', avatarUrl:photo('purple')}
};
const sibling = {...row,id:'quiet-sibling',room:{...row.room,name:'Second room',media:[{url:photo('green')}]}};

async function open(page, rows=[row,sibling]) {
  await page.route('**/rest/v1/vacancies?**', route => route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);
  await page.waitForFunction(() => booting === false);
  await page.evaluate(value => { vacancies=value; VACANCY_BACKEND.contactOptions=async()=>({in_app:true}); displayCurrency='AUD'; },rows);
}

test('listing cards open the photo-led default and the previous design remains available', async({page}) => {
  await open(page,[row]);
  await page.evaluate(() => nav('detail','quiet-room'));
  await expect(page).toHaveURL(/#detail\/quiet-room$/);
  await expect(page.locator('.quiet-gallery')).toBeVisible();
  await page.evaluate(() => nav('detail-classic','quiet-room'));
  await expect(page.locator('.detail-gallery')).toBeVisible();
  await page.goto(`${APP}/?experiment=quiet#home`);
  await page.waitForFunction(() => booting === false);
  await page.evaluate(value => { vacancies=value; nav('detail','quiet-room'); },[row]);
  await expect(page).toHaveURL(/#detail\/quiet-room$/);
  await expect(page.locator('.quiet-action-bar')).toBeVisible();
});

test('photo-led footer and tall gallery arrows work without opening the photo viewer', async({page}) => {
  await page.setViewportSize({width:390,height:844});
  await open(page,[row]);
  await page.evaluate(() => nav('detail-quiet','quiet-room'));
  const footer=page.locator('.quiet-action-bar');
  await expect(footer).toBeVisible();
  await expect(footer.locator('.quiet-message')).toHaveText('Is this available?');
  await expect(footer.locator('.quiet-action-deposit')).toContainText('640');
  expect(await footer.locator('.quiet-action-prices strong').evaluate(node=>getComputedStyle(node).fontSize)).toBe('20px');
  expect(await footer.locator('.quiet-action-prices strong').evaluate(node=>getComputedStyle(node).fontWeight)).toBe('800');
  expect(await footer.locator('.quiet-action-deposit').evaluate(node=>getComputedStyle(node).color)).toBe('rgb(180, 35, 24)');
  expect((await footer.locator('.quiet-message').boundingBox()).width).toBeGreaterThan(150);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const spacing=await footer.evaluate(node=>{const [price,deposit,date]=['.quiet-action-prices','.quiet-action-deposit','.quiet-action-date'].map(selector=>node.querySelector(selector).getBoundingClientRect()),bar=node.getBoundingClientRect();return {first:deposit.top-price.bottom,second:date.top-deposit.bottom,top:price.top-bar.top,bottom:bar.bottom-date.bottom}});
  expect(Math.abs(spacing.first-spacing.second)).toBeLessThan(1);
  expect(Math.abs(spacing.top-spacing.bottom)).toBeLessThan(2);
  const next=page.getByRole('button',{name:'Next listing photo'});
  const box=await next.boundingBox();
  expect(box.height).toBeGreaterThan(300);
  await next.click({position:{x:box.width/2,y:box.height*.8}});
  await expect(page.locator('.quiet-photo-count')).toHaveText('2 / 2');
  await expect(page.locator('.listing-lightbox')).not.toHaveAttribute('open','');
  const lefts=await page.locator('.quiet-location,.quiet-intro h1,.quiet-description h2').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().left));
  expect(Math.max(...lefts)-Math.min(...lefts)).toBeLessThan(2);
});

test('rules follow amenities and reporting and blocking use the centered dialog', async({page}) => {
  await open(page,[row]);
  await page.evaluate(() => {
    currentUser={id:'seeker'};
    VACANCY_BACKEND.reportVacancy=async (...args)=>{window.__report=args};
    VACANCY_BACKEND.blockUser=async id=>{window.__blocked=id};
    VACANCY_BACKEND.activeVacancies=async()=>[];
    nav('detail','quiet-room');
  });
  await expect(page.locator('.quiet-feature-preview li')).toHaveCount(4);
  await expect(page.locator('.quiet-features .quiet-more')).not.toHaveAttribute('open','');
  expect(await page.locator('.quiet-features,.quiet-rules').evaluateAll(nodes=>nodes.map(node=>node.className))).toEqual(['quiet-section quiet-features','quiet-section quiet-rules']);
  await expect(page.locator('.quiet-rules details')).not.toHaveAttribute('open','');
  await page.locator('.quiet-rules summary').click();
  await expect(page.locator('.quiet-rules details')).toHaveAttribute('open','');
  await page.locator('.quiet-moderation-link').click();
  await expect(page.locator('.quiet-moderation-dialog')).toBeVisible();
  await page.locator('.quiet-report-choice').click();
  await page.locator('.quiet-report-form [name=reason]').selectOption('Scam');
  await page.locator('.quiet-report-form [name=details]').fill('False payment request');
  await page.locator('.quiet-report-form [type=submit]').click();
  await expect.poll(()=>page.evaluate(()=>window.__report)).toEqual(['quiet-room','quiet-owner','Scam','False payment request']);
  await page.locator('.quiet-moderation-link').click();
  await page.locator('.quiet-block-choice').click();
  await page.locator('.quiet-block-confirm button').click();
  await expect.poll(()=>page.evaluate(()=>window.__blocked)).toBe('quiet-owner');
  await expect(page).toHaveURL(/#home$/);
  expect(await page.evaluate(()=>vacancies.length)).toBe(0);
});

test('signed-in viewers do not receive listings owned by their blocked accounts', async({page}) => {
  const rows=['blocked-owner','visible-owner'].map((owner,index)=>({id:`listing-${index}`,status:'active',rent_amount:300,monthly_rent:300,rooms:{id:`room-${index}`,name:'Room',room_type:'Room',media:[],properties:{id:`property-${index}`,owner_id:owner,profiles:{id:owner,display_name:'Lister'}}}}));
  await page.route('**/rest/v1/vacancies?**', route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(rows)}));
  await page.route('**/rest/v1/blocks?**', route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{blocked_id:'blocked-owner'}])}));
  await page.goto(`${APP}/#home`);
  await page.waitForFunction(()=>booting===false);
  const result=await page.evaluate(async()=>{
    const anonymous=(await VACANCY_BACKEND.activeVacancies()).map(item=>item.owner.id);
    localStorage.setItem('vacancy-session-v01',JSON.stringify({access_token:`x.${btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))}.x`}));
    const signedIn=(await VACANCY_BACKEND.activeVacancies()).map(item=>item.owner.id);
    return {anonymous,signedIn};
  });
  expect(result).toEqual({anonymous:['blocked-owner','visible-owner'],signedIn:['visible-owner']});
});

test('You settings can unblock a lister and refresh visible inventory', async({page}) => {
  await open(page,[row]);
  await page.evaluate(async()=>{
    currentUser={id:'seeker',email:'seeker@example.com'};
    VACANCY_BACKEND.profile=async()=>({display_name:'Seeker'});
    VACANCY_BACKEND.blockedUsers=async()=>[{blocked_id:'quiet-owner',profiles:{display_name:'Taylor Homes'}}];
    VACANCY_BACKEND.unblockUser=async id=>{window.__unblocked=id};
    VACANCY_BACKEND.activeVacancies=async()=>[window.__restoredListing];
    window.__restoredListing=vacancies[0];
    VACANCY_BACKEND.adminMembership=async()=>false;
    await renderAccount();
  });
  await page.locator('#blockedAccounts').click();
  await page.locator('[data-unblock="quiet-owner"]').click();
  await expect.poll(()=>page.evaluate(()=>window.__unblocked)).toBe('quiet-owner');
  await expect.poll(()=>page.evaluate(()=>vacancies.length)).toBe(1);
});

test('previous listing design remains available for rollback', async({page}) => {
  await open(page);
  await page.evaluate(() => nav('detail-classic','quiet-room'));
  const about=page.locator('.listing-detail-sections .quiet-description');
  await expect(about.getByRole('heading',{name:'About this place'})).toBeVisible();
  await expect(about.locator('.quiet-description-preview')).toContainText('A quiet room with natural light');
  await expect(page.locator('.listing-detail-sections')).toContainText('A calm shared house.');
  await about.getByText('Show more').click();
  await expect(about.locator('.quiet-more')).toHaveAttribute('open','');
  await expect(about.locator('.quiet-more')).toContainText('The kitchen is shared');
});

test('default route presents the photo-led listing with the original available for rollback', async({page}) => {
  await page.setViewportSize({width:390,height:844});
  await open(page);
  await page.evaluate(() => nav('detail-classic','quiet-room'));
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.locator('.detail-gallery')).toBeVisible();
  await page.evaluate(() => nav('detail','quiet-room'));
  await expect(page.locator('.topbar')).toBeHidden();
  await expect(page.locator('.mobile-nav')).toBeHidden();
  await expect(page.locator('.quiet-gallery')).toBeVisible();
  await expect(page.locator('.quiet-action-bar')).toBeVisible();
  await expect(page.locator('.quiet-action-bar')).toContainText('A$ 320/week');
  await expect(page.locator('.quiet-action-bar')).toContainText('Deposit A$ 640');
  await expect(page.locator('.quiet-action-bar')).toContainText('12 Oct 2026');
  expect(await page.locator('.quiet-action-bar').evaluate(node=>getComputedStyle(node).position)).toBe('fixed');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
  expect(await page.evaluate(()=>document.querySelector('.quiet-content').getBoundingClientRect().top<document.querySelector('.quiet-gallery').getBoundingClientRect().bottom)).toBe(true);
  await expect(page.locator('.quiet-intro h1')).toHaveText(row.room.name);
  await expect(page.locator('.quiet-location')).toContainText('Joondalup');
  await expect(page.locator('.quiet-room')).toContainText('Second room');
  await expect(page.locator('.quiet-photo-count')).toHaveText('1 / 2');
  await page.locator('[data-quiet-gallery]').evaluate(node => node.scrollTo({left:node.clientWidth,behavior:'instant'}));
  await expect(page.locator('.quiet-photo-count')).toHaveText('2 / 2');
  await page.locator('.quiet-photo-count').click();
  await expect(page.locator('.listing-lightbox')).toHaveAttribute('open','');
  await page.getByRole('button',{name:'Close photo viewer'}).click();
  await page.locator('.quiet-description .quiet-more > summary').click();
  await expect(page.locator('.quiet-description .quiet-more')).toContainText('The kitchen is shared');
  await expect(page.locator('.quiet-features .quiet-more > summary')).toContainText('Show all 16 features');
  await page.locator('.quiet-features .quiet-more > summary').click();
  await expect(page.locator('.quiet-features .quiet-more li')).toHaveCount(16);
  await expect(page.locator('#detailLocationMap')).toBeVisible();
  await page.setViewportSize({width:1280,height:800});
  expect(await page.locator('.quiet-content').evaluate(node=>node.clientWidth-parseFloat(getComputedStyle(node).paddingLeft)-parseFloat(getComputedStyle(node).paddingRight))).toBeLessThanOrEqual(760);
  await expect(page.locator('.quiet-action-bar')).toBeVisible();
  await page.locator('.quiet-back').click();
  await expect(page).toHaveURL(/#detail-classic\/quiet-room$/);
  await expect(page.locator('.topbar')).toBeVisible();
});

test('five photos form a desktop cover gallery while every photo remains available in the viewer',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  const five={...row,id:'five-photos',room:{...row.room,media:['red','blue','green','orange','purple'].map(colour=>({url:photo(colour)}))}};
  await open(page,[five]);
  await page.evaluate(()=>nav('detail-quiet','five-photos'));
  const gallery=page.locator('.quiet-gallery-track');
  expect(await gallery.evaluate(node=>getComputedStyle(node).display)).toBe('grid');
  await expect(page.locator('.quiet-gallery-slide')).toHaveCount(5);
  await page.locator('.quiet-gallery-slide img').nth(4).click();
  await expect(page.locator('.listing-lightbox')).toHaveAttribute('open','');
  await expect(page.locator('.listing-lightbox span')).toHaveText('5 / 5');
});

test('experimental action remains available and missing media or price degrade cleanly', async({page}) => {
  await page.setViewportSize({width:1280,height:800});
  const sparse={...row,id:'quiet-sparse',rentAmount:null,monthlyRent:null,deposit:null,availableFrom:null,
    room:{...row.room,description:'',media:[]},property:{...row.property,publicLatitude:null,publicLongitude:null,customFeatures:[]}};
  await open(page,[sparse]);
  await page.evaluate(() => nav('detail-quiet','quiet-sparse'));
  await expect(page.locator('.quiet-action-bar')).toBeVisible();
  await expect(page.locator('.quiet-action-bar')).toContainText('Price on request');
  await expect(page.locator('.quiet-photo-count')).toHaveCount(0);
  await expect(page.locator('#detailLocationMap')).toHaveCount(0);
  await expect(page.locator('.quiet-description')).toHaveCount(0);
  await page.evaluate(()=>{VACANCY_BACKEND.startEnquiry=async()=>{window.__sentFromPreset=true}});
  await page.locator('.quiet-message').click();
  await expect(page).toHaveURL(/#enquire\/quiet-sparse$/);
  await expect(page.locator('#enquiryForm [name="message"]')).toHaveValue('Hi, is this still available?');
  expect(await page.evaluate(()=>window.__sentFromPreset===true)).toBe(false);
  await expect(page.locator('.topbar')).toBeHidden();
});

test('known whole-house counts appear after location while unknown details stay hidden', async({page}) => {
  const house={...row,id:'whole-house',room:{...row.room,roomType:'House',description:'  '},property:{...row.property,bedrooms:2,bathrooms:2,householdSummary:'   '}};
  await open(page,[house]);
  await page.evaluate(()=>nav('detail-quiet','whole-house'));
  await expect(page.locator('.quiet-count-facts')).toContainText('2×');
  await expect(page.locator('.quiet-count-facts span[aria-hidden]')).toHaveCount(0);
  await expect(page.locator('.quiet-description')).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'About the property'})).toHaveCount(0);
  expect(await page.locator('.quiet-icon-button').first().evaluate(node=>getComputedStyle(node).backgroundColor)).toContain('0.28');
});

test('previous price appears only when higher and approved display features can be hidden', async({page}) => {
  const reduced={...row,id:'reduced-room',comparePrice:400};
  await open(page,[reduced]);
  await page.evaluate(()=>{VACANCY_LISTING_OPTIONS.isVisible=slot=>slot!=='listing-wifi';nav('detail-quiet','reduced-room')});
  await expect(page.locator('.quiet-action-prices s')).toContainText('A$ 400/week');
  await expect(page.locator('.quiet-features')).not.toContainText('Wi-Fi or internet');
  await page.evaluate(()=>{vacancies[0].comparePrice=300;renderDetailQuiet('reduced-room')});
  await expect(page.locator('.quiet-action-prices s')).toHaveCount(0);
});

test('save, share, sibling and lister controls retain their existing destinations', async({page}) => {
  await open(page);
  await page.evaluate(() => {
    currentUser={id:'seeker'};
    toggleSave=async id=>{saved.add(id)};
    Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__sharedListing=data}});
    nav('detail-quiet','quiet-room');
  });
  await page.locator('.quiet-save').click();
  await expect(page.locator('.quiet-save')).toHaveAttribute('aria-pressed','true');
  await page.locator('.quiet-share').click();
  await expect.poll(()=>page.evaluate(()=>window.__sharedListing?.url)).toContain('/listings/quiet-room/');
  await page.locator('.quiet-room').click();
  await expect(page).toHaveURL(/#detail\/quiet-sibling$/);
  await page.locator('.quiet-lister').click();
  await expect(page).toHaveURL(/#lister\/quiet-owner$/);
});

test('older opt-in links still open photo-led listings without showing a design switch', async({page}) => {
  await page.route('**/rest/v1/vacancies?**', route => route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/?experiment=quiet#home`);
  await page.waitForFunction(() => booting === false);
  await page.evaluate(value => {vacancies=value;displayCurrency='AUD';nav('detail','quiet-room')},[row]);
  await expect(page).toHaveURL(/#detail\/quiet-room$/);
  await expect(page.locator('.quiet-gallery')).toBeVisible();
  await expect(page.locator('.quiet-compare')).toHaveCount(0);
  await page.evaluate(()=>nav('detail-classic','quiet-room'));
  await expect(page.locator('.detail-gallery')).toBeVisible();
});

test('inbox shows contact context, latest text and a sent indicator', async({page}) => {
  await open(page,[row]);
  await page.evaluate(()=>{
    currentUser={id:'seeker'};
    const conversation=(id,time,body)=>({id,created_at:time,vacancies:{rooms:{name:'Furnished room in Joondalup',properties:{suburb:'Joondalup',owner_id:'quiet-owner'}}},conversation_members:[{user_id:'seeker',last_read_at:'2026-01-01'}],messages:[{id:id+'-message',sender_id:'seeker',body,created_at:time}]});
    VACANCY_BACKEND.conversations=async()=>[conversation('recent','2026-09-29T12:00:00Z','Can I view it?'),conversation('older','2026-09-28T12:00:00Z','Hello')];
    VACANCY_BACKEND.markConversationRead=async()=>{};
    nav('messages');
  });
  await expect(page.locator('.thread-item')).toHaveCount(2);
  await expect(page.getByRole('heading',{name:'Messages'})).toHaveCount(0);
  await expect(page.locator('.thread-item').first()).toContainText('Taylor Homes');
  await expect(page.locator('.thread-item').first()).toContainText('Can I view it?');
  await expect(page.locator('.thread-item').first().locator('.thread-avatar img')).toHaveCount(1);
  await expect(page.locator('.thread-item').first().locator('[aria-label="Sent"]')).toHaveCount(1);
});

test('read ticks only appear when the other member read after the message', async({page}) => {
  await open(page,[row]);
  await page.evaluate(()=>{
    currentUser={id:'seeker'};
    VACANCY_BACKEND.conversations=async()=>[{id:'thread',created_at:'2026-09-29T12:00:00Z',vacancies:{rooms:{name:'Furnished room',properties:{suburb:'Joondalup',owner_id:'quiet-owner'}}},conversation_members:[{user_id:'seeker',last_read_at:'2026-09-29T12:00:00Z'}],messages:[{id:'message',sender_id:'seeker',body:'Hello',created_at:'2026-09-29T12:00:00Z'}]}];
    VACANCY_BACKEND.conversationPeer=async()=>({display_name:'Taylor Homes',avatar_path:null,last_read_at:'2026-09-29T12:01:00Z'});
    VACANCY_BACKEND.markConversationRead=async()=>{};
    nav('messages');
  });
  await page.locator('.thread-item').click();
  await expect(page.locator('.bubble.me [aria-label="Read"]')).toHaveText('✓✓');
});

test('mobile inbox opens a full conversation and does not mark previews read', async({page}) => {
  await page.setViewportSize({width:390,height:844});
  await open(page,[row]);
  await page.evaluate(()=>{
    currentUser={id:'seeker'};
    VACANCY_BACKEND.conversations=async()=>[{id:'thread',created_at:'2026-09-29T12:00:00Z',vacancies:{id:'quiet-room',rooms:{name:'Furnished room',properties:{suburb:'Joondalup',owner_id:'quiet-owner'}}},conversation_members:[{user_id:'seeker',last_read_at:'2026-01-01'}],messages:[{id:'message',sender_id:'quiet-owner',body:'Still available',created_at:'2026-09-29T12:00:00Z'}]}];
    VACANCY_BACKEND.conversationPeer=async()=>({display_name:'Taylor Homes',avatar_path:null,last_read_at:null});
    VACANCY_BACKEND.markConversationRead=async()=>{window.__markedRead=true};
    nav('messages');
  });
  await expect(page.locator('.thread-list')).toBeVisible();
  await expect(page.locator('.chat')).toBeHidden();
  expect(await page.evaluate(()=>window.__markedRead===true)).toBe(false);
  await page.locator('.thread-item').click();
  await expect(page.locator('.chat')).toBeVisible();
  await expect(page.locator('.thread-list')).toBeHidden();
  await expect(page.locator('.topbar')).toBeHidden();
  await expect(page.locator('.chat-listing')).toHaveAttribute('href',/\/listings\/quiet-room\//);
  await expect(page.locator('.chat-log')).toContainText('Still available');
  await page.locator('.chat-back').click();
  await expect(page.locator('.thread-list')).toBeVisible();
});

test('chat plus previews a photo and sends it only after Send is pressed', async({page}) => {
  await open(page,[row]);
  await page.evaluate(()=>{
    currentUser={id:'seeker'};
    VACANCY_BACKEND.conversations=async()=>[{id:'thread',created_at:'2026-09-29T12:00:00Z',vacancies:{rooms:{name:'Furnished room',properties:{suburb:'Joondalup',owner_id:'quiet-owner'}}},conversation_members:[{user_id:'seeker',last_read_at:'2026-01-01'}],messages:[]}];
    VACANCY_BACKEND.conversationPeer=async()=>({display_name:'Taylor Homes',avatar_path:null,last_read_at:null});
    VACANCY_BACKEND.markConversationRead=async()=>{};
    VACANCY_BACKEND.sendConversationPhoto=async(id,file,caption)=>{window.__photoSent={id,type:file.type,caption};return 'message-id'};
    nav('messages','thread');
  });
  await page.locator('#chatForm [name=photo]').setInputFiles({name:'room.png',mimeType:'image/png',buffer:Buffer.from('test-image')});
  await expect(page.locator('.chat-photo-draft')).toBeVisible();
  expect(await page.evaluate(()=>window.__photoSent)).toBeUndefined();
  await page.locator('#chatForm [name=body]').fill('Is this room available?');
  await page.locator('#chatForm .primary').click();
  expect(await page.evaluate(()=>window.__photoSent)).toEqual({id:'thread',type:'image/png',caption:'Is this room available?'});
});

test('shared chat photo opens in a focused viewer', async({page}) => {
  await open(page,[row]);
  await page.evaluate(()=>{
    currentUser={id:'seeker'};
    VACANCY_BACKEND.conversations=async()=>[{id:'thread',created_at:'2026-09-29T12:00:00Z',vacancies:{rooms:{name:'Furnished room',properties:{suburb:'Joondalup',owner_id:'quiet-owner'}}},conversation_members:[{user_id:'seeker',last_read_at:'2026-01-01'}],messages:[{id:'photo',sender_id:'quiet-owner',body:'Photo',media_path:'thread/photo.png',created_at:'2026-09-29T12:00:00Z'}]}];
    VACANCY_BACKEND.conversationPeer=async()=>({display_name:'Taylor Homes',avatar_path:null,last_read_at:null});
    VACANCY_BACKEND.conversationPhotoUrl=async()=> 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>';
    VACANCY_BACKEND.markConversationRead=async()=>{};
    nav('messages','thread');
  });
  await expect(page.locator('.chat-photo img')).toHaveCount(1);
  await page.locator('.chat-photo').click();
  await expect(page.locator('.chat-photo-viewer')).toHaveAttribute('open','');
  await page.getByRole('button',{name:'Close photo'}).click();
  await expect(page.locator('.chat-photo-viewer')).toHaveCount(0);
});
