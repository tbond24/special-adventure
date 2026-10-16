const {test,expect}=require('@playwright/test');
const {openCompletionEditor,selectCompletionTarget:select}=require('./admin-editor-completion-fixture.cjs');
test.use({trace:'off'});test.beforeEach(async({page})=>openCompletionEditor(page));
test('page tree expands, searches and restores selection with one keyboard entry',async({page})=>{
 const tree=page.locator('[data-design-tree]'),parent=tree.locator('[data-tree-page="listing-detail"]'),save=tree.locator('[data-design-target="listing-detail/save-button"]');
 await expect(parent).toHaveAttribute('aria-expanded','true');await parent.focus();await parent.press('ArrowLeft');await expect(save).toBeHidden();await expect(page.locator('.design-element-id code')).toHaveText('listing-detail/save-button');
 await page.locator('[data-tree-search]').fill('Share');await expect(parent).toHaveAttribute('aria-expanded','true');await expect(tree.locator('[data-design-target]')).toHaveCount(1);
 await page.locator('[data-tree-search]').fill('');await page.locator('[data-select-preview]').click();await expect(save).toBeFocused();
 expect(await tree.locator('[tabindex="0"]').count()).toBe(1);await save.press('ArrowLeft');await expect(parent).toBeFocused();await parent.press('ArrowRight');await expect(save).toBeFocused();
});
test('keyboard focus movement does not select or discard a private draft',async({page})=>{
 await page.locator('[data-style-field=radius]').fill('13');const save=page.locator('[data-design-target="listing-detail/save-button"]');await save.focus();await save.press('ArrowDown');
 await expect(page.locator('.design-element-id code')).toHaveText('listing-detail/save-button');await expect(page.locator('.design-leave-dialog')).not.toBeVisible();
 await page.keyboard.press('Enter');await expect(page.locator('.design-leave-dialog')).toBeVisible();await page.locator('[data-leave-stay]').click();await expect(page.locator('[data-style-field=radius]')).toHaveValue('13');
 await save.focus();await save.press('End');await expect(page.locator('[data-design-target="edit-listing/language-selector"]')).toBeFocused();
});
test('tabs and viewport scopes preserve invalid typing until explicitly corrected',async({page})=>{
 const radius=page.locator('[data-style-field=radius]');await radius.fill('99');const style=page.getByRole('tab',{name:'Style',exact:true});await style.focus();await style.press('ArrowRight');
 await expect(page.getByRole('tab',{name:'Content',exact:true})).toHaveAttribute('aria-selected','true');await page.keyboard.press('Home');await expect(radius).toHaveValue('99');
 await page.locator('[data-edit-scope]').selectOption('mobile');await expect(radius).toHaveValue('');await page.locator('[data-style-field=background]').fill('invalid');await page.locator('[data-reset-scope]').click();
 await expect(page.locator('[data-save-draft]')).toBeDisabled();await page.locator('[data-edit-scope]').selectOption('all');await expect(radius).toHaveValue('99');await radius.fill('12');await expect(page.locator('[data-save-draft]')).toBeEnabled();
 await page.locator('[data-save-draft]').click();await expect(page.locator('[data-draft-status]')).toContainText('Private draft saved');expect(await page.evaluate(()=>P.drafts['listing-detail/save-button'].config)).toEqual({all:{radius:12}});
});
test('four approved style targets use real inert Search, card, Back and Share bindings',async({page})=>{
 const targets={'find/search-button':'#searchBtn','find/listing-card':'.listing-card','listing-detail/back-button':'.quiet-back','listing-detail/share-button':'.quiet-share'};
 for(const [key,selector]of Object.entries(targets)){await select(page,key);await expect(page.frameLocator('[data-design-frame]').locator(selector)).toHaveCount(1);await expect(page.locator('[data-design-frame]')).toHaveAttribute('sandbox','');const source=await page.locator('[data-design-frame]').getAttribute('srcdoc');expect(source).not.toContain('<script');}
 expect(await page.evaluate(()=>__completionActions)).toBe(0);await expect(page).toHaveURL(/#admin$/);
});
test('card frame cannot constrain price content and publishes only allowed spacing',async({page})=>{
 await select(page,'find/listing-card');for(const key of ['width','height','opacity','colour'])await expect(page.locator('[data-style-field="'+key+'"]')).toHaveCount(0);
 await page.locator('[data-style-field=padding_top]').fill('16');await page.locator('[data-style-field=radius]').fill('14');await page.locator('[data-save-draft]').click();await expect(page.locator('[data-draft-status]')).toContainText('Private draft saved');
 expect(await page.evaluate(()=>P.current['find/listing-card'])).toBeUndefined();expect(await page.evaluate(()=>P.drafts['find/listing-card'].config)).toEqual({all:{padding_top:16,radius:14}});
 await expect(page.frameLocator('[data-design-frame]').locator('.listing-price')).toBeVisible();
});
test('English headings use plain text and leave customer content unchanged',async({page})=>{
 await select(page,'listing-detail/about-heading');const input=page.getByRole('textbox',{name:'English heading'});await expect(page.locator('[data-edit-scope]')).toBeDisabled();await input.fill('About & details');
 await expect(page.frameLocator('[data-design-frame]').locator('.quiet-description > h2')).toHaveText('About & details');await expect(page.frameLocator('[data-design-frame]').locator('.quiet-description-preview')).toHaveText('Synthetic public description remains customer-owned.');
 await input.fill('<img src=x>');await expect(page.locator('[data-save-draft]')).toBeDisabled();await expect(input).toHaveAttribute('aria-invalid','true');await input.fill('About & details');await page.locator('[data-save-draft]').click();
 await expect(page.locator('[data-draft-status]')).toContainText('Private draft saved');await select(page,'listing-detail/features-heading');await expect(page.getByRole('textbox',{name:'English heading'})).toHaveValue('');
});
test('copy publication, fresh public resolution and compiled-default restore remain reviewed',async({page})=>{
 await select(page,'listing-detail/features-heading');await page.getByRole('textbox',{name:'English heading'}).fill('Included features');await page.locator('[data-save-draft]').click();await expect(page.locator('[data-draft-status]')).toContainText('Private draft saved');
 await page.locator('[data-review]').click();await page.locator('[data-publish-reason]').fill('Synthetic approved English heading');await page.locator('[data-confirm-publish]').click();await expect(page.locator('[data-draft-status]')).toContainText('verified by the public settings read');
 expect(await page.evaluate(()=>VACANCY_SITE_APPEARANCE.textFor('listing-detail/features-heading'))).toBe('Included features');await page.getByRole('tab',{name:'Advanced',exact:true}).click();await page.locator('[data-code-defaults]').click();
 expect(await page.evaluate(()=>P.current['listing-detail/features-heading'].config.all.text)).toBe('Included features');await page.getByRole('tab',{name:'Content',exact:true}).click();await expect(page.getByRole('textbox',{name:'English heading'})).toHaveValue('');
});
