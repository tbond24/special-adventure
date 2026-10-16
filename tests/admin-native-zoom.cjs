// Genuine Chromium tab zoom, isolated synthetic page only. No hosted targets.
const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),{spawn}=require('node:child_process');
const {openCompletionEditor}=require('./admin-editor-completion-fixture.cjs');
(async()=>{
 if(process.platform!=='linux'||process.env.CI!=='true'||process.env.VACANCY_DISPOSABLE_STACK!=='1')throw Error('Native zoom acceptance requires the reviewed isolated Linux CI workflow');
 const artifacts=path.resolve('work/full-stack-evidence');await fs.mkdir(artifacts,{recursive:true});
 const root=await fs.mkdtemp(path.resolve('work/native-zoom-')),extension=path.join(root,'extension');await fs.mkdir(extension);
 await fs.writeFile(path.join(extension,'manifest.json'),JSON.stringify({manifest_version:3,name:'Vacancy isolated tab zoom acceptance',version:'1.0',permissions:['tabs'],host_permissions:['http://127.0.0.1:8776/*'],background:{service_worker:'worker.js'}}));
 await fs.writeFile(path.join(extension,'worker.js'),'chrome.runtime.onInstalled.addListener(()=>{});');
 let context;const server=spawn(process.execPath,['tests/admin-design-fixture-server.cjs'],{stdio:['ignore','pipe','pipe']});
 try{
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Loopback fixture did not start')),15000);server.stdout.on('data',chunk=>{if(chunk.toString().includes('127.0.0.1:8776')){clearTimeout(timeout);resolve()}});server.once('exit',()=>{clearTimeout(timeout);reject(Error('Loopback fixture exited'))});server.once('error',reject)});
  context=await chromium.launchPersistentContext(path.join(root,'profile'),{executablePath:chromium.executablePath(),headless:true,viewport:null,ignoreDefaultArgs:['--disable-extensions'],args:['--window-size=1536,1100','--disable-extensions-except='+extension,'--load-extension='+extension]});
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker',{timeout:20000});const page=await context.newPage();await openCompletionEditor(page);
  const metrics=()=>page.evaluate(()=>({innerWidth,innerHeight,outerWidth,outerHeight,devicePixelRatio,scrollWidth:document.documentElement.scrollWidth}));
  const before=await metrics();await page.locator('[data-style-field=radius]').fill('13');
  const zoom=await worker.evaluate(async()=>{const tabs=await chrome.tabs.query({url:'http://127.0.0.1:8776/*'});if(tabs.length!==1)throw Error('Expected one isolated local editor tab');await chrome.tabs.setZoomSettings(tabs[0].id,{mode:'automatic',scope:'per-tab'});await chrome.tabs.setZoom(tabs[0].id,2);return chrome.tabs.getZoom(tabs[0].id)});
  expect(zoom).toBe(2);expect(page.viewportSize()).toBe(null);await expect.poll(async()=>Number((await metrics()).devicePixelRatio/before.devicePixelRatio)).toBe(2);
  const after=await metrics();expect(after.outerWidth).toBe(before.outerWidth);expect(Math.abs(after.innerWidth*2-before.innerWidth)).toBeLessThanOrEqual(2);expect(after.scrollWidth).toBeLessThanOrEqual(after.innerWidth+1);
  const navigation=page.getByRole('button',{name:'Open admin navigation'});await expect(navigation).toBeVisible();await navigation.click();await expect(navigation).toHaveAttribute('aria-expanded','true');await expect(page.locator('#adminSectionMenu').getByRole('button',{name:'Reports',exact:true})).toBeVisible();await expect(page.locator('#adminSectionMenu').getByRole('button',{name:'System',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(navigation).toBeFocused();await expect(navigation).toHaveAttribute('aria-expanded','false');
  const radius=page.locator('[data-style-field=radius]');await expect(radius).toHaveValue('13');
  await page.locator('[data-design-target="create-listing/language-selector"]').click();await expect(page.locator('.design-leave-dialog')).toBeVisible();await page.locator('[data-leave-stay]').click();await expect(radius).toHaveValue('13');
  await page.locator('[data-mode=desktop]').click();await expect(page.locator('[data-logical-width]')).toHaveText('1280 px');expect(await page.locator('[data-design-frame]').evaluate(n=>n.style.width)).toBe('1280px');
  const style=page.getByRole('tab',{name:'Style',exact:true});await style.focus();await style.press('End');await expect(page.getByRole('tab',{name:'Advanced',exact:true})).toBeFocused();await page.keyboard.press('Home');
  await page.locator('[data-save-draft]').click();await expect(page.locator('[data-draft-status]')).toContainText('Private draft saved');expect(await page.evaluate(()=>P.drafts['listing-detail/save-button'].config)).toEqual({all:{radius:13}});
  expect(await page.evaluate(()=>__completionActions)).toBe(0);expect(await page.evaluate(()=>P.published)).toBe(0);
  await page.screenshot({path:path.join(artifacts,'editor-native-200-percent.png'),fullPage:true});
  await fs.writeFile(path.join(artifacts,'editor-native-zoom.json'),JSON.stringify({completed:true,environment:'Isolated Chromium full browser, synthetic loopback fixture, no Playwright viewport override',zoomApi:'chrome.tabs.setZoom/getZoom',zoomFactor:zoom,before,after,adminNavigationAndReportsSystem:true,dirtySelectionPreserved:true,keyboardTabs:true,privateSave:true,logicalDesktopWidth:1280,productAndTelemetryWrites:0,publications:0},null,2));
  console.log('PASS native 200% Chromium zoom: real tab factor, unchanged window, reflow, keyboard, dirty navigation, private save and zero product/telemetry actions');
 }finally{await context?.close();server.kill();}
})().catch(error=>{console.error(error.message);process.exitCode=1});
