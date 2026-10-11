const {test,expect}=require('@playwright/test');
const {install}=require('../qa/account-drafts/synthetic-cloud.cjs');

const listing={id:'synthetic-hover',rentAmount:25000,rentCurrency:'KES',rentPeriod:'month',availableFrom:'2026-10-11',
 room:{name:'Garden studio',roomType:'Studio',media:[],maxOccupants:1},
 property:{suburb:'Westlands',city:'Nairobi',country:'Kenya',publicLatitude:-1.26,publicLongitude:36.8},owner:{id:'synthetic-lister',displayName:'Synthetic lister'}};

async function open(page,context,{dark=false,long=false}={}){
 const state=await install(context);
 await context.route(/https:\/\/[^/]*tile\.openstreetmap\.org\//,route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e9ece4"/><path d="M0 64H256M0 192H256M64 0V256M192 0V256" stroke="#fff" stroke-width="7"/></svg>'}));
 await page.goto('/#home');await page.waitForFunction(()=>!booting);
 const row=JSON.parse(JSON.stringify(listing));
 if(long){row.room.name='VeryLongListingNameThatWouldOtherwiseOverflowTheMapTooltip'.repeat(3);row.property.suburb='VeryLongSuburbNameThatWouldOtherwiseOverflowTheMapTooltip'.repeat(3);}
 await page.evaluate(({row,dark})=>{
  vacancies=[row];VACANCY_BACKEND.activeVacancies=async()=>[row];
  document.documentElement.dataset.theme=dark?'dark':'light';
  renderHome();exploreMap.setView([row.property.publicLatitude,row.property.publicLongitude],14,{animate:false});updateExploreMarkers(vacancies);
 },{row,dark});
 await expect(page.locator('[data-vacancy-id="synthetic-hover"]')).toBeVisible();
 return {state,row};
}

async function readable(page){
 const tip=page.locator('.vacancy-map-tooltip');await expect(tip).toHaveCount(1);await expect(tip).toBeVisible();
 // DOM text assertions alone passed when the summary was clipped to zero width.
 const boxes=await tip.evaluate(node=>({outer:node.getBoundingClientRect().toJSON(),children:[...node.querySelectorAll('.marker-summary,.marker-summary strong,.marker-summary span')].map(child=>({box:child.getBoundingClientRect().toJSON(),visibility:getComputedStyle(child).visibility}))}));
 expect(boxes.outer.width).toBeGreaterThan(150);expect(boxes.outer.width).toBeLessThanOrEqual(266);
 expect(boxes.children).toHaveLength(3);
 for(const child of boxes.children){expect(child.box.width).toBeGreaterThan(120);expect(child.box.height).toBeGreaterThan(10);expect(child.visibility).toBe('visible');expect(child.box.left).toBeGreaterThanOrEqual(boxes.outer.left);expect(child.box.right).toBeLessThanOrEqual(boxes.outer.right);}
 expect(boxes.outer.left).toBeGreaterThanOrEqual(0);expect(boxes.outer.right).toBeLessThanOrEqual(page.viewportSize().width);
 return tip;
}

for(const dark of [false,true])test(`${dark?'dark':'light'} listing hover restores the existing readable summary`,async({page,context},info)=>{
 const {state,row}=await open(page,context,{dark});
 const marker=page.locator('[data-vacancy-id="synthetic-hover"]');
 const selected=await marker.getAttribute('aria-pressed');
 await marker.hover();const tip=await readable(page);
 await expect(tip.locator('strong')).toHaveText(row.room.name);
 await expect(tip.locator('span')).toContainText('Westlands · KSh 25,000/month · Available');
 await page.screenshot({path:info.outputPath('listing-hover.png')});
 // Moving away closes the preview; hover does not select or navigate.
 await expect(marker).toHaveAttribute('aria-pressed',selected);await expect(page).toHaveURL(/#home$/);
 await page.mouse.move(1,1);await expect(page.locator('.vacancy-map-tooltip')).toHaveCount(0);
 await marker.hover();await readable(page);
 expect(state.cloud.publicWrites).toEqual([]);expect(state.authRequests).toEqual([]);
});

test('long names stay bounded on a narrow map without collapsing the preview',async({page,context},info)=>{
 await page.setViewportSize({width:320,height:851});const {state,row}=await open(page,context,{long:true});
 await page.locator('[data-vacancy-id="synthetic-hover"]').hover();const tip=await readable(page);
 await expect(tip.locator('strong')).toHaveText(row.room.name);
 for(const child of [tip.locator('strong'),tip.locator('span')]){await expect(child).toHaveCSS('text-overflow','ellipsis');expect(await child.evaluate(node=>node.scrollWidth>node.clientWidth)).toBe(true);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await page.screenshot({path:info.outputPath('listing-hover-long-name.png')});expect(state.cloud.publicWrites).toEqual([]);
});

test('selection and keyboard focus retain the same preview without requiring availability',async({page,context})=>{
 const {state}=await open(page,context);
 await page.evaluate(()=>{delete vacancies[0].availableFrom;updateExploreMarkers(vacancies)});
 const marker=page.locator('[data-vacancy-id="synthetic-hover"]');
 await page.keyboard.press('Tab');await marker.focus();await readable(page);
 await expect(page.locator('.marker-summary span')).toHaveText('Westlands · KSh 25,000/month');
 await marker.press('Enter');await expect(marker).toHaveAttribute('aria-pressed','true');await expect(page.locator('#cards [data-card-id]').first()).toHaveAttribute('data-card-id','synthetic-hover');
 await page.mouse.move(1,1);await marker.hover();await readable(page);await expect(page).toHaveURL(/#home$/);
 expect(state.cloud.publicWrites).toEqual([]);expect(state.authRequests).toEqual([]);
});
