const {expect}=require('@playwright/test');
const {installPresentationBackend}=require('./presentation-backend-fixture.cjs');
const base='http://127.0.0.1:8776';
exports.openCompletionEditor=async page=>{
 await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
 await page.goto(base+'/__admin-preview');await page.waitForFunction(()=>window.__visualReady===true);
 await installPresentationBackend(page,{preserve:true});
 await page.evaluate(()=>{
  const row={id:'55555555-5555-4555-8555-555555555555',status:'active',rentAmount:25000,monthlyRent:25000,rentCurrency:'KES',rentPeriod:'month',deposit:10000,billsIncluded:false,minimumStayWeeks:8,
   room:{id:'66666666-6666-4666-8666-666666666666',name:'Synthetic public room',roomType:'Room',unitDetails:{},media:[],description:'Synthetic public description remains customer-owned.',furnished:true,ensuite:false,maxOccupants:2},
   property:{id:'77777777-7777-4777-8777-777777777777',suburb:'Synthetic area',city:'Nairobi',country:'Kenya',propertyType:'Shared house',bedrooms:3,bathrooms:2,householdSummary:'',customFeatures:[],parkingSpaces:0,internetAvailable:true},owner:{id:'88888888-8888-4888-8888-888888888888',displayName:'Synthetic member',bio:'',avatarUrl:''}};
  window.__completionActions=0;VACANCY_BACKEND.activeVacancies=async()=>[row];
  for(const name of ['trackEvent','saveVacancy','unsaveVacancy','startEnquiry'])VACANCY_BACKEND[name]=async()=>{window.__completionActions++};
 });
 const nav=page.getByRole('button',{name:'Open admin navigation'});if(await nav.isVisible())await nav.click();
 await page.locator('#adminSectionMenu [data-section=design]').click();await expect(page.locator('.design-board')).toBeVisible();await expect(page.locator('[data-frame-status]')).toContainText('Actual public renderer');
};
exports.selectCompletionTarget=async(page,key)=>{await page.locator('[data-design-target="'+key+'"]').click();await expect(page.locator('.design-element-id code')).toHaveText(key);await expect(page.locator('[data-frame-status]')).toContainText('Actual');};
