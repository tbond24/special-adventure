const {test,expect}=require('@playwright/test');
const path=require('node:path');const fs=require('node:fs');
const base='http://127.0.0.1:8776',out=path.resolve(__dirname,'../../marketing-checkpoint-artifacts/visual-milestone');
test.beforeEach(async({page})=>{await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.fulfill({status:200,contentType:'application/json',body:'[]'}));await page.goto(base+'/__admin-preview');await page.waitForFunction(()=>window.__visualReady===true);await expect(page.locator('.journey-flow-panel')).toBeVisible();});
test('synthetic console flow and navigation preview',async({page},info)=>{
  if(info.project.name.startsWith('desktop'))await page.setViewportSize({width:1500,height:1050});
  fs.mkdirSync(out,{recursive:true});
  await expect(page.locator('.visual-fixture-banner')).toContainText('SYNTHETIC DATA');
  await expect(page.locator('.journey-stat').filter({hasText:'7-day publication rate'})).toContainText('Unavailable');
  await page.screenshot({path:path.join(out,info.project.name+'-top.png'),fullPage:false});
  await page.screenshot({path:path.join(out,info.project.name+'-full.png'),fullPage:true});
  await page.locator('[data-stage="1"]').click();await expect(page.locator('.journey-selection')).toContainText('Listing details · 103 journeys');
  await page.locator('.journey-flow-panel').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,info.project.name+'-flow.png'),fullPage:false});
  await page.locator('[data-source="Tagged link"]').click();await expect(page.locator('[name=source]')).toHaveValue('Tagged link');await expect(page.locator('.journey-stats .journey-stat').nth(1).locator('strong')).toHaveText('30');
  await page.locator('[name=source]').selectOption('');await expect(page.locator('.journey-stats .journey-stat').nth(1).locator('strong')).toHaveText('120');
  for(const section of ['overview','activity','people','reports','system','icons','marketing']){
    if(info.project.name.startsWith('mobile'))await page.getByRole('button',{name:'Open admin navigation'}).click();
    await page.locator(`#adminSectionMenu [data-section="${section}"]`).click();await expect(page.locator(`[data-admin-section="${section}"]`)).toBeVisible();
    await expect(page.locator('#adminSectionMenu [aria-current=page]')).toHaveAttribute('data-section',section);
    if(section==='overview'){
      await expect(page.locator('[data-admin-section="overview"]')).toContainText('Message requests per 100 listings');
      await page.screenshot({path:path.join(out,info.project.name+'-overview.png'),fullPage:false});
    }
  }
  await page.locator('summary').filter({hasText:'Accessible flow table'}).click();await expect(page.getByRole('region',{name:'Observed transitions'})).toBeVisible();
  await page.locator('.journey-definitions summary').click();await page.locator('.journey-definitions').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,info.project.name+'-bottom.png'),fullPage:false});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
});
test('truthful coverage, refresh failure and recovery',async({page})=>{
  await page.selectOption('#visualScenario','complete');await expect(page.locator('.journey-stat').filter({hasText:'7-day publication rate'})).toContainText('%');
  await page.selectOption('#visualScenario','incomplete');await expect(page.locator('.journey-state')).toContainText('Tracking coverage is incomplete');await expect(page.locator('.journey-flow-panel')).toHaveCount(0);
  await page.selectOption('#visualScenario','error');await expect(page.locator('[role=alert]')).toContainText('Journey report unavailable');await expect(page.locator('.journey-stat')).toHaveCount(0);
  await page.selectOption('#visualScenario','empty');await expect(page.locator('.journey-state')).toContainText('No recorded journeys');
  await page.selectOption('#visualScenario','normal');await expect(page.locator('.journey-flow-panel')).toBeVisible();
});
test('keyboard navigation and public layout restore',async({page},info)=>{
  if(info.project.name.startsWith('mobile')){const button=page.getByRole('button',{name:'Open admin navigation'});await button.click();await page.keyboard.press('Escape');await expect(button).toBeFocused();await expect(button).toHaveAttribute('aria-expanded','false');}
  await page.locator('[data-stage="2"]').focus();await page.keyboard.press('Enter');await expect(page.locator('.journey-selection')).toContainText('Review · 76 journeys');
  if(info.project.name.startsWith('mobile'))await page.getByRole('button',{name:'Open admin navigation'}).click();
  await page.locator('.console-return').click();await expect(page.locator('.admin-console')).toHaveCount(0);await expect(page.locator('.topbar')).toBeVisible();
});
