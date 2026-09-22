const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';
const listing={id:'contact-v1',rentAmount:20000,rentCurrency:'KES',rentPeriod:'month',room:{id:'r1',name:'Studio',roomType:'Studio',media:[],description:''},property:{id:'p1',suburb:'Westlands',city:'Nairobi',country:'Kenya',propertyType:'Apartment',publicLatitude:-1.2,publicLongitude:36.8},owner:{id:'owner',displayName:'Lister'}};
async function boot(page){await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));await page.goto(`${APP}/#home`);await page.waitForFunction(()=>booting===false)}

test('contact choices expose only verified routes',async({page})=>{
  await boot(page);await page.evaluate(async()=>{currentUser={id:'owner',email:'owner@example.com',email_confirmed_at:'2026-01-01'};VACANCY_BACKEND.profile=async()=>({display_name:'Owner',email_confirmed:true,phone_verified:false,enquiry_in_app:true,enquiry_email:true});VACANCY_BACKEND.blockedUsers=async()=>[];VACANCY_BACKEND.adminMembership=async()=>false;await renderAccount()});
  const section=page.locator('#contactPreferences');await expect(section.locator('[name=email]')).toBeChecked();await expect(section.locator('[name=phone]')).toBeDisabled();await expect(section.locator('[name=whatsapp]')).toBeDisabled();
});

test('listing reports accepted routes without exposing private values',async({page})=>{
  await boot(page);await page.evaluate(value=>{vacancies=[value];VACANCY_BACKEND.contactOptions=async()=>({in_app:true,email:true,phone:false,whatsapp:false});renderDetail(value.id)},listing);
  await expect(page.locator('.contact-route-note')).toHaveText('Lister accepts: In-app, Email notification');
  await expect(page.locator('body')).not.toContainText('owner@example.com');
});
