// Preload the pinned Playwright test module so existing suites receive an
// automatic traffic guard. Their explicit page mocks still take precedence.
const location=require.resolve('@playwright/test');
const base=require(location);
const safe=base.test.extend({blockLiveTraffic:[async({context},use)=>{
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    return ['127.0.0.1','localhost'].includes(url.hostname)?route.continue():route.fulfill({status:200,contentType:'application/json',body:'[]'});
  });
  await use();
},{auto:true}]});
require.cache[location].exports={...base,test:safe};
