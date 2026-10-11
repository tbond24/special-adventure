const {test,expect}=require('@playwright/test');
const {install}=require('../account-drafts/synthetic-cloud.cjs');
const fs=require('node:fs'),path=require('node:path');
const photos=Array.from({length:8},(_,i)=>({name:`synthetic-${i+1}.png`,mimeType:'image/png',buffer:fs.readFileSync(path.join(__dirname,`fixtures/synthetic-${i+1}.png`))}));
async function openPicker(page,context){
 const state=await install(context);await page.goto('/#list/new');await page.waitForFunction(()=>typeof booting!=='undefined'&&!booting);
 await page.locator('[data-listing-type=House]').click();await page.getByRole('button',{name:'New property',exact:true}).click();
 const form=page.locator('#listingForm');await expect(form).toHaveAttribute('data-journey-step','0');await form.evaluate(node=>{for(const [k,v] of Object.entries({country:'Kenya',region:'Nairobi',city:'Nairobi',locality:'Westlands',address:'Synthetic Road'}))if(node.elements[k])node.elements[k].value=v;node.querySelector('#newPropertyMap')._vacancySetLocation(-1.26,36.8,false)});
 await form.locator('.journey-next').click();await expect(form).toHaveAttribute('data-journey-step','1');return {state,form,input:form.locator('input[type=file]').first(),grid:form.locator('.photo-selection-grid').first()};
}
async function boxes(grid){return grid.locator('.photo-selection-item').evaluateAll(nodes=>nodes.map(node=>{const b=node.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height}}));}
for(const width of [320,390,430,1280])for(const count of [0,1,3,4,5,8])test(`${width}px with ${count} selected photos wraps extras uniformly`,async({page,context},testInfo)=>{
 await page.setViewportSize({width,height:900});const {state,form,input,grid}=await openPicker(page,context);
 await input.setInputFiles(photos.slice(0,Math.min(count,3)));const first3=await boxes(grid);
 if(count>3)await input.setInputFiles(photos.slice(3,count));
 await expect(grid.locator('[data-photo-expand]')).toHaveCount(0);
 await expect(grid.locator('.photo-selection-item')).toHaveCount(count);if(count)await grid.scrollIntoViewIfNeeded();
 const actual=await boxes(grid);await page.screenshot({path:testInfo.outputPath(`photos-${count}-${width}.png`),fullPage:true});
 if(count)await grid.screenshot({path:testInfo.outputPath(`grid-${count}-${width}.png`)});
 if(process.env.VACANCY_PHOTO_BASELINE)return;
 if(count>=3)expect(actual[0].width).toBeGreaterThan(actual[1].width*1.8);
 for(let i=0;i<Math.min(count,3);i++){expect(Math.abs(actual[i].width-first3[i].width)).toBeLessThan(1);expect(Math.abs(actual[i].height-first3[i].height)).toBeLessThan(1);}
 for(const b of actual.slice(3)){expect(b.y).toBeGreaterThanOrEqual(Math.max(...actual.slice(0,3).map(a=>a.y+a.height))+4);expect(Math.abs(b.width-actual[1].width)).toBeLessThan(1);expect(Math.abs(b.height-b.width)).toBeLessThan(1);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 expect(await grid.locator('img').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).objectFit==='cover'&&n.complete&&n.naturalWidth>0))).toBe(true);
 expect(await page.evaluate(()=>selectedPhotoFiles(document.querySelector('#listingForm input[type=file]')).map(file=>file.name))).toEqual(photos.slice(0,count).map(p=>p.name));
 expect(state.cloud.requests.filter(request=>request.method!=='GET')).toEqual([]);
 expect(await grid.locator('.photo-selection-item>div button').evaluateAll(nodes=>nodes.every(button=>{const a=button.getBoundingClientRect(),b=button.closest('.photo-selection-item').getBoundingClientRect();return a.x>=b.x&&a.y>=b.y&&a.right<=b.right+1&&a.bottom<=b.bottom+1}))).toBe(true);
});
test('eight visible photos keep main selection, reorder and removal working',async({page,context})=>{
 const {input,grid}=await openPicker(page,context);await input.setInputFiles(photos);await expect(grid.locator('[data-photo-expand]')).toHaveCount(0);
 await grid.locator('[data-photo-main="7"]').click();await expect(grid.locator('.photo-main img')).toHaveAttribute('alt','synthetic-8.png preview');
 await grid.locator('[data-photo-down="0"]').click();await expect(grid.locator('.photo-main img')).toHaveAttribute('alt','synthetic-1.png preview');
 page.once('dialog',dialog=>dialog.accept());await grid.locator('[data-photo-remove="7"]').click();await expect(grid.locator('.photo-selection-item')).toHaveCount(7);
});
test('existing-photo edit picker does not reserve empty lead rows',async({page,context})=>{
 await page.setViewportSize({width:320,height:900});const {form,input,grid}=await openPicker(page,context);
 await form.evaluate(node=>{node.dataset.editVacancy='synthetic-existing-vacancy';const existing=document.createElement('div');existing.className='edit-existing-photo';node.append(existing)});
 await input.setInputFiles(photos.slice(0,5));await expect(grid.locator('[data-photo-expand]')).toHaveCount(0);await expect(grid.locator('.photo-main')).toHaveCount(0);
 const tiles=await boxes(grid),top=await grid.evaluate(node=>node.getBoundingClientRect().top);
 expect(Math.abs(tiles[0].y-top)).toBeLessThan(1);expect(Math.abs(tiles[2].y-top)).toBeLessThan(1);
 for(const tile of tiles)expect(Math.abs(tile.width-tiles[0].width)).toBeLessThan(1);
 expect(tiles[3].y).toBeLessThanOrEqual(top+tiles[0].height+6);
});

test('ninth photo is rejected without hiding or changing the eight selected files',async({page,context})=>{
 const {input,grid}=await openPicker(page,context);await input.setInputFiles(photos);
 await input.setInputFiles({...photos[0],name:'synthetic-ninth.png'});await expect(page.locator('#toast')).toContainText('Maximum 8 images');
 await expect(grid.locator('.photo-selection-item')).toHaveCount(8);await expect(grid.locator('[data-photo-expand]')).toHaveCount(0);
 expect(await page.evaluate(()=>selectedPhotoFiles(document.querySelector('#listingForm input[type=file]')).map(file=>file.name))).toEqual(photos.map(photo=>photo.name));
});
test('all eight guest photos remain visible after durable local draft restore',async({page,context})=>{
 const {input,grid,form}=await openPicker(page,context);await input.setInputFiles(photos);await expect(grid.locator('.photo-selection-item')).toHaveCount(8);
 const id=await form.getAttribute('data-guest-draft-id');
 await expect.poll(()=>page.evaluate(async id=>(await draftMediaStore('get','vacancy-guest-listing-bundle-v1:'+id))?.media?.flatMap(row=>row.files).length||0,id)).toBe(8);
 await page.reload();await page.waitForFunction(()=>typeof booting!=='undefined'&&!booting);
 await expect(page.locator('#listingForm .photo-selection-item')).toHaveCount(8);await expect(page.locator('#listingForm [data-photo-expand]')).toHaveCount(0);
 expect(await page.evaluate(()=>selectedPhotoFiles(document.querySelector('#listingForm input[type=file]')).map(file=>file.name))).toEqual(photos.map(photo=>photo.name));
});
