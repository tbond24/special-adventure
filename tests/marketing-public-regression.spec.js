const {test,expect}=require('@playwright/test');
const APP='http://127.0.0.1:8765';
test('public Find, auth and List retain styles, controls and request paths',async({browser},info)=>{
  const observations=[];
  for(const baseline of [true,false]) {
    const {viewport,isMobile,hasTouch,deviceScaleFactor,userAgent}=info.project.use;
    const context=await browser.newContext({viewport,isMobile,hasTouch,deviceScaleFactor,userAgent});
    const page=await context.newPage(),requests=new Set();
    await page.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.origin!==APP) {
        requests.add(url.pathname);
        return route.fulfill({status:200,contentType:'application/json',body:url.pathname.includes('/rpc/')?'{}':'[]'});
      }
      if(url.pathname==='/') {
        const response=await route.fetch(),headers={...response.headers()};delete headers['content-security-policy'];
        return route.fulfill({response,headers});
      }
      if(baseline&&url.pathname==='/src/admin-lister-marketing.js')return route.fulfill({response:await route.fetch({url:APP+'/__baseline-marketing.js'})});
      if(baseline&&url.pathname==='/styles.css')return route.fulfill({response:await route.fetch({url:APP+'/__baseline-styles.css'})});
      return route.continue();
    });
    const pages=[];
    for(const route of ['home','auth','list']) {
      await page.goto(APP+'/#'+route);
      await page.waitForFunction(()=>booting===false);
      await page.waitForFunction(()=>document.getAnimations().every(animation=>animation.effect?.getTiming().iterations===Infinity||animation.playState==='finished'));
      await expect(page.locator('.admin-marketing')).toHaveCount(0);
      pages.push(await page.evaluate(()=>[...document.querySelectorAll('.topbar,main h1,main input,main button,[data-nav]')].filter(node=>node.getClientRects().length).map(node=>{
        const style=getComputedStyle(node);
        return {tag:node.tagName,text:(node.textContent||'').trim(),label:node.getAttribute('aria-label'),font:style.fontFamily,size:style.fontSize,color:style.color,background:style.backgroundColor,radius:style.borderRadius,padding:style.padding,margin:style.margin};
      })));
    }
    await page.evaluate(()=>window.VACANCY_LISTER_JOURNEY?.flush());
    observations.push({pages,requests:[...requests].filter(url=>!url.includes('/tile/')).sort()});
    await context.close();
  }
  expect(observations[1].pages).toEqual(observations[0].pages);
  expect(observations[1].requests).toEqual(observations[0].requests);
  expect(observations[1].requests.some(url=>url.includes('admin_lister_marketing'))).toBe(false);
});
