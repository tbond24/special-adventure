const {test,expect}=require('@playwright/test');
const {installPresentationBackend}=require('./presentation-backend-fixture.cjs');
const base='http://127.0.0.1:8776';
const target=mode=>'[data-design-target="'+mode+'-listing/language-selector"]';
test.beforeEach(async({page})=>{
 await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
 await page.goto(base+'/__admin-preview');await page.waitForFunction(()=>window.__visualReady===true);
 await installPresentationBackend(page,{preserve:true});
 const navigation=page.getByRole('button',{name:'Open admin navigation'});if(await navigation.isVisible())await navigation.click();
 await page.locator('#adminSectionMenu [data-section=design]').click();
 await expect(page.locator('.design-board')).toBeVisible();
});
async function select(page,mode){await page.locator(target(mode)).click();await expect(page.locator('.design-element-id code')).toHaveText(mode+'-listing/language-selector');await expect(page.locator('[data-frame-status]')).toContainText('Actual language selector component');await expect(page.frameLocator('[data-design-frame]').locator('#listingHost[data-language-page="'+mode+'"] .listing-language select')).toBeVisible();}
async function publish(page,reason){await page.locator('[data-save-draft]').click();await expect(page.locator('[data-draft-status]')).toContainText('Private draft saved');await page.locator('[data-review]').click();await page.locator('[data-publish-reason]').fill(reason);await page.locator('[data-confirm-publish]').click();await expect(page.locator('[data-draft-status]')).toContainText('verified by the public settings read');}
test('protected composed previews keep same-origin access and unlock review after a private save',async({page,context})=>{
 const requests=[];
 await context.addCookies([{name:'vacancy-fixture-preview-access',value:'synthetic-only',url:base,httpOnly:true,sameSite:'Lax'}]);
 await page.route('**/previews/listing-*.json',async route=>{
  const headers=await route.request().allHeaders();
  const allowed=(headers.cookie||'').split(';').some(value=>value.trim()==='vacancy-fixture-preview-access=synthetic-only');
  requests.push({path:new URL(route.request().url()).pathname,allowed});
  if(allowed)await route.continue();else await route.fulfill({status:403,body:'Synthetic protected preview'});
 });
 for(const mode of ['create','edit']){
  await select(page,mode);
  await page.locator('[data-edit-scope]').selectOption('desktop');
  await page.locator('[data-style-field=width]').selectOption('200px');
  await page.locator('[data-save-draft]').click();
  await expect(page.locator('[data-draft-status]')).toContainText('Private draft saved');
  await expect(page.locator('[data-review]')).toBeEnabled();
 }
 expect(requests).toEqual([{path:'/previews/listing-create.json',allowed:true},{path:'/previews/listing-edit.json',allowed:true}]);
 expect(await page.evaluate(()=>Object.keys(P.current))).toEqual([]);
 expect(await page.evaluate(()=>P.drafts['edit-listing/language-selector'].config)).toEqual({desktop:{width:'200px'}});
});
test('separate page bindings use the real inert selector and bounded widths',async({page},info)=>{
 for(const mode of ['create','edit']){
  await select(page,mode);
  await expect(page.locator('[data-style-field=width] option')).toHaveText(['Inherited','auto','120px','160px','200px','240px']);
  const source=await page.locator('[data-design-frame]').getAttribute('srcdoc');
  expect(source).toContain('data-language-page="'+mode+'"');expect(source).toContain('aria-label="Listing language"');expect(source).not.toContain('<script');expect(source).toContain('id="listingForm"');expect(source).toContain('<body inert>');expect(source).toContain('Map inactive in this example');await expect(page.locator('.design-context')).toContainText('synthetic values');
  await expect(page.locator('[data-design-frame]')).toHaveAttribute('sandbox','');
 }
 await expect(page.locator('[data-design-target][aria-selected=true]')).toHaveCount(1);
 expect(await page.frameLocator('[data-design-frame]').locator('.listing-language select').evaluate(n=>n.getBoundingClientRect().top)).toBeGreaterThanOrEqual(40);
 await page.screenshot({path:info.outputPath('language-selector-editor.png')});
 await page.locator('[data-design-target="listing-detail/save-button"]').click();
 await expect(page.locator('[data-style-field=width] option')).toHaveText(['Inherited','auto','44px','48px','52px']);
});
test('private drafts, publication and restore stay bound to their page and viewport',async({page})=>{
 await select(page,'create');await page.locator('[data-style-field=width]').selectOption('200px');
 await page.locator('[data-edit-scope]').selectOption('mobile');await page.locator('[data-style-field=radius]').fill('14');
 await publish(page,'Synthetic Create selector publication');
 await select(page,'edit');await expect(page.locator('[data-style-field=radius]')).toHaveValue('');
 await page.locator('[data-style-field=radius]').fill('7');await publish(page,'Synthetic Edit selector publication');
 const values=await page.evaluate(()=>P.current);expect(values['create-listing/language-selector'].config).toEqual({all:{width:'200px'},mobile:{radius:14}});expect(values['edit-listing/language-selector'].config).toEqual({mobile:{radius:7}});expect(values['listing-detail/save-button']).toBeUndefined();
 await select(page,'create');await page.locator('[data-style-field=radius]').fill('20');await publish(page,'Synthetic second Create publication');
 await page.locator('[data-history]').click();await page.locator('[data-restore="1"]').click();await expect(page.locator('[data-draft-status]')).toContainText('Earlier version copied');
 await expect(page.locator('[data-style-field=radius]')).toHaveValue('14');
 expect((await page.evaluate(()=>P.current['create-listing/language-selector'])).revision).toBe(2);
});
test('switching pages offers Stay, Discard and private Save without losing typing',async({page})=>{
 await select(page,'create');await page.locator('[data-style-field=radius]').fill('13');await page.locator(target('edit')).click();
 await expect(page.locator('.design-leave-dialog')).toBeVisible();await page.locator('[data-leave-stay]').click();await expect(page.locator('[data-style-field=radius]')).toHaveValue('13');
 await page.locator(target('edit')).click();await page.locator('[data-leave-save]').click();await expect(page.locator('.design-element-id code')).toHaveText('edit-listing/language-selector');
 await expect(page.locator('[data-frame-status]')).toContainText('Actual language');
 await page.locator('[data-style-field=radius]').fill('17');await page.locator(target('create')).click();await page.locator('[data-leave-discard]').click();
 await expect(page.locator('[data-style-field=radius]')).toHaveValue('13');expect(await page.evaluate(()=>P.drafts['edit-listing/language-selector'])).toBeUndefined();
});
test('failed save retains changes and failed anonymous confirmation never reports propagation',async({page})=>{
 await select(page,'create');await page.locator('[data-style-field=radius]').fill('12');await page.evaluate(()=>P.failSave=true);await page.locator('[data-save-draft]').click();await expect(page.locator('[data-draft-status]')).toContainText('Synthetic save failure');await expect(page.locator('[data-style-field=radius]')).toHaveValue('12');
 await page.evaluate(()=>{P.failSave=false;P.failPropagation=true});await page.locator('[data-save-draft]').click();await page.locator('[data-review]').click();await page.locator('[data-publish-reason]').fill('Synthetic propagation failure');await page.locator('[data-confirm-publish]').click();await expect(page.locator('[data-draft-status]')).toContainText('public propagation is unverified');
 expect(await page.evaluate(()=>P.reads.some(o=>o?.anonymous===true))).toBe(true);
});
test('a delayed state response cannot overwrite another selected page',async({page})=>{
 await page.evaluate(()=>{const previous=VACANCY_BACKEND.adminAppearanceState;VACANCY_BACKEND.adminAppearanceState=async key=>{if(key.startsWith('create-')){await new Promise(r=>window.releaseLanguageRead=r);return {published:{revision:9,config:{all:{radius:31}}},draft:null,canPublish:true};}return previous(key)}});
 await page.locator(target('create')).click();await expect(page.locator('.design-element-id code')).toHaveText('create-listing/language-selector');await select(page,'edit');await page.evaluate(()=>releaseLanguageRead());await expect(page.locator('[data-style-field=radius]')).toHaveValue('');
});
test('public CSS resolves only exact page instances with independent viewport overrides',async({page})=>{
 await page.evaluate(async()=>{P.current={'create-listing/language-selector':{revision:1,config:{all:{width:'200px',radius:11},mobile:{radius:16}}},'edit-listing/language-selector':{revision:1,config:{all:{radius:5}}}};await VACANCY_SITE_APPEARANCE.refresh();const host=document.createElement('div');host.id='listingHost';host.dataset.languagePage='create';host.append(VACANCY_LISTING_LANGUAGES.createPicker('create'));document.body.append(host);});
 for(const [width,radius]of [[1536,'11px'],[390,'16px']]){await page.setViewportSize({width,height:900});await expect(page.locator('#listingHost select')).toHaveCSS('border-radius',radius);await expect(page.locator('#listingHost select')).toHaveCSS('width','200px');}
 await page.evaluate(()=>document.querySelector('#listingHost').dataset.languagePage='edit');await expect(page.locator('#listingHost select')).toHaveCSS('border-radius','5px');
});
test('reconciled language padding is bounded, scoped and preserved as an invalid private edit',async({page})=>{
 await select(page,'create');
 const left=page.locator('[data-style-field=padding_left]');await expect(left).toHaveAttribute('max','24');
 await left.fill('14');await page.locator('[data-style-field=padding_top]').fill('11');
 await page.locator('[data-edit-scope]').selectOption('mobile');await left.fill('22');
 await page.locator('[data-edit-scope]').selectOption('desktop');await left.fill('25');
 await expect(page.locator('[data-save-draft]')).toBeDisabled();
 await page.locator('[data-inspect=advanced]').click();await page.locator('[data-inspect=style]').click();await expect(left).toHaveValue('25');
 await left.fill('10');await publish(page,'Synthetic reconciled language spacing');
 const config=await page.evaluate(()=>P.current['create-listing/language-selector'].config);
 expect(config.all.padding_left).toBe(14);expect(config.mobile.padding_left).toBe(22);expect(config.desktop.padding_left).toBe(10);
 expect(await page.evaluate(()=>P.current['edit-listing/language-selector'])).toBeUndefined();
});
