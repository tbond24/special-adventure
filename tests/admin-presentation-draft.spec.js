const {test,expect}=require('@playwright/test');
const path=require('path');
const base='http://127.0.0.1:8776';
test.use({trace:'off',screenshot:'off'});
async function start(page,{operator=false}={}){
 await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 await page.route(base+'/brand-test',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><p>DEVELOPMENT · SYNTHETIC PRESENTATION TEST</p><svg class="icon-sprite" style="display:none"><symbol id="icon-find" viewBox="0 0 24 24"><path d="M1 1 L10 10"></path></symbol><symbol id="icon-wifi" viewBox="0 0 24 24"><path d="M2 2 L20 20"></path></symbol></svg><main id="app"><a id="leave" href="#home">Leave</a><div id="adminHost"><section data-admin-section="icons"></section></div></main></body></html>'}));
 await page.goto(base+'/brand-test#admin');
 await require('./presentation-backend-fixture.cjs').installPresentationBackend(page,{operator});
 await page.addScriptTag({url:base+'/src/site-favicon.js'});
 await page.addScriptTag({url:base+'/src/site-icon-library.js'});await page.evaluate(()=>renderAdmin());
 await page.addScriptTag({url:base+'/src/admin-favicon-draft.js'});
 await page.evaluate(async()=>{const host=document.createElement('div');host.dataset.faviconEditor='';document.querySelector('[data-admin-section=icons]').append(host);await mountVacancyFaviconDraft(host);});
 await expect(page.locator('#iconEditor [data-icon-source]')).toBeEnabled();
}
const icon=page=>page.locator('#iconEditor'),fav=page=>page.locator('[data-favicon-editor]');
async function publish(host){await host.locator('[data-brand-save]').click();await expect(host.locator('[data-brand-status]')).toContainText('Private draft saved');await host.locator('[data-brand-review]').click();await host.locator('[data-brand-reason]').fill('Synthetic reviewed presentation');await host.locator('[data-brand-publish]').click();}
const svg=(path='M3 3 L21 21')=>({name:'synthetic.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="'+path+'"/></svg>')});
const png={name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aR1sAAAAASUVORK5CYII=','base64')};

test('icon private preview and private save preserve public sprite; reviewed publish and legacy restore retain history',async({page})=>{
 await start(page);const host=icon(page),original=await page.locator('#icon-find').innerHTML();
 await expect(host.locator('[data-brand-preview] svg')).toHaveCSS('fill','none');
 await host.locator('[data-icon-source]').selectOption('wifi');expect(await page.locator('#icon-find').innerHTML()).toBe(original);
 await publish(host);await expect(host.locator('[data-brand-status]')).toContainText('verified in public settings');expect(await page.locator('#icon-find').innerHTML()).not.toBe(original);
 await host.locator('[data-icon-original]').click();await publish(host);await expect(host.locator('[data-brand-status]')).toContainText('Published revision 2');
 await host.locator('[data-brand-history]').click();await host.locator('[data-brand-restore="legacy-1"]').click();await expect(host.locator('[data-brand-status]')).toContainText('Earlier version copied');
 expect(await page.evaluate(()=>P.published)).toBe(2);await host.locator('[data-brand-reason]').fill('Synthetic legacy restore');await host.locator('[data-brand-publish]').click();await expect(host.locator('[data-brand-status]')).toContainText('Published revision 3');
});
test('SVG normalization rejects scripts and preserves private edits on failed save and target navigation',async({page})=>{
 await start(page);const host=icon(page);await host.locator('[data-icon-upload]').setInputFiles(svg());
 await host.locator('[data-icon-upload]').setInputFiles({name:'unsafe.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg viewBox="0 0 24 24"><script>alert(1)</script></svg>')});await expect(host.locator('[data-brand-status]')).toContainText('Unsupported SVG');
 await page.locator('[data-icon-target=wifi]').click();await expect(host.locator('dialog')).toBeVisible();await host.locator('[data-brand-stay]').click();
 await page.evaluate(()=>P.failSave=true);await host.locator('[data-brand-save]').click();await expect(host.locator('[data-brand-status]')).toContainText('save failure');
 await expect(host.locator('[data-brand-preview] path')).toHaveAttribute('d','M3 3 L21 21');
});
test('catalogue creation remains private until reviewed publication and private draft survives reload',async({page})=>{
 await start(page);const host=page.locator('[data-icon-catalog-draft]');await page.locator('#siteIconLibrary > details').evaluate(n=>n.open=true);
 await host.locator('[data-catalog-label]').fill('Synthetic pool');await host.locator('[data-catalog-file]').setInputFiles(svg());
 await host.locator('[data-brand-save]').click();await expect(host.locator('[data-brand-status]')).toContainText('Private draft saved');expect(await page.evaluate(()=>P.catalog.length)).toBe(2);
 await page.evaluate(async()=>{document.querySelector('#siteIconLibrary').remove();await renderAdmin();});await page.locator('#siteIconLibrary > details').evaluate(n=>n.open=true);
 await expect(host.locator('[data-catalog-label]')).toHaveValue('Synthetic pool');
 await host.locator('[data-brand-review]').click();await host.locator('[data-brand-reason]').fill('Synthetic catalogue publication');await host.locator('[data-brand-publish]').click();await expect(host.locator('[data-brand-status]')).toContainText('verified in public settings');expect(await page.evaluate(()=>P.catalog.length)).toBe(3);
});
test('favicon decodes to 64x64, private preview does not change tab, review/publish/restore is separate',async({page})=>{
 await start(page);const host=fav(page);await host.getByLabel('Choose favicon image').setInputFiles(png);await expect(host.locator('[data-brand-preview] img').first()).toHaveJSProperty('naturalWidth',64);await expect(page.locator('link[data-site-favicon]')).toHaveCount(0);
 await publish(host);await expect(host.locator('[data-brand-status]')).toContainText('verified in public settings');await expect(page.locator('link[data-site-favicon]')).toHaveCount(1);
 await host.locator('[data-brand-history]').click();await host.locator('[data-brand-restore^=legacy]').click();await expect(page.locator('link[data-site-favicon]')).toHaveCount(1);
 await host.locator('[data-brand-reason]').fill('Synthetic favicon restore');await host.locator('[data-brand-publish]').click();await expect(host.locator('[data-brand-status]')).toContainText('Published revision 2');await expect(page.locator('link[data-site-favicon]')).toHaveCount(0);
});
test('Operator drafts both icon and favicon while all publish and restore controls remain denied',async({page})=>{
 await start(page,{operator:true});await icon(page).locator('[data-icon-source]').selectOption('wifi');await icon(page).locator('[data-brand-save]').click();await expect(icon(page).locator('[data-brand-review]')).toBeDisabled();
 await fav(page).getByLabel('Choose favicon image').setInputFiles(png);await fav(page).locator('[data-brand-save]').click();await expect(fav(page).locator('[data-brand-review]')).toBeDisabled();expect(await page.evaluate(()=>P.published)).toBe(0);
});
test('lost acknowledgement reuses request identity; confirmed publication and failed propagation stay distinct',async({page})=>{
 await start(page);const host=icon(page);await host.locator('[data-icon-source]').selectOption('wifi');await page.evaluate(()=>P.lostAck=true);await publish(host);await expect(host.locator('[data-brand-status]')).toContainText('lost acknowledgement');await host.locator('[data-brand-publish]').click();await expect(host.locator('[data-brand-status]')).toContainText('verified in public settings');expect(await page.evaluate(()=>P.published)).toBe(1);
 await fav(page).getByLabel('Choose favicon image').setInputFiles(png);await page.evaluate(()=>P.failPropagation=true);await publish(fav(page));await expect(fav(page).locator('[data-brand-status]')).toContainText('propagation is unverified');
});
test('concurrent editors retain their values; dirty navigation and account change protect private state',async({page})=>{
 await start(page);await icon(page).locator('[data-icon-source]').selectOption('wifi');await fav(page).getByLabel('Choose favicon image').setInputFiles(png);await expect(icon(page).locator('[data-icon-source]')).toHaveValue('wifi');await page.locator('#leave').click();await expect(icon(page).locator('dialog')).toBeVisible();await icon(page).locator('[data-brand-stay]').click();
 await page.evaluate(()=>{currentUser={id:'another-synthetic-account'};document.querySelector('#app').append(document.createElement('p'));});await expect(icon(page)).toBeEmpty();await expect(fav(page)).toBeEmpty();
});
