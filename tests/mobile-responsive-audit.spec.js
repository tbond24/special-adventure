const { test, expect } = require('@playwright/test');

const APP_URL=process.env.VACANCY_E2E_URL || 'https://vacancy-60kkafy7v-tbond24s-projects.vercel.app';

async function audit(page,name){
  await page.waitForTimeout(80);
  const result=await page.evaluate(()=>{
    window.scrollTo(10000,window.scrollY);
    const overflow=[...document.querySelectorAll('body *')].filter(node=>{
      if(node.closest('.leaflet-pane,.card-rail.card-view'))return false;
      const style=getComputedStyle(node),rect=node.getBoundingClientRect();
      return style.display!=='none'&&style.visibility!=='hidden'&&(rect.left < -1 || rect.right > innerWidth+1);
    }).slice(0,8).map(node=>({tag:node.tagName,id:node.id,classes:node.className?.baseVal||node.className,left:Math.round(node.getBoundingClientRect().left),right:Math.round(node.getBoundingClientRect().right)}));
    const rgb=value=>{const match=value.match(/[\d.]+/g);if(!match)return[];const values=match.map(Number);if(value.startsWith('color(srgb'))values.splice(0,3,...values.slice(0,3).map(channel=>channel*255));return values};
    const luminance=values=>{const channels=values.slice(0,3).map(value=>{const v=value/255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});return .2126*channels[0]+.7152*channels[1]+.0722*channels[2]};
    const unreadableControls=[...document.querySelectorAll('button,a,input,select,textarea,summary')].filter(node=>{
      const style=getComputedStyle(node),rect=node.getBoundingClientRect();
      if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)<.5||rect.width<1||rect.height<1)return false;
      const foreground=rgb(style.color),background=rgb(style.backgroundColor);
      if(foreground.length<3||(foreground[3]??1)<.5)return true;
      if(background.length<3||(background[3]??1)<.9)return false;
      const light=Math.max(luminance(foreground),luminance(background)),dark=Math.min(luminance(foreground),luminance(background));
      return (light+.05)/(dark+.05)<2;
    }).slice(0,8).map(node=>({tag:node.tagName,id:node.id,text:(node.textContent||node.getAttribute('aria-label')||'').trim().slice(0,40)}));
    return {fitsDocument:document.documentElement.scrollWidth<=innerWidth+1,fitsBody:document.body.scrollWidth<=innerWidth+1,scrollX,overflow,unreadableControls};
  });
  expect(result,`${name}: containment or control-contrast failure`).toEqual({fitsDocument:true,fitsBody:true,scrollX:0,overflow:[],unreadableControls:[]});
}

test('every page remains contained and readable across themes and viewports',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('vacancy-market-v1','KE'));
  await page.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await expect(page.locator('.explore-card')).toHaveCount(3,{timeout:15000});

  for(const width of [1280,390,320]){
    await page.setViewportSize({width,height:width>820?900:844});
    await page.evaluate(()=>{currentUser={id:'mobile-user',email:'mobile.user.with.a.long.address@example.com'};saved=new Set(vacancies[0]?[vacancies[0].id]:[])});
    const firstId=await page.evaluate(()=>vacancies[0]?.id);
    const screens=[
      ['home-cards',()=>page.evaluate(()=>{discoveryView='cards';renderHome()})],
      ['home-list',()=>page.evaluate(()=>{discoveryView='list';renderHome()})],
      ['detail',()=>page.evaluate(id=>renderDetail(id),firstId)],
      ['auth',()=>page.evaluate(()=>{currentUser=null;renderAuth()})],
      ['forgot-password',()=>page.evaluate(()=>VACANCY_RECOVERY.renderRequest())],
      ['invalid-reset',()=>page.evaluate(()=>VACANCY_RECOVERY.renderReset())],
      ['saved',()=>page.evaluate(()=>{currentUser={id:'mobile-user',email:'mobile@example.com'};saved=new Set(vacancies[0]?[vacancies[0].id]:[]);renderSaved()})],
      ['enquiry',()=>page.evaluate(id=>{currentUser={id:'mobile-user'};renderEnquire(id)},firstId)],
      ['messages',()=>page.evaluate(async()=>{currentUser={id:'mobile-user'};route={name:'messages'};VACANCY_BACKEND.conversations=async()=>[{id:'conversation-one',requested_move_in:'2026-10-01',stay_weeks:12,renter_intro:'I need a quiet room near work.',vacancies:{rooms:{name:'Kasarani Bedsitter',properties:{suburb:'Kasarani',owner_id:'owner-one'}}},messages:[{id:'message-one',sender_id:'owner-one',body:'The room is still available.',created_at:'2026-09-07'}]}];await renderMessages();stopMessagesPolling()})],
      ['new-listing',()=>page.evaluate(async()=>{currentUser={id:'mobile-user'};VACANCY_BACKEND.myProperties=async()=>[];VACANCY_BACKEND.myVacancies=async()=>[];await renderList()})],
      ['edit-listing',()=>page.evaluate(async()=>{currentUser={id:'mobile-user'};VACANCY_BACKEND.listingForEdit=async()=>({id:'v1',roomId:'r1',propertyId:'p1',region:'Nairobi County',city:'Nairobi',locality:'Kasarani',landmark:'Near university',postal:'00100',marketCode:'KE',country:'Kenya',address:'Private address',publicLatitude:-1.22,publicLongitude:36.89,propertyType:'Apartment',parkingSpaces:1,waterAvailable:true,electricityAvailable:true,securityAvailable:true,internetAvailable:true,smokingAllowed:false,petsConsidered:false,household:'Quiet managed property',unitType:'Bedsitter',roomName:'Kasarani Bedsitter',rentAmount:12000,rentCurrency:'KES',rentPeriod:'month',deposit:12000,availableFrom:'2026-10-01',minimumStayWeeks:8,maxOccupants:1,furnished:false,ensuite:true,billsIncluded:false,smokingAllowedOverride:null,petsConsideredOverride:null,description:'Bright room near transport.'});await renderEdit('v1')})],
      ['account',()=>page.evaluate(()=>{currentUser={id:'mobile-user',email:'mobile.user.with.a.long.address@example.com'};renderAccount()})],
      ['admin',()=>page.evaluate(async()=>{currentUser={id:'admin-user',email:'admin@example.com'};VACANCY_BACKEND.adminOverview=async()=>({users:1234,messages:5678});VACANCY_BACKEND.adminVacancies=async()=>[{id:'listing-one',status:'active',confirmed_at:'2026-09-01T00:00:00Z',expires_at:'2026-09-30T00:00:00Z',rooms:{name:'Long but realistic two bedroom listing name',unit_type:'2 Bedroom',properties:{suburb:'Kasarani',city:'Nairobi'}}}];VACANCY_BACKEND.adminReports=async()=>[{id:'report-one',reason:'The address appears to be inaccurate',status:'open',vacancy_id:'listing-one',created_at:'2026-09-07T00:00:00Z'}];await renderAdmin()})]
    ];
    for(const theme of ['dark','light']){
      await page.evaluate(value=>setVacancyTheme(value),theme);
      for(const [name,render] of screens){await render();await audit(page,`${theme} ${width}px ${name}`)}
    }
  }
});
