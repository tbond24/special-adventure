const {test,expect}=require('@playwright/test');
const APP_URL=process.env.VACANCY_E2E_URL;

async function openComposer(page,properties=[]){
  await page.addInitScript(()=>localStorage.setItem('vacancy-market-v1','KE'));
  await page.goto(`${APP_URL}/#home`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof renderList==='function'&&booting===false);
  await page.evaluate(async properties=>{currentUser={id:'guided-qa',email:'guided@example.com'};VACANCY_BACKEND.myProperties=async()=>properties;VACANCY_BACKEND.myVacancies=async()=>[];await renderList()},properties);
}

test('new property composer reveals one validated stage at a time',async({page})=>{
  await openComposer(page);
  await expect(page.locator('.composer-section[open]')).toHaveCount(1);
  await expect(page.locator('.composer-section[open] summary strong')).toHaveText('Location');
  await expect(page.locator('.manual-location-field')).toHaveCount(6);
  expect(await page.locator('.manual-location-field:visible').count()).toBe(0);
  await page.getByRole('button',{name:'Enter address manually'}).click();
  await page.getByLabel('County').fill('Nairobi');
  await page.getByLabel('Town / city').fill('Nairobi');
  await page.getByLabel('Estate / area').fill('Kasarani');
  await page.getByLabel(/Exact address/).fill('Example Road');
  await page.evaluate(()=>{document.querySelector('[name=publicLatitude]').value='-1.219';document.querySelector('[name=publicLongitude]').value='36.897'});
  await page.locator('.composer-section[open] .section-continue').click();
  await expect(page.locator('.composer-section[open] summary strong')).toHaveText('Property details');
  await expect(page.locator('.listing-steps button').first()).toHaveClass(/complete/);
  await expect(page.locator('.composer-section[open] .service-choice')).toHaveCount(6);
});

test('unit inputs reduce typing and remain usable without horizontal overflow',async({page})=>{
  await openComposer(page);
  await page.locator('.listing-steps button').nth(2).click();
  await expect(page.getByLabel('Listing title (optional)')).not.toHaveAttribute('required','');
  await expect(page.getByLabel('Available from')).toHaveValue(new Date().toISOString().slice(0,10));
  await page.getByLabel('Rent amount').fill('25000');await page.getByLabel('Rent amount').blur();
  await expect(page.getByLabel('Rent amount')).toHaveValue('25,000');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('existing property path skips duplicate location entry',async({page})=>{
  await openComposer(page,[{id:'property-1',title:'Sunrise',managerNickname:'Home block',locality:'Kasarani',city:'Nairobi',waterAvailable:true,electricityAvailable:true,securityAvailable:true,parkingSpaces:1}]);
  await expect(page.getByRole('button',{name:/Home block/})).toBeVisible();
  await page.getByRole('button',{name:/Home block/}).click();
  await expect(page.locator('#existingListingForm')).toBeVisible();
  await expect(page.locator('#newPropertyMap')).toHaveCount(0);
});

test('fresh browser defaults to light theme and inventory uses updated label',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('vacancy-market-v1','KE'));
  await page.goto(`${APP_URL}/#home`);
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await expect(page.locator('.fresh').first()).toContainText('Updated');
});
