const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4178';

async function openManager(page){
  await page.addInitScript(()=>localStorage.setItem('vacancy-market-v1','KE'));
  await page.goto(`${APP}/#home`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof renderList==='function'&&booting===false);
  await page.evaluate(async()=>{
    currentUser={id:'owner-one',email:'owner@example.test'};
    const property={id:'property-one',reference_code:'VAC-P-1234ABCD',title:'Sunrise',suburb:'Kasarani',city:'Nairobi',country:'Kenya'};
    const vacancy=(id,status,name)=>({id,reference_code:`VAC-L-${id.toUpperCase()}`,status,rent_amount:12000,rent_currency:'KES',rent_period:'month',rooms:{id:`room-${id}`,name,properties:property}});
    window.__statusCalls=[];
    VACANCY_BACKEND.myProperties=async()=>[{id:'property-one',referenceCode:'VAC-P-1234ABCD',title:'Sunrise',managerNickname:'Main block',locality:'Kasarani',city:'Nairobi',marketCode:'KE',waterAvailable:true,electricityAvailable:true,securityAvailable:true,parkingSpaces:1}];
    VACANCY_BACKEND.myVacancies=async()=>[vacancy('one','active','Studio 1'),vacancy('two','archived','Studio 2')];
    VACANCY_BACKEND.setVacancyStatus=async(id,status)=>window.__statusCalls.push({id,status});
    VACANCY_BACKEND.activeVacancies=async()=>[];
    await renderList();
  });
}

test('property chooser puts New Property first and keeps add Unit on the property row',async({page})=>{
  await openManager(page);
  await expect(page.locator('.property-select-card').first()).toHaveText(/New property/i);
  await expect(page.getByRole('button',{name:/Main block/})).toContainText('＋ Unit');
  await expect(page.getByText('Add its location and shared details')).toHaveCount(0);
});

test('inventory count, filters and list/card views work without page overflow',async({page})=>{
  await openManager(page);
  await expect(page.locator('#vacancyCount')).toHaveText('2');
  await page.locator('#vacancyFilter').selectOption('archived');
  await expect(page.locator('.room-manage')).toHaveCount(1);
  await expect(page.locator('#vacancyCountDetail')).toHaveText('1 of 2 vacancies');
  await page.locator('#vacancyCardView').click();
  await expect(page.locator('#mine')).toHaveClass(/cards-view/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
});

test('archive is confirmed before mutation and deletion is available only after archive',async({page})=>{
  await openManager(page);
  page.once('dialog',dialog=>dialog.dismiss());
  await page.getByRole('button',{name:'Archive or delete listing'}).click();
  expect(await page.evaluate(()=>window.__statusCalls)).toEqual([]);
  await page.locator('#vacancyFilter').selectOption('archived');
  await expect(page.getByRole('button',{name:'Delete'})).toBeVisible();
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Delete'}).click();
  await expect.poll(()=>page.evaluate(()=>window.__statusCalls)).toEqual([{id:'two',status:'removed'}]);
});

test('guided sections are flat while remaining visibly separated',async({page})=>{
  await openManager(page);await page.getByRole('button',{name:/Main block/}).click();
  const style=await page.locator('.composer-section').first().evaluate(node=>({borderTop:getComputedStyle(node).borderTopWidth,borderBottom:getComputedStyle(node).borderBottomWidth,background:getComputedStyle(node).backgroundColor}));
  expect(style.borderTop).toBe('0px');expect(style.borderBottom).toBe('1px');expect(style.background).toBe('rgba(0, 0, 0, 0)');
});
