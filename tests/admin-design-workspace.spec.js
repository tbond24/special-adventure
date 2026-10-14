const {test,expect}=require('@playwright/test');
const base='http://127.0.0.1:8776';

// Injected by the local fixture server only; no remote data or real actions.
function syntheticDesignFixture(){
  const publicRoom={
    id:'55555555-5555-4555-8555-555555555555',
    status:'active',rentAmount:25000,monthlyRent:25000,
    rentCurrency:'KES',rentPeriod:'month',deposit:10000,
    billsIncluded:false,availableFrom:null,minimumStayWeeks:8,
    room:{id:'66666666-6666-4666-8666-666666666666',name:'Synthetic public room',
      roomType:'Room',unitDetails:{},media:[],description:'Development-only listing preview',
      furnished:true,ensuite:false,maxOccupants:2},
    property:{id:'77777777-7777-4777-8777-777777777777',
      suburb:'Synthetic area',city:'Nairobi',state:'Nairobi',country:'Kenya',
      propertyType:'Shared house',bedrooms:3,bathrooms:2,householdSummary:'',
      customFeatures:[],parkingSpaces:0,waterAvailable:false,
      electricityAvailable:false,securityAvailable:false,internetAvailable:true,
      smokingAllowed:false,petsConsidered:false},
    owner:{id:'88888888-8888-4888-8888-888888888888',
      displayName:'Synthetic member',bio:'',avatarUrl:''}
  };
  window.__designTest={
    published:{revision:0,config:{}},draft:null,history:[],trackCount:0,
    businessCount:0,publishCount:0,restoreCount:0,
    clone:x=>JSON.parse(JSON.stringify(x))
  };
  const T=window.__designTest;
  VACANCY_BACKEND.activeVacancies=async()=>[publicRoom];
  VACANCY_BACKEND.trackEvent=async()=>{T.trackCount++;};
  VACANCY_BACKEND.saveVacancy=async()=>{T.businessCount++;};
  VACANCY_BACKEND.unsaveVacancy=async()=>{T.businessCount++;};
  VACANCY_BACKEND.adminAppearanceState=async()=>({
    published:T.clone(T.published),draft:T.clone(T.draft),canPublish:true});
  VACANCY_BACKEND.adminAppearanceSaveDraft=async(key,config,expected,base)=>{
    if(expected!==(T.draft?.version||0)||base!==T.published.revision)
      throw Error('Synthetic revision conflict');
    T.draft={version:expected+1,baseRevision:base,config:T.clone(config)};
    return T.clone(T.draft);
  };
  VACANCY_BACKEND.adminAppearancePublish=async(key,expected,draftVersion,reason,requestId)=>{
    if(!T.draft||expected!==T.published.revision||draftVersion!==T.draft.version)
      throw Error('Synthetic publish conflict');
    T.published={revision:expected+1,config:T.clone(T.draft.config)};
    T.history.unshift({revision:T.published.revision,
      config:T.clone(T.published.config),actor_id:'synthetic-admin',
      reason,published_at:new Date().toISOString()});
    T.draft=null;T.publishCount++;
    return {revision:T.published.revision,alreadyApplied:false};
  };
  VACANCY_BACKEND.adminAppearanceHistory=async()=>T.clone(T.history);
  VACANCY_BACKEND.adminAppearanceRestoreDraft=async(key,revision,draftVersion,base)=>{
    const row=T.history.find(x=>x.revision===revision);
    if(!row)throw Error('Synthetic revision missing');
    T.restoreCount++;T.draft={
      version:draftVersion+1,baseRevision:base,config:T.clone(row.config)};
    return T.clone(T.draft);
  };
  VACANCY_BACKEND.siteAppearancePublished=async()=>T.published.revision?[{
    key:'listing-detail/save-button',revision:T.published.revision,
    config:T.clone(T.published.config)}]:[];
}

test.beforeEach(async({page})=>{
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    return url.origin===base?route.continue():route.abort();
  });
  await page.route('**/__admin-visual-fixture.js',async route=>{
    const response=await route.fetch();
    let source=await response.text();
    const anchor='  const before=renderAdmin;let panel;';
    if(!source.includes(anchor))throw Error('Admin fixture anchor changed');
    source=source.replace(anchor,'('+syntheticDesignFixture.toString()+')();\n'+anchor);
    await route.fulfill({response,body:source});
  });
  await page.goto(base+'/__admin-preview');
  await page.waitForFunction(()=>window.__visualReady===true);
  await page.locator('#adminSectionMenu [data-section=design]').click();
  await expect(page.locator('.design-board')).toBeVisible();
  await expect(page.locator('[data-frame-status]')).toContainText('Actual public renderer');
});

test('verified page selection uses a script-disabled real public renderer and no product writes',async({page})=>{
  await expect(page.locator('[data-design-tree] [data-select-element]')).toContainText('Save listing');
  await expect(page.locator('.design-element-id code')).toHaveText('listing-detail/save-button');
  const frame=page.locator('[data-design-frame]');
  await expect(frame).toHaveAttribute('sandbox','');
  const source=await frame.getAttribute('srcdoc');
  expect(source).toContain('class="quiet-detail"');
  expect(source).toContain('class="quiet-icon-button quiet-save"');
  expect(source).not.toContain('<script');
  await page.locator('[data-select-preview]').click();
  expect(await page.evaluate(()=>({
    telemetry:window.__designTest.trackCount,
    actions:window.__designTest.businessCount
  }))).toEqual({telemetry:0,actions:0});
  await page.locator('[data-mode=desktop]').click();
  await expect(page.locator('[data-logical-width]')).toHaveText('1024 px');
  await page.locator('[data-tree=components]').click();
  await expect(page.locator('[data-design-tree]')).toContainText('Listing detail');
  await page.locator('[data-tree-search]').fill('nonexistent-element');
  await expect(page.locator('[data-design-tree]')).toContainText('No registered elements match');
  await page.locator('[data-tree-search]').fill('save');
  await expect(page.locator('[data-design-tree] [data-select-element]')).toBeVisible();
});

test('validated private draft cannot publish until saved and reviewed',async({page})=>{
  const radius=page.locator('[data-style-field=radius]');
  await radius.fill('24');
  await radius.press('Tab');
  await expect(page.locator('[data-save-draft]')).toBeEnabled();
  await expect(page.locator('[data-review]')).toBeDisabled();
  expect(await page.locator('[data-design-frame]').getAttribute('srcdoc'))
    .toContain('border-radius:24px');
  await page.locator('[data-save-draft]').click();
  await expect(page.locator('[data-review]')).toBeEnabled();
  expect(await page.evaluate(()=>window.__designTest.published.revision)).toBe(0);
  await page.locator('[data-review]').click();
  await expect(page.locator('[data-diff]')).toContainText('Border radius');
  await expect(page.locator('[data-diff]')).toContainText('24');
  await page.locator('[data-publish-reason]').fill('Synthetic Save control styling');
  await page.locator('[data-confirm-publish]').click();
  await expect(page.locator('[data-draft-status]')).toContainText('Published revision 1');
  expect(await page.evaluate(()=>({
    published:window.__designTest.published,
    releases:window.__designTest.publishCount
  }))).toEqual({published:{revision:1,config:{all:{radius:24}}},releases:1});
  await page.locator('[data-history]').click();
  await expect(page.locator('[data-history-list]')).toContainText('Version 1');
  expect(await page.evaluate(()=>window.__designTest.businessCount)).toBe(0);
});

test('invalid style cannot be saved and preview mode is separate from edit scope',async({page})=>{
  await page.locator('[data-edit-scope]').selectOption('mobile');
  await page.locator('[data-mode=desktop]').click();
  await page.locator('[data-style-field=background]').fill('not a colour');
  await page.locator('[data-style-field=background]').press('Tab');
  await expect(page.locator('[data-save-draft]')).toBeDisabled();
  await expect(page.locator('[data-style-field=background]')).toHaveAttribute('aria-invalid','true');
  await page.locator('[data-style-field=background]').fill('#FF7733');
  await page.locator('[data-style-field=background]').press('Tab');
  await expect(page.locator('[data-save-draft]')).toBeEnabled();
  await page.locator('[data-inspect=advanced]').click();
  await expect(page.locator('[data-generated-css]')).toContainText('@media (max-width:767px)');
  expect(await page.locator('[data-design-frame]').getAttribute('srcdoc'))
    .toContain('@media (max-width:767px)');
  await page.locator('[data-inspect=content]').click();
  await expect(page.locator('[data-inspector-content]')).toContainText('not approved');
  await page.locator('[data-inspect=visibility]').click();
  await expect(page.locator('[data-inspector-visibility]')).toContainText('not enabled');
});

test('existing Reports and Appearance remain reachable',async({page})=>{
  await page.locator('#adminSectionMenu [data-section=reports]').click();
  await expect(page.locator('[data-admin-section=reports]')).toBeVisible();
  await page.locator('#adminSectionMenu [data-section=icons]').click();
  await expect(page.locator('[data-admin-section=icons]')).toBeVisible();
});
