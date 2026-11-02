// Read-only synthetic browser comparison against the pinned deployed baseline.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {chromium}=require('@playwright/test');
const base='http://127.0.0.1:8776';
const targets=['storage_used','track:text_button_pressed','live_listings'];
const out=path.resolve('test-results/admin-axis-fonts');
const sourceFiles=['admin-chart','admin-overview-cards'];
const original=Object.fromEntries(sourceFiles.map(name=>[name,execFileSync('git',['show','aa7e525679eb436aa194bab64781da2875bb7d79:app/src/'+name+'.js'],{encoding:'utf8'})]));

async function snapshot(page){return page.evaluate(()=>[...document.querySelectorAll('.overview-metric-card')].map(card=>{
 const svg=card.querySelector('.overview-card-graph svg');
 const axes=svg?[...svg.querySelectorAll('text')].filter(t=>Number(t.getAttribute('y'))===132):[];
 const size=svg?.getBoundingClientRect();
 return {metric:card.dataset.metric,value:card.querySelector('[data-metric-value]')?.textContent,
  svg:size?{width:size.width,height:size.height,viewBox:svg.getAttribute('viewBox'),aspect:svg.getAttribute('preserveAspectRatio')}:null,
  lines:svg?[...svg.querySelectorAll('polyline')].map(line=>line.getAttribute('points')):[],
  axes:axes.map(text=>{const style=getComputedStyle(text),m=text.getScreenCTM();return {text:text.textContent,
   x:text.getAttribute('x'),y:text.getAttribute('y'),anchor:text.getAttribute('text-anchor'),family:style.fontFamily,
   size:style.fontSize,weight:style.fontWeight,sx:m.a,sy:m.d,transform:text.getAttribute('transform')};})};
}));}

(async()=>{
 await fs.mkdir(out,{recursive:true});
 const response=await fetch(base+'/__preview-status');
 assert.equal(response.headers.get('x-vacancy-preview-isolated'),'synthetic-curated-release');
 const browser=await chromium.launch({headless:true});
 const evidence={source:(await response.json()).source,status:'PARTIAL',checks:[],screenshots:[]};
 try{
  for(const width of [1440,1920,390]){
   const snapshots={};
   for(const mode of ['before','after']){
    const context=await browser.newContext({viewport:{width,height:1100},serviceWorkers:'block'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-11-02T12:34:56Z'));
    if(mode==='before')await page.route(/\/src\/admin-(?:chart|overview-cards)\.js(?:\?|$)/,route=>{
     const name=new URL(route.request().url()).pathname.split('/').pop().slice(0,-3);
     return route.fulfill({status:200,contentType:'text/javascript',body:original[name]});
    });
    await page.goto(base+'/__admin-preview',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__visualReady===true,null,{timeout:30000});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const data=await snapshot(page);assert.equal(data.length,8);snapshots[mode]=data;
    if(mode==='after'){
     for(const card of data.filter(c=>targets.includes(c.metric))){
      assert.equal(card.axes.length,5);
      for(const label of card.axes){assert.equal(label.size,'12px');assert.equal(label.weight,'400');assert(Math.abs(label.sx-1)<1e-5);assert(Math.abs(label.sy-1)<1e-5);}
     }
    }
    if(width!==1920){
     for(const metric of targets){const card=page.locator('.overview-metric-card').filter({has:page.locator('[data-card-metric] option[value="'+metric+'"]:checked')});
      const file=mode+'-'+width+'-'+metric.replace(':','-')+'.png';await card.screenshot({path:path.join(out,file),animations:'disabled'});evidence.screenshots.push(file);}
    }
    if(mode==='after'){
     const card=page.locator('.overview-metric-card[data-metric="storage_used"]');
     await card.locator('[data-card-period]').selectOption('7');
     await page.waitForFunction(()=>document.querySelectorAll('.overview-metric-card[data-metric="storage_used"] [data-fixed-x-axis]').length===2);
     const dateLabels=await card.locator('[data-fixed-x-axis]').evaluateAll(labels=>labels.map(t=>({sx:t.getScreenCTM().a,sy:t.getScreenCTM().d})));
     for(const label of dateLabels){assert(Math.abs(label.sx-1)<1e-5);assert(Math.abs(label.sy-1)<1e-5);}
     await page.setViewportSize({width:width===390?1440:390,height:1100});
     await page.waitForFunction(()=>[...document.querySelectorAll('[data-fixed-x-axis]')].every(t=>Math.abs(t.getScreenCTM().a-1)<1e-5&&Math.abs(t.getScreenCTM().d-1)<1e-5));
     evidence.checks.push(width+'px: requested x-axes remain 12px regular at unit scale; date range and resize pass');
    }
    assert.deepEqual(errors,[]);await context.close();
   }
   for(let i=0;i<snapshots.before.length;i++){
    const before=snapshots.before[i],after=snapshots.after[i];
    assert.equal(before.metric,after.metric);assert.equal(before.value,after.value);
    assert.deepEqual(before.svg,after.svg);assert.deepEqual(before.lines,after.lines);
    if(!targets.includes(before.metric))assert.deepEqual(before.axes,after.axes);
    else assert.deepEqual(before.axes.map(({sx,sy,transform,...label})=>label),after.axes.map(({sx,sy,transform,...label})=>label));
   }
   evidence.checks.push(width+'px: values, plot geometry, label anchors and all other chart labels match baseline');
   evidence[width]=snapshots;
  }
  evidence.status='PASS';console.log('PASS: targeted 12px x-axis labels at 1440/1920/390px, resize/date ranges, unchanged plots and other charts, no browser errors');
 }finally{await browser.close();await fs.writeFile(path.join(out,'verification.json'),JSON.stringify(evidence,null,2));}
})().catch(error=>{console.error(error);process.exitCode=1;});
