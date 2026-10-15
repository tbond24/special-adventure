// Test actual browser image decoding, not merely a successful fetch of a URL.
import {expect} from '@playwright/test';
export async function verifyPublishedPhotoRendering(h){
  const {actors,context,sql,server,ROOT,pass,check,evidence,artifacts}=h;
  const actor=actors.find(x=>x.role==='customer publisher');
  check(actor?.id&&ROOT==='http://127.0.0.1:54321','Only the disposable publisher is accepted');
  const listing=await sql(`select v.id from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where p.owner_id='${actor.id}' and v.status='active';`);
  check(/^[0-9a-f-]{36}$/.test(listing),'Exactly one synthetic active customer listing expected');
  const ctx=await context();
  try{
    const page=await ctx.newPage();
    await page.goto(server.url+'/#detail/'+listing);
    await expect(page.locator('.quiet-intro h1')).toHaveText('Synthetic customer studio edited');
    const photos=page.locator('.quiet-gallery-slide img');
    await expect(photos).toHaveCount(3);
    for(let i=0;i<3;i++){
      if(i)await page.locator('[data-quiet-gallery-step="1"]').click();
      await expect.poll(()=>photos.nth(i).evaluate(img=>img.complete&&img.naturalWidth>0&&img.naturalHeight>0),{timeout:15000}).toBe(true);
      const src=await photos.nth(i).getAttribute('src');
      check(new URL(src).origin===ROOT,'Decoded image uses only the local Storage origin');
    }
    await page.locator('[data-quiet-gallery-step="-1"]').click();
    await page.locator('[data-quiet-gallery-step="-1"]').click();
    pass('Real browser decodes all three uploaded photos through existing gallery navigation');
    await page.setViewportSize({width:390,height:844});
    await page.reload();
    await expect(page.locator('.quiet-intro h1')).toHaveText('Synthetic customer studio edited');
    await expect.poll(()=>page.locator('.quiet-gallery-slide img').first().evaluate(img=>img.complete&&img.naturalWidth>0),{timeout:15000}).toBe(true);
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Decoded photo layout has no mobile horizontal overflow');
    await page.screenshot({path:artifacts+'/customer-published-mobile.png'});
    evidence.customerJourneys.browserPhotoDecoding=true;
    evidence.customerJourneys.photoHarnessCorrection='Only the approved loopback Storage image origin was added to test CSP; production code unchanged.';
    pass('Edited customer listing photo is decoded and visible in the mobile screenshot');
  }finally{await ctx.close();}
}
