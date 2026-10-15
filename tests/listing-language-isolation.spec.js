const {test,expect}=require('@playwright/test');
const {createCloud,install,owner}=require('../qa/account-drafts/synthetic-cloud.cjs');
test('actual nested Edit renderer and Create preserve separate language preferences and form values',async({page,context})=>{
 const cloud=createCloud(),id='00000000-0000-4000-8000-000000007001';
 cloud.editListings.set(id,{id,roomId:'00000000-0000-4000-8000-000000007002',propertyId:'00000000-0000-4000-8000-000000007003',privateName:'Synthetic language listing',roomName:'Language studio',unitType:'Studio',description:'Synthetic edit fixture',rentAmount:22000,rentCurrency:'KES',rentPeriod:'month',deposit:0,availableFrom:'',minimumStayWeeks:'',maxOccupants:1,unitDetails:{},locality:'Westlands',city:'Nairobi',region:'Nairobi',country:'Kenya',marketCode:'KE',address:'Synthetic Garden Road',propertyType:'Apartment',publicLatitude:-1.26,publicLongitude:36.8,parkingSpaces:0,media:[]});
 await install(context,cloud,{signedIn:owner});await context.addInitScript(()=>{if(!localStorage.getItem('language-test-seeded')){localStorage.setItem('vacancy-listing-language','sw');localStorage.setItem('language-test-seeded','yes')}});
 await page.goto('/#list/new');const picker=page.getByLabel('Listing language');await expect(picker).toHaveValue('sw');await picker.selectOption('fr');
 await page.goto('/#edit/'+id);await expect(page.locator('#listingForm')).toHaveAttribute('data-edit-vacancy',id);await expect(page.locator('#listingHost')).toHaveAttribute('data-language-page','edit');await expect(picker).toHaveValue('sw');await picker.selectOption('zh');
 await expect(page.locator('[data-base-name=rentAmount]')).toHaveValue('22000');await expect(page.locator('[data-base-name=rentCurrency]')).toHaveValue('KES');
 await page.goto('/#list/new');await expect(picker).toHaveValue('fr');await page.goto('/#edit/'+id);await expect(picker).toHaveValue('zh');
 expect(await page.evaluate(()=>localStorage.getItem('vacancy-listing-language'))).toBe('sw');expect(cloud.publicWrites).toEqual([]);
});
