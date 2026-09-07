const { test, expect } = require('@playwright/test');

const APP_URL=process.env.VACANCY_E2E_URL || 'https://vacancy-nine.vercel.app';

async function openVacancy(page){
  await page.addInitScript(()=>localStorage.setItem('vacancy-market-v1','KE'));
  await page.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#exploreMap',{timeout:15000});
  await expect(page.locator('.explore-card')).toHaveCount(3,{timeout:15000});
}

test('map pin and card selection stay synchronized', async ({ page }) => {
  await openVacancy(page);
  await page.locator('#exploreMap').evaluate(el=>el.scrollIntoView({block:'center'}));
  await page.waitForTimeout(150);

  const before=await page.locator('.explore-card.selected').getAttribute('data-card-id');
  const unselected=page.locator('.leaflet-marker-icon').filter({has:page.locator('.map-pin:not(.selected)')}).first();
  const candidates=page.locator('.leaflet-marker-icon').filter({has:page.locator('.map-pin:not(.selected)')});
  const clickableIndex=await candidates.evaluateAll(nodes=>nodes.findIndex(node=>{const r=node.getBoundingClientRect(),top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return top===node||node.contains(top)}));
  expect(clickableIndex).toBeGreaterThanOrEqual(0);
  const exposed=candidates.nth(clickableIndex);
  await expect(exposed).toBeVisible();
  const target=await exposed.getAttribute('data-vacancy-id');
  expect(target).toBeTruthy();
  await exposed.click();
  await expect.poll(async()=>page.locator('.explore-card.selected').getAttribute('data-card-id'),{timeout:5000}).toBe(target);
  expect(target).not.toBe(before);

  const next=page.locator('.leaflet-marker-icon').filter({has:page.locator('.map-pin:not(.selected)')}).first();
  const nextTarget=await next.getAttribute('data-vacancy-id');
  await next.focus();
  await next.press('Enter');
  await expect.poll(async()=>page.locator('.explore-card.selected').getAttribute('data-card-id'),{timeout:5000}).toBe(nextTarget);
});
