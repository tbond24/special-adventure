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
  await expect(page.locator('[data-logical-width]')).toHaveText('1280 px');
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


test('dirty navigation offers Stay, Save private draft, and Discard',async({page})=>{
  const radius=page.locator('[data-style-field=radius]');
  await radius.fill('18');await radius.press('Tab');
  const back=page.locator('.console-return');
  await back.click();
  await expect(page.locator('.design-leave-dialog')).toBeVisible();
  await page.locator('[data-leave-stay]').click();
  await expect(page.locator('.design-leave-dialog')).toBeHidden();
  expect(new URL(page.url()).hash).toBe('#admin');
  await expect(radius).toHaveValue('18');
  await back.click();
  await page.locator('[data-leave-save]').click();
  await expect.poll(()=>new URL(page.url()).hash).toBe('#home');
  expect(await page.evaluate(()=>window.__designTest.draft))
    .toMatchObject({version:1,baseRevision:0,config:{all:{radius:18}}});
  expect(await page.evaluate(()=>window.__designTest.published.revision)).toBe(0);

  await page.evaluate(()=>{history.replaceState(null,'','#admin');route=parseHash();});
  await page.evaluate(()=>renderAdmin());
  await page.locator('#adminSectionMenu [data-section=design]').click();
  await expect(page.locator('.design-board')).toBeVisible();
  await page.locator('[data-style-field=radius]').fill('12');
  await page.locator('[data-style-field=radius]').press('Tab');
  await page.locator('.console-return').click();
  await expect(page.locator('.design-leave-dialog')).toBeVisible();
  await page.locator('[data-leave-discard]').click();
  await expect.poll(()=>new URL(page.url()).hash).toBe('#home');
  expect(await page.evaluate(()=>window.__designTest.draft.config.all.radius)).toBe(18);
});

test('two publications and restore create a reviewed third revision',async({page})=>{
  await page.locator('[data-style-field=radius]').fill('12');
  await page.locator('[data-style-field=radius]').press('Tab');
  await page.locator('[data-save-draft]').click();
  await expect(page.locator('[data-review]')).toBeEnabled();
  await page.locator('[data-review]').click();
  await page.locator('[data-publish-reason]').fill('First synthetic approval');
  await page.locator('[data-confirm-publish]').click();
  await expect(page.locator('[data-draft-status]')).toContainText('Published revision 1');

  await page.locator('[data-style-field=radius]').fill('28');
  await page.locator('[data-style-field=radius]').press('Tab');
  await page.locator('[data-save-draft]').click();
  await expect(page.locator('[data-review]')).toBeEnabled();
  await page.locator('[data-review]').click();
  await page.locator('[data-publish-reason]').fill('Second synthetic approval');
  await page.locator('[data-confirm-publish]').click();
  await expect(page.locator('[data-draft-status]')).toContainText('Published revision 2');

  await page.locator('[data-history]').click();
  await expect(page.locator('[data-history-list]')).toContainText('Version 1');
  await page.locator('[data-restore="1"]').click();
  await expect(page.locator('[data-diff]')).toContainText('12');
  expect(await page.evaluate(()=>window.__designTest.published.config.all.radius)).toBe(28);
  await page.locator('[data-publish-reason]').fill('Restore synthetic approved state');
  await page.locator('[data-confirm-publish]').click();
  await expect(page.locator('[data-draft-status]')).toContainText('Published revision 3');
  expect(await page.evaluate(()=>({
    radius:window.__designTest.published.config.all.radius,
    versions:window.__designTest.history.map(h=>h.revision),
    restoreCount:window.__designTest.restoreCount
  }))).toEqual({radius:12,versions:[3,2,1],restoreCount:1});
});

test('server conflict preserves the unsaved editor value and disallows publication',async({page})=>{
  await page.evaluate(()=>{
    VACANCY_BACKEND.adminAppearanceSaveDraft=async()=>{
      throw new Error('Synthetic concurrent draft conflict');
    };
  });
  const radius=page.locator('[data-style-field=radius]');
  await radius.fill('19');await radius.press('Tab');
  await page.locator('[data-save-draft]').click();
  await expect(page.locator('[data-draft-status]')).toContainText('Synthetic concurrent draft conflict');
  await expect(radius).toHaveValue('19');
  await expect(page.locator('[data-review]')).toBeDisabled();
  expect(await page.evaluate(()=>window.__designTest.published.revision)).toBe(0);
});

test('invalid field on a saved draft blocks publishing until fixed',async({page})=>{
  const radius=page.locator('[data-style-field=radius]');
  await radius.fill('15');await radius.press('Tab');
  await page.locator('[data-save-draft]').click();
  await expect(page.locator('[data-review]')).toBeEnabled();
  await radius.fill('500');await radius.press('Tab');
  await expect(radius).toHaveAttribute('aria-invalid','true');
  await expect(page.locator('[data-review]')).toBeDisabled();
  await page.locator('.console-return').click();
  await expect(page.locator('.design-leave-dialog')).toBeVisible();
  await expect(page.locator('[data-leave-save]')).toBeDisabled();
  await page.locator('[data-leave-stay]').click();
  await radius.fill('15');await radius.press('Tab');
  await expect(page.locator('[data-review]')).toBeEnabled();
});


test('1536 desktop editor keeps reference hierarchy, truthful status and working header controls',async({page})=>{
  await page.setViewportSize({width:1536,height:1024});
  await expect(page.locator('.console-design-search')).toBeVisible();
  await expect(page.locator('.design-site-card')).toContainText('Unknown');
  await expect(page.locator('.console-design-identity')).toContainText('admin@example.invalid');
  await page.locator('.console-design-search').fill('Save listing');
  await expect(page.locator('[data-design-tree] [data-select-element]')).toBeVisible();
  await page.locator('.console-design-history').click();
  await expect(page.locator('[data-history-panel]')).toBeVisible();
  await page.locator('.console-design-search').fill('No such binding');
  await expect(page.locator('[data-design-tree]')).toContainText('No registered elements match');
  await page.locator('.console-design-search').fill('');
  const sizes=await page.evaluate(()=>{
    const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {width:r.width,left:r.left,right:r.right};};
    return {sidebar:rect('.console-sidebar'),browser:rect('.design-browser'),
      preview:rect('.design-preview'),inspector:rect('.design-inspector'),
      overflow:document.documentElement.scrollWidth>window.innerWidth+1};
  });
  expect(sizes.sidebar.width).toBeGreaterThan(205);
  expect(sizes.browser.width).toBeGreaterThan(230);
  expect(sizes.preview.width).toBeGreaterThan(450);
  expect(sizes.inspector.width).toBeGreaterThan(300);
  expect(sizes.overflow).toBe(false);
  await page.screenshot({path:'test-results/admin-design-reference-check-1536.png',
    animations:'disabled'});
});


test('published CSS propagates and compiled defaults require a new reviewed release',async({page})=>{
  const radius=page.locator('[data-style-field=radius]');
  await radius.fill('14');await radius.press('Tab');
  await page.locator('[data-save-draft]').click();
  await page.locator('[data-review]').click();
  await page.locator('[data-publish-reason]').fill('Synthetic radius styling');
  await page.locator('[data-confirm-publish]').click();
  await expect(page.locator('[data-draft-status]')).toContainText('Published revision 1');
  const sheet=page.locator('style[data-vacancy-published-appearance]');
  // Playwright's rendered-text matcher ignores CSS text inside <style>.
  // The public resolver writes to the real stylesheet textContent instead.
  await expect.poll(()=>sheet.textContent()).toContain(
    '.quiet-detail .quiet-save{border-radius:14px}');
  await page.locator('[data-inspect=advanced]').click();
  await page.locator('[data-code-defaults]').click();
  await expect(page.locator('[data-generated-css]')).toContainText('Inherited compiled appearance');
  expect(await page.evaluate(()=>window.__designTest.published.revision)).toBe(1);
  await page.locator('[data-save-draft]').click();
  await page.locator('[data-review]').click();
  await expect(page.locator('[data-diff]')).toContainText('Inherited');
  await page.locator('[data-publish-reason]').fill('Revert to compiled defaults');
  await page.locator('[data-confirm-publish]').click();
  await expect(page.locator('[data-draft-status]')).toContainText('Published revision 2');
  expect(await sheet.textContent()).toBe('');
  expect(await page.evaluate(()=>window.__designTest.published.config)).toEqual({});
});


test('desktop widths preserve panes, viewport selection and reachability',async({page})=>{
  for(const width of [1280,1440,1536,1920]){
    await page.setViewportSize({width,height:1024});
    await expect(page.locator('.design-board')).toBeVisible();
    await expect(page.locator('.design-browser')).toBeVisible();
    await expect(page.locator('.design-inspector')).toBeVisible();
    await page.locator('[data-mode=desktop]').click();
    await expect(page.locator('[data-logical-width]')).toHaveText('1280 px');
    await page.locator('[data-mode=mobile]').click();
    await expect(page.locator('[data-logical-width]')).toHaveText('390 px');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  }
});

test('compact effective desktop viewport keeps editor controls reachable',async({page})=>{
  // Width of 768 CSS pixels approximates the layout viewport a 1536px
  // window presents at 200% browser zoom; this is not genuine browser zoom.
  await page.setViewportSize({width:768,height:900});
  await expect(page.locator('.design-browser')).toBeVisible();
  await expect(page.locator('.design-inspector')).toBeVisible();
  await page.locator('[data-edit-scope]').selectOption('desktop');
  await page.locator('[data-style-field=radius]').fill('16');
  await page.locator('[data-style-field=radius]').press('Tab');
  await expect(page.locator('[data-save-draft]')).toBeEnabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))
    .toBeLessThanOrEqual(2);
});


test('unmount clears stale unsaved appearance navigation listeners',async({page})=>{
  const field=page.locator('[data-style-field=radius]');
  await field.fill('17');await field.press('Tab');
  await expect(page.locator('[data-save-draft]')).toBeEnabled();
  await page.evaluate(()=>document.querySelector('[data-admin-section=design]').remove());
  await expect(page.locator('.design-board')).toHaveCount(0);
  const staleWarning=await page.evaluate(()=>{
    const event=new Event('beforeunload',{cancelable:true});
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(staleWarning).toBe(false);
  await page.locator('.console-return').click();
  await expect(page.locator('.admin-console')).toHaveCount(0);
});

test('1280–1920 desktop layouts and narrowed zoom-equivalent remain usable',async({page})=>{
  for(const width of [1280,1440,1536,1920]){
    await page.setViewportSize({width,height:900});
    await expect(page.locator('[data-save-draft]')).toBeVisible();
    const result=await page.evaluate(()=>({
      overflow:document.documentElement.scrollWidth>innerWidth+1,
      preview:document.querySelector('.design-preview')?.getBoundingClientRect().width,
      inspector:document.querySelector('.design-inspector')?.getBoundingClientRect().width
    }));
    expect(result.overflow,String(width)+'px horizontal overflow').toBe(false);
    expect(result.preview,String(width)+'px preview not rendered').toBeGreaterThan(250);
    expect(result.inspector,String(width)+'px inspector not rendered').toBeGreaterThan(250);
  }
  // Approximate a 1536px physical display at 200% by halving CSS viewport width.
  await page.setViewportSize({width:768,height:560});
  await page.locator('[data-save-draft]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-save-draft]')).toBeVisible();
  const result=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth>innerWidth+1,
    preview:document.querySelector('.design-preview')?.getBoundingClientRect().width,
    inspector:document.querySelector('.design-inspector')?.getBoundingClientRect().width
  }));
  expect(result.overflow).toBe(false);
  expect(result.preview).toBeGreaterThan(200);
  expect(result.inspector).toBeGreaterThan(250);
});
