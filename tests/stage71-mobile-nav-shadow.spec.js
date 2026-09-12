const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

test('mobile navigation has no boundary and casts an even visible shadow',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);
  await page.waitForFunction(()=>booting===false);
  for(const theme of ['light','dark']){
    await page.evaluate(value=>document.documentElement.dataset.theme=value,theme);
    const result=await page.locator('.mobile-nav').evaluate(node=>{
      const style=getComputedStyle(node),box=node.getBoundingClientRect();
      return{border:style.border,bottom:innerHeight-box.bottom,overflow:style.overflow,shadow:style.boxShadow,horizontalOverflow:document.documentElement.scrollWidth-innerWidth};
    });
    expect(result.border).toMatch(/^0px/);
    expect(result.bottom).toBeGreaterThanOrEqual(13);
    expect(result.overflow).toBe('visible');
    expect(result.shadow).toMatch(/rgba?\([^)]*\) 0px 0px 26px/);
    expect(result.horizontalOverflow).toBe(0);
  }
});
