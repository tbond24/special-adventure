const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

async function openHome(page){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);
  await page.waitForFunction(()=>booting===false);
}

test('Find header hides down and returns up without popping back at rest',async({page})=>{
  await openHome(page);
  await page.evaluate(()=>document.body.style.minHeight='3000px');
  await page.evaluate(()=>scrollTo(0,500));
  await expect(page.locator('.topbar')).toHaveClass(/scroll-hidden/);
  await page.waitForTimeout(350);
  await expect(page.locator('.topbar')).toHaveClass(/scroll-hidden/);
  await page.evaluate(()=>scrollTo(0,390));
  await expect(page.locator('.topbar')).not.toHaveClass(/scroll-hidden/);
  await page.evaluate(()=>nav('saved'));
  await expect(page.locator('.topbar')).not.toHaveClass(/scroll-hidden/);
});

test('a map selection raises its card and temporarily rings it in both views',async({page})=>{
  await openHome(page);
  for(const view of ['card-view','list-view']){
    await page.evaluate(view=>{
      const cards=document.querySelector('#cards');
      cards.className=`card-rail ${view}`;
      cards.innerHTML='<article class="explore-card" data-card-id="a"></article><article class="explore-card" data-card-id="b"></article>';
      selectExplore('b',true);
    },view);
    await expect(page.locator('#cards .explore-card').first()).toHaveAttribute('data-card-id','b');
    await expect(page.locator('#cards .explore-card').first()).toHaveClass(/map-focused/);
  }
  await expect(page.locator('#cards .explore-card').first()).not.toHaveClass(/map-focused/,{timeout:5000});
});

test('Change returns to a responsive chooser and can start a new listing again',async({page})=>{
  await openHome(page);
  await page.evaluate(()=>{
    currentUser={id:'owner'};
    VACANCY_BACKEND.myProperties=async()=>[];
    VACANCY_BACKEND.myVacancies=async()=>[];
    VACANCY_BACKEND.ownerDashboardMetrics=async()=>({impressions:0,clicks:0,messages:0});
    nav('list','new');
  });
  for(let attempt=0;attempt<2;attempt++){
    await page.locator('[data-listing-type=Residential]').click();
    await page.locator('[data-preset=Room]').click();
    await page.getByRole('button',{name:'New property'}).click();
    await expect(page.locator('#listingForm')).toBeVisible();
    await page.locator('.listing-choice-breadcrumb button').click();
    await expect(page.getByRole('heading',{name:'What are you listing?'})).toBeVisible();
    await expect(page.locator('[data-listing-type=Residential]')).toBeEnabled();
  }
});
