const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

async function boot(page){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);
  await page.waitForFunction(()=>booting===false);
}

test('a failed photo upload does not report success or activate the listing',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{
    currentUser={id:'owner'};
    VACANCY_BACKEND.myProperties=async()=>[];
    VACANCY_BACKEND.myVacancies=async()=>[];
    VACANCY_BACKEND.ownerDashboardMetrics=async()=>({impressions:0,clicks:0,messages:0});
    VACANCY_BACKEND.createListing=async()=> 'new-vacancy';
    VACANCY_BACKEND.listingForEdit=async()=>({propertyId:'property-1'});
    VACANCY_BACKEND.saveUnitListingDetails=async()=>{};
    VACANCY_BACKEND.setPropertyFeatures=async()=>{};
    window.__photoRepair={uploads:0,activations:0};
    VACANCY_BACKEND.uploadListingImages=async()=>{window.__photoRepair.uploads++;throw Error('Storage unavailable')};
    VACANCY_BACKEND.reconfirmVacancy=async()=>{window.__photoRepair.activations++};
    nav('list','new');
  });
  await page.locator('[data-listing-type=House]').click();
  await page.getByRole('button',{name:'New property'}).click();
  await expect(page.locator('#listingForm')).toBeVisible();
  await page.evaluate(()=>{
    const form=document.querySelector('#listingForm');
    form.querySelectorAll('[required]').forEach(input=>{if(input.type==='date')input.value='2026-10-01';else if(input.type==='number')input.value='1';else input.value='Test'});
    form.elements.publicLatitude.value='-1.28';form.elements.publicLongitude.value='36.82';
    const input=form.querySelector('.unit-editor input[type=file]');
    photoSelections.set(input,[1,2,3].map(index=>new File(['photo'],`photo-${index}.jpg`,{type:'image/jpeg'})));
    form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  });
  await expect.poll(()=>page.evaluate(()=>window.__photoRepair.uploads)).toBe(3);
  expect(await page.evaluate(()=>({activations:window.__photoRepair.activations,formPresent:!!document.querySelector('#listingForm')}))).toEqual({activations:0,formPresent:true});
});

test('new photos append after existing photo order',async({page})=>{
  await boot(page);
  const orders=await page.evaluate(async()=>{
    const token=`x.${btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))}.y`;
    localStorage.setItem('vacancy-session-v01',JSON.stringify({access_token:token,refresh_token:'test'}));
    const original=window.fetch,orders=[];let uploads=0;
    window.fetch=async(url,options={})=>{
      const path=String(url);
      if(path.includes('/auth/v1/user'))return new Response(JSON.stringify({id:'owner'}),{status:200});
      if(path.includes('/rest/v1/vacancies?'))return new Response(JSON.stringify([{room_id:'room-1',rooms:{properties:{owner_id:'owner'}}}]),{status:200});
      if(path.includes('/rest/v1/media?'))return new Response(JSON.stringify([{storage_path:'existing-0.jpg',sort_order:0},{storage_path:'existing-1.jpg',sort_order:1},{storage_path:'existing-2.jpg',sort_order:2}]),{status:200});
      if(path.endsWith('/rest/v1/media')&&options.method==='POST'){orders.push(JSON.parse(options.body).sort_order);return new Response(JSON.stringify([{id:'new'}]),{status:201})}
      if(path.includes('/storage/v1/object/room-media/')){
        if(options.method==='POST'&&++uploads===1)return new Response('Already exists',{status:400});
        return new Response('{}',{status:200});
      }
      return original(url,options);
    };
    try{await VACANCY_BACKEND.uploadListingImages('vacancy-1',[new File(['a'],'a.jpg',{type:'image/jpeg'}),new File(['b'],'b.jpg',{type:'image/jpeg'})],'upload-key');return orders}
    finally{window.fetch=original;localStorage.removeItem('vacancy-session-v01')}
  });
  expect(orders).toEqual([3,4]);
});

test('removed media is absent from public listing images',async({page})=>{
  await boot(page);
  const media=await page.evaluate(async()=>{
    const original=window.fetch;
    window.fetch=async(url,options)=>String(url).includes('/rest/v1/vacancies?')?
      new Response(JSON.stringify([{id:'vacancy-1',rooms:{id:'room-1',media:[{id:'keep',status:'active',sort_order:0,storage_path:'keep.jpg'},{id:'remove',status:'removed',sort_order:1,storage_path:'remove.jpg'}],properties:{id:'property-1',owner_id:'owner',profiles:null}}}]),{status:200}):original(url,options);
    try{return (await VACANCY_BACKEND.activeVacancies())[0].room.media.map(item=>item.id)}finally{window.fetch=original}
  });
  expect(media).toEqual(['keep']);
});
