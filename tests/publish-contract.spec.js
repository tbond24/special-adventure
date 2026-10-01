const {test,expect}=require('@playwright/test');
const APP_URL=process.env.VACANCY_E2E_URL;

test('listing edit sends the complete RPC signature even without a market-code field',async({page})=>{
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  let sent;
  await page.route('**/rest/v1/rpc/update_vacancy_listing_v2',route=>{
    sent=route.request().postDataJSON();
    return route.fulfill({status:200,contentType:'application/json',body:'"listing-id"'});
  });
  await page.goto(`${APP_URL}/#home`);
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(()=>VACANCY_BACKEND.updateListing('listing-id',{
    locality:'Kilimani',city:'Nairobi',region:'Nairobi',postal:'',landmark:'',country:'Kenya',address:'Private address',propertyType:'Apartment',household:'',roomName:'Studio',unitType:'Studio',furnished:null,ensuite:null,description:'',rentAmount:18000,rentCurrency:'KES',rentPeriod:'month',deposit:'',billsIncluded:false,availableFrom:'',minimumStayWeeks:'',parkingSpaces:0,maxOccupants:1,petsConsidered:false,smokingAllowed:false,waterAvailable:false,electricityAvailable:true,securityAvailable:false,internetAvailable:false
  }));
  expect(sent.p_market_code).toBe('KE');
  expect(Object.keys(sent).sort()).toEqual(['p_vacancy_id','p_locality','p_city','p_region','p_postal','p_landmark','p_country','p_market_code','p_address_line','p_property_type','p_household_summary','p_unit_name','p_unit_type','p_furnished','p_ensuite','p_unit_description','p_rent_amount','p_rent_currency','p_rent_period','p_deposit','p_bills_included','p_available_from','p_minimum_stay_weeks','p_parking_spaces','p_max_occupants','p_pets_considered','p_smoking_allowed','p_water_available','p_electricity_available','p_security_available','p_internet_available'].sort());
});
