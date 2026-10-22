const {test,expect}=require('@playwright/test');
const base='http://127.0.0.1:8776';
const ready=async page=>{await page.goto(base+'/__admin-preview');await page.waitForFunction(()=>window.__visualReady);await expect(page.locator('.console-theme-toggle')).toBeVisible()};
test.beforeEach(async({page})=>{await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort())});

test('sun/moon choice survives reload, admin navigation and returning to the public site',async({page})=>{
 await ready(page);const toggle=page.locator('.console-theme-toggle');await expect(toggle.locator('use')).toHaveAttribute('href','#icon-sun');
 const visits=page.locator('.overview-metric-card[data-metric=visitors] [data-metric-value]'),value=await visits.textContent();
 await toggle.click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expect(toggle).toHaveAccessibleName('Use light mode');await expect(toggle.locator('use')).toHaveAttribute('href','#icon-moon');await expect(visits).toHaveText(value);
 expect(await page.evaluate(()=>localStorage.getItem('vacancy-theme-v1'))).toBe('dark');
 for(const key of ['activity','people','reports','system','overview']){await page.evaluate(k=>document.querySelector('[data-section="'+k+'"]').click(),key);await expect(toggle).toBeVisible();await expect(page.locator('html')).toHaveAttribute('data-theme','dark')}
 await page.reload();await page.waitForFunction(()=>window.__visualReady);await expect(toggle.locator('use')).toHaveAttribute('href','#icon-moon');await expect(page.locator('.overview-metric-card').first()).toHaveCSS('background-color','rgb(21, 32, 51)');
 await page.evaluate(()=>nav('privacy'));await expect(page.locator('.topbar #themeToggle')).toBeVisible();await expect(page.locator('#themeToggle use')).toHaveAttribute('href','#icon-moon');await expect(page.locator('[data-theme-toggle]')).toHaveCount(0);
 await page.locator('#themeToggle').click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');await ready(page);await expect(toggle.locator('use')).toHaveAttribute('href','#icon-sun');await page.reload();await page.waitForFunction(()=>window.__visualReady);await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});

test('dark cards, map, labels, dialog and menu stay readable and the icon stays centred',async({page},info)=>{
 await ready(page);await page.locator('.console-theme-toggle').click();const card=page.locator('.overview-metric-card[data-metric=visitors]');
 await expect(card).toHaveCSS('background-color','rgb(21, 32, 51)');await expect(card.locator('.overview-card-heading>select')).toHaveCSS('color','rgb(237, 242, 250)');await expect(card.locator('[data-card-period]')).toHaveCSS('background-color','rgb(32, 46, 68)');await expect(card.locator('[data-metric-value]')).toHaveCSS('color','rgb(237, 242, 250)');await expect(card.locator('.overview-count-chart text').first()).toHaveCSS('fill','rgb(169, 184, 207)');await expect(card.locator('.overview-count-chart line').first()).toHaveCSS('stroke','rgb(51, 68, 93)');
 await page.locator('.overview-journey-map').scrollIntoViewIfNeeded();await expect(page.locator('.overview-journey-map')).toHaveCSS('background-color','rgb(21, 32, 51)');await expect(page.locator('.journey-map-centre')).toHaveCSS('background-color','rgb(30, 59, 93)');
 await page.locator('.console-theme-toggle').scrollIntoViewIfNeeded();const geometry=await page.locator('.console-theme-toggle').evaluate(b=>{const r=b.getBoundingClientRect(),s=b.querySelector('svg').getBoundingClientRect(),f=document.querySelector('[data-refresh-data]').getBoundingClientRect();return{dx:s.x+s.width/2-r.x-r.width/2,dy:s.y+s.height/2-r.y-r.height/2,overlap:Math.max(0,Math.min(r.right,f.right)-Math.max(r.left,f.left))*Math.max(0,Math.min(r.bottom,f.bottom)-Math.max(r.top,f.top)),inside:r.left>=0&&r.right<=innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1}});
 expect(Math.abs(geometry.dx)).toBeLessThan(.1);expect(Math.abs(geometry.dy)).toBeLessThan(.1);expect(geometry.inside).toBe(true);expect(geometry.overflow).toBe(false);if(info.project.name==='desktop-chromium')expect(geometry.overlap).toBe(0);
 await card.locator('.overview-card-menu summary').click();await expect(card.locator('.overview-card-menu>div')).toHaveCSS('background-color','rgb(32, 46, 68)');await card.locator('.overview-card-menu summary').click();
 await page.locator('[data-overview-add-card]').click();await expect(page.locator('.overview-add-dialog')).toBeVisible();await expect(page.locator('.overview-add-dialog select').first()).toHaveCSS('background-color','rgb(32, 46, 68)');await expect(page.locator('.overview-add-dialog')).toHaveCSS('color','rgb(237, 242, 250)');await page.getByRole('button',{name:'Cancel',exact:true}).click();
 const contrast=await card.evaluate(c=>{const lum=s=>(s.match(/[\d.]+/g)||[]).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0);const bg=lum(getComputedStyle(c).backgroundColor);return [...c.querySelectorAll('[data-metric-value],.overview-card-secondary,.overview-card-change')].map(n=>{const fg=lum(getComputedStyle(n).color);return(Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05)})});expect(contrast.every(n=>n>=4.5)).toBe(true);
 await page.screenshot({path:info.outputPath('admin-dark.png'),fullPage:false});
});

test('another tab follows the stored preference without resetting it during admin rendering',async({page,context})=>{
 await ready(page);await page.locator('.console-theme-toggle').click();const tab=await context.newPage();await tab.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());await ready(tab);await expect(tab.locator('html')).toHaveAttribute('data-theme','dark');await tab.locator('.console-theme-toggle').click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');await expect(page.locator('.console-theme-toggle use')).toHaveAttribute('href','#icon-sun');await tab.close();
});

test('blocked theme storage leaves a working control and no page errors',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{const get=Storage.prototype.getItem,set=Storage.prototype.setItem;Storage.prototype.getItem=function(k){if(k==='vacancy-theme-v1')throw Error('Synthetic denied theme read');return get.call(this,k)};Storage.prototype.setItem=function(k,v){if(k==='vacancy-theme-v1')throw Error('Synthetic denied theme write');return set.call(this,k,v)}});
 await ready(page);await expect(page.locator('html')).toHaveAttribute('data-theme','light');await page.locator('.console-theme-toggle').click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expect(page.locator('.console-theme-toggle')).toHaveAccessibleName('Use light mode');await page.locator('.console-theme-toggle').click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');expect(errors).toEqual([]);
});
