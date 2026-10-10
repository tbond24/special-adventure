// Exercise the real renderer, DOM controls, draft storage and submit handlers.
// Only backend boundaries use synthetic data. Never allow hosted traffic.
require('../qa/repair-oct08/safe-fixtures.cjs');
const {test, expect} = require('@playwright/test');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==', 'base64');
const photos = (prefix = 'unit', count = 3) => Array.from({length:count}, (_, index) => ({name:`${prefix}-${index + 1}.png`, mimeType:'image/png', buffer:png}));
const part = (unit, name) => unit.locator(`:scope > details[data-part="${name}"]`);
async function openPart(unit, name) {
  const section = part(unit, name);
  if (!(await section.evaluate(node => node.open))) await section.locator(':scope > summary').click();
  await expect(section).toHaveAttribute('open', '');
  return section;
}
async function boot(page, {existing = false, edit = false} = {}) {
  await page.route('**/auth/v1/**', route => route.fulfill({status:401, contentType:'application/json', body:'{}'}));
  await page.route('**/rest/v1/**', route => route.fulfill({status:200, contentType:'application/json', body:'[]'}));
  await page.route('**/api/**', route => route.fulfill({status:200, contentType:'application/json', body:JSON.stringify({country:'Kenya',region:'Nairobi',city:'Nairobi',locality:'Westlands',address:'Synthetic Road',lat:-1.26,lon:36.8})}));
  await page.goto('/#home');
  await page.waitForFunction(() => booting === false);
  await page.evaluate(async ({existing, edit}) => {
    currentUser = {id:'synthetic-accordion-owner'};
    marketCode = 'KE';
    window.__toasts = [];
    toast = message => window.__toasts.push(message);
    window.__calls = [];
    window.__property = {id:'p1', title:'Synthetic Westlands House', locality:'Westlands', city:'Nairobi', country:'Kenya', marketCode:'KE', publicLatitude:-1.26, publicLongitude:36.8, waterAvailable:true, electricityAvailable:true, securityAvailable:true, parkingSpaces:0};
    window.__listing = {id:'v1', roomId:'r1', propertyId:'p1', privateName:'Private A1', region:'Nairobi', city:'Nairobi', locality:'Westlands', marketCode:'KE', country:'Kenya', address:'Synthetic Road', publicLatitude:-1.26, publicLongitude:36.8, propertyType:'Apartment', parkingSpaces:0, waterAvailable:true, electricityAvailable:true, securityAvailable:true, internetAvailable:false, smokingAllowed:false, petsConsidered:false, household:'Quiet', unitType:'Studio', roomName:'Public studio title', rentAmount:10000, rentCurrency:'KES', rentPeriod:'month', deposit:10000, availableFrom:null, minimumStayWeeks:4, maxOccupants:1, furnished:false, ensuite:false, billsIncluded:false, smokingAllowedOverride:null, petsConsideredOverride:null, description:'A bright studio', unitDetails:{parkingSpaces:2, amenities:[{label:'Balcony',icon:'balcony'}], utilities:[{label:'Solar power',icon:'bolt'}], rules:[{label:'Smoking',allowed:false}]}, media:[1,2,3].map(n => ({id:'m'+n, url:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==', storage_path:'synthetic-'+n+'.png'}))};
    VACANCY_BACKEND.myProperties = async () => existing || edit ? [window.__property] : [];
    VACANCY_BACKEND.myVacancies = async () => existing || edit ? [{id:'v1', status:'active', rent_amount:10000, rent_currency:'KES', rent_period:'month', rooms:{name:'Existing studio',properties:window.__property}}] : [];
    VACANCY_BACKEND.activeVacancies = async () => [];
    VACANCY_BACKEND.ownerDashboardMetrics = async () => ({impressions:0, clicks:0, messages:0});
    VACANCY_BACKEND.listingForEdit = async () => structuredClone(window.__listing);
    VACANCY_BACKEND.trackEvent = () => {};
    refreshVacancies = async () => {};
    // Unexpected calls fail loudly while the network guard remains a backstop.
    for (const method of ['createListing','createRoomVacancyForProperty','saveUnitListingDetails','setPropertyFeatures','setPrivatePropertyNickname','uploadListingImages','reconfirmVacancy','updateListingAtomic','deleteMedia']) {
      VACANCY_BACKEND[method] = async (...args) => { window.__calls.push({method,args}); throw new Error('Unexpected synthetic write boundary: '+method); };
    }
    history.replaceState(null, '', edit ? '#edit/v1' : '#list/new');
    if (edit) await renderEdit('v1'); else await renderList();
  }, {existing, edit});
  if (!edit) {
    await page.locator('[data-listing-type=Residential]').click();
    await page.locator('[data-preset=Studio]').click();
    await page.getByRole('button', {name:existing ? 'Existing property' : 'New property', exact:true}).click();
  }
  const form = page.locator(existing ? '#existingListingForm' : '#listingForm');
  await expect(form).toHaveClass(/listing-accordion/);
  return form;
}
async function setLocation(form) {
  const unit = form.locator('.unit-editor').first();
  await openPart(unit, 'location');
  await form.evaluate(node => {
    for (const [name, value] of Object.entries({region:'Nairobi', city:'Nairobi', locality:'Westlands', address:'Synthetic Road'})) node.elements[name].value = value;
    node.querySelector('#newPropertyMap')._vacancySetLocation(-1.26,36.8,false);
  });
  await expect(part(unit, 'location')).toHaveAttribute('data-complete', 'true');
}
async function fillMoney(control, value) {
  // Existing focus handler strips commas and resets selection; focus first.
  await control.focus();
  await control.fill(value);
}
async function setRent(unit, amount = '25000') {
  await openPart(unit, 'rent');
  await fillMoney(unit.locator('[data-base-name=rentAmount]'), amount);
  await fillMoney(unit.locator('[data-base-name=deposit]'), amount);
}
async function setPhotos(unit, prefix = 'unit', count = 3) {
  await openPart(unit, 'photos');
  await unit.locator('input[type=file]').setInputFiles(photos(prefix, count));
  await expect(part(unit, 'photos').locator('.listing-section-summary')).toHaveText(`${count} photos added`);
}
async function fillReady(form, {existing = false} = {}) {
  if (!existing) await setLocation(form);
  const unit = form.locator('.unit-editor').first();
  await setRent(unit);
  await setPhotos(unit);
  await expect(form.locator('.journey-next')).toBeEnabled();
}
async function installCreateBoundary(page) {
  await page.evaluate(() => {
    let nextId = 0;
    for (const method of ['createListing','createRoomVacancyForProperty','saveUnitListingDetails','setPropertyFeatures','setPrivatePropertyNickname','uploadListingImages','reconfirmVacancy']) {
      VACANCY_BACKEND[method] = async (...args) => {
        window.__calls.push({method, args:method === 'uploadListingImages' ? [args[0], args[1].map(file => ({name:file.name,type:file.type,size:file.size})), args[2]] : args});
        if (method === 'createListing' || method === 'createRoomVacancyForProperty') return 'synthetic-created-'+(++nextId);
        return [];
      };
    }
  });
}

test('all five native sections start closed and keyboard toggles only one section', async ({page}) => {
  const form = await boot(page);
  const unit = form.locator('.unit-editor');
  await expect(unit.locator(':scope > details.listing-accordion-section')).toHaveCount(5);
  await expect(unit.locator(':scope > details[open]')).toHaveCount(0);
  await expect(form.locator('.journey-current-title')).toHaveText('Unit details');
  await expect(form.locator('.journey-next')).toBeDisabled();
  const location = part(unit, 'location').locator(':scope > summary');
  await location.focus(); await page.keyboard.press('Enter');
  await expect(part(unit, 'location')).toHaveAttribute('open', '');
  const photosSummary = part(unit, 'photos').locator(':scope > summary');
  await photosSummary.focus(); await page.keyboard.press('Space');
  await expect(part(unit, 'photos')).toHaveAttribute('open', '');
  await expect(part(unit, 'location')).not.toHaveAttribute('open', '');
  await expect(photosSummary).toBeFocused();
  await page.keyboard.press('Space');
  await expect(unit.locator(':scope > details[open]')).toHaveCount(0);
});

test('location, three photos and valid rent gate review; repeated review/back preserves real controls', async ({page}) => {
  const form = await boot(page); const unit = form.locator('.unit-editor');
  await setLocation(form);
  await setRent(unit);
  await setPhotos(unit, 'threshold', 2);
  await expect(form.locator('.journey-next')).toBeDisabled();
  await expect(form.locator('.listing-review-hint')).toContainText('at least 3');
  await unit.locator('input[type=file]').setInputFiles(photos('third',1));
  await expect(form.locator('.journey-next')).toBeEnabled();
  await openPart(unit, 'rent');
  await fillMoney(unit.locator('[data-base-name=rentAmount]'), '0');
  await expect(form.locator('.journey-next')).toBeDisabled();
  await fillMoney(unit.locator('[data-base-name=rentAmount]'), '25000');
  await fillMoney(unit.locator('[data-base-name=deposit]'), '-1');
  await expect(form.locator('.journey-next')).toBeDisabled();
  await fillMoney(unit.locator('[data-base-name=deposit]'), '25000');
  await expect(part(unit, 'rent').locator('.listing-section-summary')).toContainText('same deposit');
  await form.evaluate(node => { window.__sameRentControl = node.querySelector('[data-base-name=rentAmount]'); });
  for (let attempt = 0; attempt < 3; attempt++) {
    await form.locator('.journey-next').evaluate(button => { button.click(); button.click(); button.click(); });
    await expect(form).toHaveAttribute('data-journey-step','2');
    await expect(form.locator('.unit-draft-preview')).toHaveCount(1);
    await expect(form.locator('.unit-draft-preview img')).toHaveCount(3);
    await expect(form.locator('.unit-draft-preview')).toContainText('25,000');
    await form.locator('.journey-back').click();
    await expect(form).toHaveAttribute('data-journey-step','1');
    await expect(form.locator('.journey-current-title')).toHaveText('Unit details');
    expect(await form.evaluate(node => node.querySelector('[data-base-name=rentAmount]') === window.__sameRentControl)).toBe(true);
  }
});

test('description, structured amenities, utilities, rules and optional availability remain editable', async ({page}) => {
  const form = await boot(page); await fillReady(form); const unit = form.locator('.unit-editor');
  await openPart(unit, 'description');
  await unit.locator('[data-base-name=description]').fill('Quiet studio with a sunny balcony.');
  await unit.locator('.unit-features > summary').click();
  await unit.locator('[data-unit-amenity=Furnished]').click();
  await unit.locator('[data-add-unit-option=amenity]').click();
  await unit.locator('.unit-custom-amenities input').fill('Rooftop terrace');
  await unit.locator('.unit-utilities > summary').click();
  await unit.locator('[data-add-unit-option=utility]').click();
  await unit.locator('.unit-custom-utilities input').fill('Solar power');
  await unit.locator('.unit-rules > summary').click();
  await unit.locator('[data-add-unit-option=rule]').click();
  await unit.locator('.unit-rule-row input').fill('Smoking');
  await unit.locator('.unit-rule-row [data-allowed=false]').click();
  await openPart(unit, 'availability');
  await unit.locator('[data-base-name=availableFrom]').fill('2026-11-15');
  await form.locator('.journey-next').click();
  await expect(form.locator('.unit-draft-preview')).toContainText('Quiet studio with a sunny balcony.');
  await expect(form.locator('.unit-draft-preview')).toContainText('Rooftop terrace');
  await expect(form.locator('.unit-draft-preview')).toContainText('Solar power');
  await expect(form.locator('.unit-draft-preview')).toContainText('No smoking');
  await expect(form.locator('.unit-draft-preview')).toContainText('2026-11-15');
  const details = JSON.parse(await unit.locator('[data-base-name=unitDetails]').inputValue());
  expect(details).toMatchObject({amenities:[{label:'Furnished'},{label:'Rooftop terrace'}],utilities:[{label:'Solar power'}],rules:[{label:'Smoking',allowed:false}]});
});

for (const existing of [false,true]) test(`${existing?'existing':'new'} property submits the original synthetic create/upload/activate pipeline`, async ({page}) => {
  const form = await boot(page, {existing}); await fillReady(form, {existing});
  await installCreateBoundary(page);
  if (existing) {
    await expect(form.locator('#propertyChoice')).toHaveValue('p1');
    await expect(form.locator('#newPropertyMap')).toHaveCount(0);
    await expect(part(form.locator('.unit-editor'), 'location')).toContainText('Westlands');
  }
  await form.locator('.journey-next').click();
  await expect(form).toHaveAttribute('data-journey-step','2');
  await form.locator('.listing-submit-actions .primary').click();
  await expect.poll(() => page.evaluate(() => window.__calls.filter(call => call.method === 'reconfirmVacancy').length)).toBe(1);
  const calls = await page.evaluate(() => window.__calls);
  const create = calls.find(call => call.method === (existing?'createRoomVacancyForProperty':'createListing'));
  if (existing) expect(create.args[0]).toBe('p1');
  expect(create.args[existing?1:0]).toMatchObject({unitType:'Studio', rentAmount:'25000', rentCurrency:'KES', rentPeriod:'month', deposit:'25000'});
  expect(calls.map(call => call.method).filter(method => method !== 'setPropertyFeatures')).toEqual([existing?'createRoomVacancyForProperty':'createListing','saveUnitListingDetails','uploadListingImages','reconfirmVacancy']);
  expect(calls.find(call => call.method === 'uploadListingImages').args[1]).toHaveLength(3);
  await expect(page.getByRole('heading',{name:'Dashboard',exact:true})).toBeVisible();
  expect(await page.evaluate(() => window.__toasts.at(-1))).toBe('1 vacancy published.');
});

test('edit keeps all existing photos and sends one complete updateListingAtomic call', async ({page}) => {
  const form = await boot(page, {edit:true}); const unit = form.locator('.unit-editor');
  await expect(form).toHaveAttribute('data-edit-vacancy','v1');
  await expect(unit.locator(':scope > details[open]')).toHaveCount(0);
  await expect(form.locator('.journey-next')).toBeEnabled();
  await expect(unit.locator('.edit-existing-photo')).toHaveCount(3);
  await expect(form.locator('.unit-add-choices')).toBeHidden();
  await openPart(unit,'location'); await unit.locator('.unit-name-input').fill('Edited A1');
  await openPart(unit,'description'); await unit.locator('[data-base-name=description]').fill('Updated description');
  await setRent(unit,'27000');
  await page.evaluate(() => { VACANCY_BACKEND.updateListingAtomic = async (...args) => { window.__calls.push({method:'updateListingAtomic',args}); }; });
  await form.locator('.journey-next').click();
  const submit = form.locator('.listing-submit-actions .primary');
  await expect(submit).toHaveText('Save changes');
  await submit.evaluate(button => {button.click(); button.click();});
  await expect.poll(() => page.evaluate(() => window.__calls.length)).toBe(1);
  const [{args}] = await page.evaluate(() => window.__calls);
  expect(args[0]).toBe('v1');
  expect(args[1]).toMatchObject({propertyId:'p1',roomId:'r1',roomName:'Public studio title',description:'Updated description',rentAmount:'27,000',deposit:'27,000',publicLatitude:'-1.260',publicLongitude:'36.800'});
  expect(args[2]).toMatchObject({parkingSpaces:2,amenities:[{label:'Balcony'}],utilities:[{label:'Solar power'}],rules:[{label:'Smoking',allowed:false}]});
  expect(args[3]).toBe('Edited A1');
  await expect(page.getByRole('heading',{name:'Dashboard',exact:true})).toBeVisible();
});

test('new and duplicate units keep distinct photos; deleting the first retains shared location and publish data', async ({page}) => {
  const form = await boot(page); await fillReady(form); const first = form.locator('.unit-editor').first();
  await openPart(first,'location'); await first.locator('.unit-name-input').fill('Garden A1');
  await form.locator('.unit-add-choices > summary').click(); await form.locator('[data-copy-unit="0"]').click();
  await expect(form.locator('.unit-editor')).toHaveCount(2);
  const duplicate = form.locator('.unit-editor').nth(1);
  await expect(duplicate.locator('.unit-name-input')).toHaveValue('Garden A1 (copy)');
  await expect(duplicate.locator('[data-base-name=rentAmount]')).toHaveValue(/25,?000/);
  await expect(duplicate.locator('.photo-selection-item')).toHaveCount(0);
  await expect(form.locator('.journey-next')).toBeDisabled();
  await setPhotos(duplicate,'duplicate');
  await form.locator('.unit-add-choices > summary').click(); await form.locator('[data-new-unit]').click();
  await expect(form.locator('.unit-editor')).toHaveCount(3);
  const fresh = form.locator('.unit-editor').nth(2);
  await expect(fresh.locator('.unit-name-input')).toHaveValue('Unit 3');
  await expect(fresh.locator('[data-base-name=rentAmount]')).toHaveValue('');
  await openPart(fresh,'location'); await fresh.locator('.unit-name-input').fill('Courtyard B');
  await setRent(fresh,'30000'); await setPhotos(fresh,'fresh');
  page.once('dialog', dialog => dialog.accept()); await first.locator('.unit-delete').click();
  await expect(form.locator('.unit-editor')).toHaveCount(2);
  await expect(form.locator('.accordion-shared-fields')).toHaveCount(1);
  await expect(form.locator('[name=publicLatitude]')).toHaveValue('-1.260');
  await expect(form.locator('[name=locality]')).toHaveValue('Westlands');
  expect(await form.locator('.unit-editor').evaluateAll(nodes => nodes.map(node => node.dataset.unitIndex))).toEqual(['0','1']);
  await installCreateBoundary(page);
  await expect(form.locator('.journey-next')).toBeEnabled(); await form.locator('.journey-next').click();
  await expect(form.locator('.unit-draft-preview')).toHaveCount(2);
  await form.locator('.listing-submit-actions .primary').click();
  await expect.poll(() => page.evaluate(() => window.__calls.filter(call => call.method === 'reconfirmVacancy').length)).toBe(2);
  const calls = await page.evaluate(() => window.__calls);
  expect(calls.filter(call => call.method === 'saveUnitListingDetails').map(call => call.args[2])).toEqual(['Garden A1 (copy)','Courtyard B']);
  expect(calls.find(call => call.method === 'createListing').args[0]).toMatchObject({locality:'Westlands',publicLatitude:'-1.260',rentAmount:'25000'});
  expect(calls.find(call => call.method === 'createRoomVacancyForProperty').args[0]).toBe('p1');
});

test('Save and exit restores names, fields, options and image bytes from a device-local draft', async ({page}) => {
  const form = await boot(page); await fillReady(form); const unit = form.locator('.unit-editor');
  await openPart(unit,'location'); await unit.locator('.unit-name-input').fill('Draft Garden A1');
  await openPart(unit,'description'); await unit.locator('[data-base-name=description]').fill('Draft description stays editable');
  await unit.locator('.unit-features > summary').click(); await unit.locator('[data-unit-amenity=Balcony]').click();
  await form.locator('.journey-save-exit').click();
  await expect(page.locator('#mine .local-draft-row')).toHaveCount(1);
  await page.locator('[data-resume-draft]').click();
  const restored = page.locator('#listingForm');
  await expect(restored).toHaveClass(/listing-accordion/);
  await expect(restored.locator('.photo-selection-item')).toHaveCount(3);
  await expect(restored.locator('.unit-name-input')).toHaveValue('Draft Garden A1');
  await expect(restored.locator('[data-base-name=description]')).toHaveValue('Draft description stays editable');
  await expect(restored.locator('[name=locality]')).toHaveValue('Westlands');
  await expect(restored.locator('[name=publicLatitude]')).toHaveValue('-1.260');
  await expect(restored.locator('[data-unit-amenity=Balcony]')).toHaveAttribute('aria-pressed','true');
  await expect(restored.locator('.journey-next')).toBeEnabled();
  const savedPhotos = await restored.evaluate(async node => Promise.all(selectedPhotoFiles(node.querySelector('.unit-editor input[type=file]')).map(async file => ({name:file.name,type:file.type,bytes:[...new Uint8Array(await file.arrayBuffer())]}))));
  expect(savedPhotos).toEqual(photos().map(file => ({name:file.name,type:file.mimeType,bytes:[...file.buffer]})));
  expect(await page.evaluate(() => window.__calls)).toEqual([]);
});

for (const width of [320,390,1440]) test(`accordion controls fit ${width}px without overflow and maintain readable font sizes`, async ({page}) => {
  await page.setViewportSize({width,height:900}); const form = await boot(page); const unit = form.locator('.unit-editor');
  for (const name of ['location','photos','description','rent','availability']) {
    await openPart(unit,name);
    const metrics = await form.evaluate(node => ({overflow:document.documentElement.scrollWidth-innerWidth, controls:[...node.querySelectorAll('input:not([type=hidden]):not([type=file]),select,textarea')].filter(element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden').map(element => ({name:element.name||element.className, font:parseFloat(getComputedStyle(element).fontSize), left:element.getBoundingClientRect().left,right:element.getBoundingClientRect().right,width:element.getBoundingClientRect().width})),titles:[...node.querySelectorAll('.listing-section-title')].map(element => parseFloat(getComputedStyle(element).fontSize))}));
    expect(metrics.overflow, name+' document overflow').toBeLessThanOrEqual(1);
    for (const control of metrics.controls) {
      expect(control.font, `${name}: ${control.name} font size`).toBeGreaterThanOrEqual(16);
      expect(control.left, `${name}: ${control.name} left edge`).toBeGreaterThanOrEqual(0);
      expect(control.right, `${name}: ${control.name} right edge`).toBeLessThanOrEqual(width+1);
    }
    expect(metrics.titles.every(size => size >= 16)).toBe(true);
  }
  await expect(form.locator('.journey-next')).toHaveCSS('min-height','48px');
});

test('partial multi-unit publish preserves shared location and retries only the remaining unit', async ({page}) => {
  const form = await boot(page); await fillReady(form);
  await form.locator('.unit-add-choices > summary').click();
  await form.locator('[data-copy-unit="0"]').click();
  await expect(form.locator('.unit-editor')).toHaveCount(2);
  const second = form.locator('.unit-editor').nth(1);
  await setPhotos(second,'retry-second');
  await installCreateBoundary(page);
  await page.evaluate(() => {
    window.__allowSecondUpload = false;
    VACANCY_BACKEND.createRoomVacancyForProperty = async (...args) => {window.__calls.push({method:'createRoomVacancyForProperty',args});return 'synthetic-second';};
    VACANCY_BACKEND.uploadListingImages = async (id,files,key) => {
      window.__calls.push({method:'uploadListingImages',args:[id,files.map(file=>file.name),key]});
      if (id === 'synthetic-second' && !window.__allowSecondUpload) throw new Error('Synthetic second-unit upload failure');
      return [];
    };
  });
  await form.locator('.journey-next').click();
  await form.locator('.listing-submit-actions .primary').click();
  await expect(form.locator('.unit-editor')).toHaveCount(1);
  await expect(form).toHaveAttribute('data-draft-scope','property-p1');
  await expect(form.locator('.accordion-shared-fields')).toHaveCount(1);
  await expect(form.locator('[name=locality]')).toHaveValue('Westlands');
  await expect(form.locator('[name=publicLatitude]')).toHaveValue('-1.260');
  expect(await page.evaluate(() => window.__calls.filter(call => call.method === 'reconfirmVacancy').map(call=>call.args[0]))).toEqual(['synthetic-created-1']);
  expect(await page.evaluate(() => window.__toasts.at(-1))).toContain('Unfinished units remain here to retry');
  await form.locator('.journey-back').click();
  await expect(form.locator('.journey-next')).toBeEnabled();
  await form.locator('.journey-next').click();
  await expect(form.locator('.unit-draft-preview')).toHaveCount(1);
  await page.evaluate(() => {window.__allowSecondUpload = true;});
  await form.locator('.listing-submit-actions .primary').click();
  await expect(page.getByRole('heading',{name:'Dashboard',exact:true})).toBeVisible();
  const calls = await page.evaluate(() => window.__calls);
  expect(calls.filter(call => call.method === 'createListing')).toHaveLength(1);
  expect(calls.filter(call => call.method === 'reconfirmVacancy').map(call => call.args[0])).toEqual(['synthetic-created-1','synthetic-second']);
  const secondAttempts = calls.filter(call => call.method === 'createRoomVacancyForProperty');
  expect(secondAttempts).toHaveLength(2);
  expect(secondAttempts[0].args[1].requestId).toBe(secondAttempts[1].args[1].requestId);
  expect(secondAttempts[1].args[1]).toMatchObject({locality:'Westlands',publicLatitude:'-1.260'});
});

test('native availability validity disables review without reentrant invalid events', async ({page}) => {
  const errors=[]; page.on('pageerror', error=>errors.push(error.message));
  const form = await boot(page); await fillReady(form); const unit=form.locator('.unit-editor');
  await openPart(unit,'availability');
  const date=unit.locator('[data-base-name=availableFrom]');
  await expect(date).toBeVisible();
  await date.fill('2026-11-15');
  // Inject the browser validation state, not a replacement app validator.
  await date.evaluate(input=>{input.setCustomValidity('Synthetic invalid date');input.dispatchEvent(new Event('input',{bubbles:true}));});
  await expect(form.locator('.journey-next')).toBeDisabled();
  await expect(form.locator('.listing-review-hint')).toHaveText('Check the availability date.');
  expect(errors).toEqual([]);
  await date.evaluate(input=>{input.setCustomValidity('');input.dispatchEvent(new Event('input',{bubbles:true}));});
  await expect(form.locator('.journey-next')).toBeEnabled();
});

test('native invalid advanced minimum stay reveals the field and prevents publishing', async ({page}) => {
  const form = await boot(page); await fillReady(form); const unit=form.locator('.unit-editor');
  await openPart(unit,'availability');
  const advanced=part(unit,'availability').locator('.advanced-unit-settings:not(.shared-property-control)').first();
  await advanced.locator(':scope > summary').click();
  const minimum=unit.locator('[data-base-name=minimumStayWeeks]');
  const row=minimum.locator('xpath=ancestor::*[contains(concat(" ",normalize-space(@class)," ")," optional-listing-field ")][1]');
  if (!(await minimum.isVisible())) await row.locator(':scope > button').click();
  await minimum.fill('0');
  await advanced.locator(':scope > summary').click();
  await form.locator('.journey-next').click();
  await expect(form).toHaveAttribute('data-journey-step','2');
  await form.locator('.listing-submit-actions .primary').click();
  await expect(form).toHaveAttribute('data-journey-step','1');
  await expect(form.locator('.journey-current-title')).toHaveText('Unit details');
  await expect(part(unit,'availability')).toHaveAttribute('open','');
  await expect(minimum).toBeVisible();
  expect(await minimum.evaluate(input=>input.validity.rangeUnderflow)).toBe(true);
  expect(await page.evaluate(()=>window.__calls)).toEqual([]);
});

test('language switching keeps accordion interactions and review responsive', async ({page}) => {
  const form = await boot(page); await fillReady(form); const unit=form.locator('.unit-editor');
  const language=page.locator('.listing-language select');
  for (const value of ['fr','sw','zh','en']) {
    await language.selectOption(value);
    await expect(page.locator('#listingHost')).toHaveAttribute('lang',value);
    await openPart(unit,'rent');
    await fillMoney(unit.locator('[data-base-name=rentAmount]'),'26000');
    await expect(form.locator('.journey-next')).toBeEnabled();
    await openPart(unit,'photos');
    await expect(part(unit,'rent')).not.toHaveAttribute('open','');
  }
  await form.locator('.journey-next').click();
  await expect(form).toHaveAttribute('data-journey-step','2');
  await expect(form.locator('.unit-draft-preview')).toContainText('26,000');
});

test('edit Back saves its draft and photos to dashboard without entering create under an edit URL', async ({page}) => {
  const form=await boot(page,{edit:true}); const unit=form.locator('.unit-editor');
  await openPart(unit,'location'); await unit.locator('.unit-name-input').fill('Edited draft A1');
  await openPart(unit,'description'); await unit.locator('[data-base-name=description]').fill('Edit draft saved through Back');
  await openPart(unit,'photos');
  await unit.locator('input[type=file]').setInputFiles(photos('edit-back',2));
  await expect(form.locator('.photo-selection-item')).toHaveCount(2);
  await expect(form.locator('.journey-back')).toHaveAttribute('aria-label','Back to listings');
  await form.locator('.journey-back').click();
  await expect(page).toHaveURL(/\/#list$/);
  await expect(page.getByRole('heading',{name:'Dashboard',exact:true})).toBeVisible();
  await expect(page.locator('.listing-start')).toHaveCount(0);
  await expect(page.locator('#listingForm')).toHaveCount(0);
  const draft=page.locator('.local-draft-row').filter({hasText:'Public studio title'});
  await expect(draft).toHaveCount(1);
  await draft.locator('[data-resume-draft]').click();
  const restored=page.locator('#listingForm');
  await expect(page).toHaveURL(/\/#edit\/v1$/);
  await expect(restored).toHaveAttribute('data-edit-vacancy','v1');
  await expect(restored.locator('.unit-name-input')).toHaveValue('Edited draft A1');
  await expect(restored.locator('[data-base-name=description]')).toHaveValue('Edit draft saved through Back');
  await expect(restored.locator('.edit-existing-photo')).toHaveCount(3);
  await expect(restored.locator('.photo-selection-item')).toHaveCount(2);
  const restoredPhotos=await restored.evaluate(async node=>Promise.all(selectedPhotoFiles(node.querySelector('.unit-editor input[type=file]')).map(async file=>({name:file.name,bytes:[...new Uint8Array(await file.arrayBuffer())]}))));
  expect(restoredPhotos).toEqual(photos('edit-back',2).map(file=>({name:file.name,bytes:[...file.buffer]})));
  expect(await page.evaluate(()=>window.__calls)).toEqual([]);
});

test('create Back returns to listing choices and restores photo bytes when reentering the draft', async ({page}) => {
  const form=await boot(page); await fillReady(form); const unit=form.locator('.unit-editor');
  await openPart(unit,'location'); await unit.locator('.unit-name-input').fill('Back draft Garden A1');
  await expect(form.locator('.journey-back')).toHaveAttribute('aria-label','Back to listing choices');
  await form.locator('.journey-back').click();
  await expect(page).toHaveURL(/\/#list\/new$/);
  await expect(page.locator('[data-listing-type=Residential]')).toBeVisible();
  await page.locator('[data-listing-type=Residential]').click();
  await page.locator('[data-preset=Studio]').click();
  await page.getByRole('button',{name:'New property',exact:true}).click();
  const restored=page.locator('#listingForm');
  await expect(restored).toHaveClass(/listing-accordion/);
  await expect(restored.locator('.unit-name-input')).toHaveValue('Back draft Garden A1');
  await expect(restored.locator('[data-base-name=rentAmount]')).toHaveValue(/25,?000/);
  await expect(restored.locator('[name=publicLatitude]')).toHaveValue('-1.260');
  await expect(restored.locator('.photo-selection-item')).toHaveCount(3);
  const restoredPhotos=await restored.evaluate(async node=>Promise.all(selectedPhotoFiles(node.querySelector('.unit-editor input[type=file]')).map(async file=>({name:file.name,bytes:[...new Uint8Array(await file.arrayBuffer())]}))));
  expect(restoredPhotos).toEqual(photos().map(file=>({name:file.name,bytes:[...file.buffer]})));
  await expect(restored.locator('.journey-next')).toBeEnabled();
  expect(await page.evaluate(()=>window.__calls)).toEqual([]);
});
