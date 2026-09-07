const { test } = require('@playwright/test');

const APP_URL=process.env.VACANCY_E2E_URL || 'https://vacancy-nine.vercel.app';

test('diagnose map marker geometry', async ({ page }) => {
  await page.addInitScript(()=>localStorage.setItem('vacancy-market-v1','KE'));
  await page.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#exploreMap',{timeout:15000});
  await page.locator('#exploreMap').evaluate(el=>el.scrollIntoView({block:'center'}));
  await page.waitForTimeout(250);
  const info=await page.evaluate(()=>{
    const mapEl=document.querySelector('#exploreMap');
    const mr=mapEl.getBoundingClientRect();
    const markers=[...document.querySelectorAll('.leaflet-marker-icon')].map((el,index)=>{
      const r=el.getBoundingClientRect();
      const x=r.left+r.width/2, y=r.top+r.height/2;
      const top=document.elementFromPoint(x,y);
      return {
        index,
        id:el.dataset.vacancyId||null,
        rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height},
        center:{x,y},
        withinMap:x>=mr.left&&x<=mr.right&&y>=mr.top&&y<=mr.bottom,
        hitTag:top?.tagName||null,
        hitClass:typeof top?.className==='string'?top.className:null,
        hitInsideMap:top?mapEl.contains(top):false
      };
    });
    return {viewport:{w:innerWidth,h:innerHeight},scrollY,map:{left:mr.left,top:mr.top,right:mr.right,bottom:mr.bottom,width:mr.width,height:mr.height},markers};
  });
  console.log('MAP_GEOMETRY',JSON.stringify(info));
});
