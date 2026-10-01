const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

async function openCreate(page){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(APP+'/#home');
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(()=>{currentUser={id:'owner'};VACANCY_BACKEND.myProperties=async()=>[];VACANCY_BACKEND.myVacancies=async()=>[];VACANCY_BACKEND.ownerDashboardMetrics=async()=>({impressions:0,clicks:0,messages:0});nav('list')});
  await page.getByRole('button',{name:'Create new listing'}).click();
  await page.locator('[data-listing-type=Residential]').click();
  await page.locator('[data-preset=Room]').click();
  await page.getByRole('button',{name:'New property'}).click();
  await expect(page.locator('#listingForm[data-journey101]')).toBeVisible();
}
async function advanceToDetails(page){
  const form=page.locator('#listingForm');
  await form.locator('[name=region]').fill('Nairobi');
  await form.locator('[name=city]').fill('Nairobi');
  await form.locator('[name=locality]').fill('Kilimani');
  await form.locator('[name=address]').fill('Main Road');
  await form.locator('[name=publicLatitude]').evaluate(input=>input.value='-1.2');
  await form.locator('[name=publicLongitude]').evaluate(input=>input.value='36.8');
  await form.locator('.journey-next').click();
  await expect(form).toHaveAttribute('data-journey-step','1');
}

test('create listing keeps date optional, decimals editable, and media choices together',async({page})=>{
  await openCreate(page);
  const form=page.locator('#listingForm');
  await expect(form.locator('[data-base-name=availableFrom]')).toHaveValue('');
  await expect(form.locator('[data-base-name=availableFrom]')).not.toHaveAttribute('required','');
  await expect(form.locator('[data-reuse-create-media]')).toHaveCount(0);
  await advanceToDetails(page);
  await form.locator('.unit-media-toolbar > button').click();
  await expect(form.locator('.unit-media-menu')).toBeVisible();
  await expect(form.locator('.unit-media-menu')).toContainText('Existing library');
  await form.locator('[data-base-name=rentAmount]').fill('1250.50');
  await expect(form.locator('[data-base-name=rentAmount]')).toHaveValue('1250.50');
  await expect(form.locator('[data-base-name=rentAmount]')).toHaveAttribute('inputmode','decimal');
  await expect(form.locator('[data-base-name=rentCurrency] option[value=RWF]')).toHaveCount(1);
  await form.locator('[data-base-name=rentCurrency]').selectOption('OTHER');
  await page.getByRole('dialog').getByRole('searchbox',{name:'Search currency code'}).fill('CNY');
  await page.getByRole('dialog').getByRole('button',{name:'CNY'}).click();
  await expect(form.locator('[data-base-name=rentCurrency]')).toHaveValue('CNY');
  await expect(form.locator('[data-base-name=rentPeriod] option[value=month]')).toContainText('Monthly');
  await expect(form.locator('.journey-next')).toHaveCSS('color','rgb(255, 255, 255)');
  expect(await page.evaluate(()=>formatListingPrice({rentAmount:1250.50,rentCurrency:'RWF',rentPeriod:'month',property:{country:'Rwanda'}}))).toContain('RWF 1,250.5');
});

test('added and reused photos share the main-plus-uniform thumbnail layout',async({page})=>{
  await openCreate(page);
  await page.evaluate(()=>{VACANCY_BACKEND.ownerMediaLibrary=async()=>[{id:'one',url:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',label:'Existing unit'}];VACANCY_BACKEND.mediaLibraryFiles=async()=>[new File(['reuse'],'reuse.jpg',{type:'image/jpeg'})]});
  await advanceToDetails(page);
  const input=page.locator('#listingForm .unit-editor input[type=file]').first();
  await input.setInputFiles([{name:'first.jpg',mimeType:'image/jpeg',buffer:Buffer.from('a')},{name:'second.jpg',mimeType:'image/jpeg',buffer:Buffer.from('b')}]);
  await page.locator('#listingForm .unit-media-toolbar > button').click();
  await page.locator('#listingForm [data-media-library]').click();
  await page.getByRole('button',{name:/Existing unit/}).click();
  await page.getByRole('button',{name:'Add selected photos'}).click();
  await expect(page.locator('#listingForm .photo-selection-item')).toHaveCount(3);
  await expect(page.locator('#listingForm .photo-selection-item.photo-main')).toHaveCount(1);
  const sizes=await page.locator('#listingForm .photo-selection-item').evaluateAll(items=>items.map(item=>({width:Math.round(item.getBoundingClientRect().width),height:Math.round(item.getBoundingClientRect().height)})));
  expect(sizes[0].width).toBeGreaterThan(sizes[1].width);
  expect(sizes[1]).toEqual(sizes[2]);
});

test('listing language selector changes create labels without changing saved values',async({page})=>{
  await openCreate(page);
  await page.locator('.listing-language select').selectOption('sw');
  await expect(page.locator('.journey-current-title')).toContainText('Mahali');
  await expect(page.locator('.journey-next')).toContainText('Endelea');
  await page.locator('.listing-language select').selectOption('fr');
  await expect(page.locator('.journey-current-title')).toContainText('Emplacement');
  await page.locator('.listing-language select').selectOption('zh');
  await expect(page.locator('.journey-current-title')).toContainText('位置');
  await page.locator('.listing-language select').selectOption('en');
  await expect(page.locator('.journey-current-title')).toContainText('Location');
});
