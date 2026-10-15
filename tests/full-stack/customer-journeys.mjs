// Disposable Supabase only: real UI, Auth, storage, publication and SQL assertions.
// The only synthetic network behavior is an explicit failed-upload injection.
// No route.fulfill, backend replacement, production endpoints or real users.
import {randomBytes,createHash} from 'node:crypto';
import {expect} from '@playwright/test';

export async function verifyCustomerJourneys(h) {
  const {server,ROOT,key,request,sql,loginUI,context,pass,check,evidence,sensitive,actors,artifacts}=h;
  check(ROOT==='http://127.0.0.1:54321'&&new URL(server.url).hostname==='127.0.0.1',
    'Customer journeys must only run against disposable loopback services');
  const opened=[];
  let stage='confirmed synthetic publisher';
  const publisher={role:'customer publisher',email:'qa-customer@vacancy.invalid',
    password:'Qc1!'+randomBytes(24).toString('base64url')};
  sensitive.add(publisher.password);
  const ready=async p=>p.waitForFunction(()=>typeof booting!=='undefined'&&booting===false);
  const ui=async()=>{const x=await loginUI(publisher);opened.push(x.ctx);return x;};
  const ownCount=async()=>Number(await sql(`select count(*) from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where p.owner_id='${publisher.id}';`));
  const imageBytes=async(form)=>form.evaluate(async node=>{
    const input=node.querySelector('.unit-editor input[type=file]');
    return Promise.all(selectedPhotoFiles(input).map(async f=>({
      name:f.name,size:f.size,hash:[...new Uint8Array(await crypto.subtle.digest('SHA-256',await f.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('')
    })));
  });
  const details=async form=>{
    if(await form.getAttribute('data-journey-step')==='0')await form.locator('.journey-next').click();
    await expect(form).toHaveAttribute('data-journey-step','1');
  };
  const review=async form=>{
    for(let i=0;i<2&&await form.getAttribute('data-journey-step')!=='2';i++)await form.locator('.journey-next').click();
    await expect(form).toHaveAttribute('data-journey-step','2');
  };
  try {
    const created=await request('auth/v1/admin/users',{admin:true,body:{
      email:publisher.email,password:publisher.password,email_confirm:true,
      user_metadata:{display_name:'Synthetic customer'},app_metadata:{vacancy_qa_scope:'disposable-ci'}
    }});
    check(created.ok&&created.data?.id,'Confirmed disposable customer created by local GoTrue');
    publisher.id=created.data.id;actors.push(publisher);
    const first=await ui(),page=first.page;
    await page.goto(server.url+'/#list/new');await ready(page);
    await page.locator('[data-listing-type=Residential]').click();
    await page.locator('[data-preset=Studio]').click();
    await page.getByRole('button',{name:'New property',exact:true}).click();
    const form=page.locator('#listingForm');
    await expect(form).toHaveAttribute('data-journey-step','0');
    stage='existing listing location and details';
    // Enter synthetic coordinates through the app's existing map setter.
    // External geocoding is deliberately not tested or contacted.
    await form.evaluate(node=>{
      for(const [name,value]of Object.entries({country:'Australia',region:'WA',city:'Perth',locality:'Joondalup',address:'Synthetic CI property address'})){
        if(node.elements[name])node.elements[name].value=value;
      }
      const map=node.querySelector('#newPropertyMap');
      if(typeof map?._vacancySetLocation!=='function')throw Error('Original location setter missing');
      map._vacancySetLocation(-31.75,115.77,false);
    });
    await details(form);
    const unit=form.locator('.unit-editor');
    await unit.locator('.unit-name-input').fill('Synthetic unit A');
    await unit.locator('.title-mode-toggle').click();
    await unit.locator('[data-base-name=roomName]').fill('Synthetic customer studio');
    await unit.locator('[data-base-name=description]').fill('Disposable end-to-end creation, photos and edit acceptance.');
    await unit.locator('[data-base-name=rentAmount]').fill('350');
    await unit.locator('[data-base-name=deposit]').fill('700');
    await unit.locator('[data-base-name=rentCurrency]').selectOption('AUD');
    await unit.locator('[data-base-name=rentPeriod]').selectOption('week');
    // Real encoded PNGs created in the browser, not stock photos or fake URLs.
    const pngs=await page.evaluate(()=>['#924a30','#357c62','#415d99'].map(colour=>{
      const c=document.createElement('canvas');c.width=32;c.height=32;
      c.getContext('2d').fillStyle=colour;c.getContext('2d').fillRect(0,0,32,32);
      return c.toDataURL('image/png').split(',')[1];
    }));
    const files=pngs.map((s,i)=>({name:'synthetic-customer-'+(i+1)+'.png',mimeType:'image/png',buffer:Buffer.from(s,'base64')}));
    const expected=files.map(f=>({name:f.name,size:f.buffer.length,hash:createHash('sha256').update(f.buffer).digest('hex')}));
    stage='failed real storage upload preserves selected bytes';
    let failUpload=true,failedUploads=0;
    await first.ctx.route('**/storage/v1/object/listing-draft-media/**',route=>{
      if(failUpload&&['POST','PUT'].includes(route.request().method())){
        failedUploads++;return route.abort('failed');
      }
      return route.fallback();
    });
    await unit.locator('input[type=file]').setInputFiles(files);
    await expect(form.locator('.photo-selection-item')).toHaveCount(3);
    await expect.poll(()=>failedUploads,{timeout:30000}).toBeGreaterThan(0);
    await expect(form.locator('[data-account-draft-status]')).toHaveAttribute('data-save-state','error',{timeout:30000});
    check(JSON.stringify(await imageBytes(form))===JSON.stringify(expected),
      'Failed private upload must retain exact selected image bytes');
    check(await ownCount()===0,'No public listing can exist after private photo upload failure');
    failUpload=false;
    await form.locator('[data-account-draft-retry]').click();
    await expect(form.locator('[data-account-draft-status]')).toHaveAttribute('data-save-state','saved',{timeout:45000});
    const objectName=await sql(`select name from storage.objects where bucket_id='listing-draft-media' and name like '${publisher.id}/%' order by name limit 1;`);
    check(objectName.startsWith(publisher.id+'/'),'Real private photo storage object belongs to publisher');
    const deniedRead=await fetch(ROOT+'/storage/v1/object/listing-draft-media/'+objectName,{headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(10000)});
    check(!deniedRead.ok,'Anonymous caller must not read private draft photo');
    pass('Customer failed real photo upload preserves bytes; retry uploads privately and anonymous read is denied');
    stage='save and exit retains private draft';
    await form.locator('.journey-save-exit').click();
    await expect(page).toHaveURL(/#list$/,{timeout:45000});
    check(await ownCount()===0,'Saving a private draft must not publish');
    await first.ctx.close();opened.splice(opened.indexOf(first.ctx),1);
    const second=await ui(),other=second.page;
    check(await other.evaluate(()=>Object.keys(localStorage).every(k=>!k.startsWith('vacancy-listing-draft'))),
      'Second device starts without first-device local listing drafts');
    await other.goto(server.url+'/#list');await ready(other);
    await expect(other.locator('[data-open-account-draft]')).toHaveCount(1,{timeout:30000});
    await other.locator('[data-open-account-draft]').click();
    const restored=other.locator('#listingForm');
    await expect(restored.locator('.photo-selection-item')).toHaveCount(3,{timeout:30000});
    check(JSON.stringify(await imageBytes(restored))===JSON.stringify(expected),
      'A clean second browser must restore exact private image bytes and order');
    await details(restored);
    await expect(restored.locator('[data-base-name=roomName]')).toHaveValue('Synthetic customer studio');
    await expect(restored.locator('[data-base-name=rentAmount]')).toHaveValue('350');
    pass('Real account Save and exit restores fields and exact photo bytes on a clean second browser with no publication');
    stage='explicit customer publication and public photo rendering';
    await review(restored);
    await restored.locator('.listing-submit-actions .primary').click();
    await expect(other).toHaveURL(/#list$/,{timeout:60000});
    check(await ownCount()===1,'Explicit Publish creates exactly one owned vacancy');
    const published=JSON.parse(await sql(`select json_build_object('id',v.id,'room',r.id,'property',p.id,'status',v.status,'rent',v.rent_amount,'media',(select count(*) from public.media m where m.room_id=r.id and m.status='active')) from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where p.owner_id='${publisher.id}';`));
    check(published.status==='active'&&published.media===3,'Public listing has 3 active uploaded photos');
    const guest=await context();opened.push(guest);const publicPage=await guest.newPage();
    await publicPage.goto(server.url+'/#detail/'+published.id);
    await expect(publicPage.locator('.quiet-intro h1')).toHaveText('Synthetic customer studio');
    const publicPhotos=await publicPage.evaluate(async id=>{
      const row=(await VACANCY_BACKEND.activeVacancies()).find(x=>x.id===id);
      return row?.room?.media?.map(x=>x.url)||[];
    },published.id);
    check(publicPhotos.length===3,'Anonymous joined listing returns three public photo URLs');
    for(const url of publicPhotos){check(new URL(url).origin===ROOT,'All media URLs stay local');const out=await fetch(url,{signal:AbortSignal.timeout(10000)});check(out.ok&&out.headers.get('content-type')?.startsWith('image/'),'Published image bytes are readable');}
    pass('Visible Publish creates one real listing with three retrievable photos and correct anonymous detail title');
    stage='existing customer edit preserves identity and photos';
    await other.goto(server.url+'/#edit/'+published.id);
    const edit=other.locator('#listingForm');
    await expect(edit).toHaveAttribute('data-edit-vacancy',published.id,{timeout:30000});
    await expect(edit.locator('.edit-existing-photo')).toHaveCount(3);
    await details(edit);
    await edit.locator('[data-base-name=roomName]').fill('Synthetic customer studio edited');
    await edit.locator('[data-base-name=description]').fill('Updated through the existing customer editing interface.');
    await edit.locator('[data-base-name=rentAmount]').fill('375');
    await review(edit);
    await edit.locator('.listing-submit-actions .primary').click();
    await expect(other).toHaveURL(/#list$/,{timeout:60000});
    const edited=JSON.parse(await sql(`select json_build_object('id',v.id,'room',r.id,'property',p.id,'rent',v.rent_amount,'name',r.name,'media',(select count(*) from public.media m where m.room_id=r.id and m.status='active')) from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where p.owner_id='${publisher.id}';`));
    check(edited.id===published.id&&edited.room===published.room&&edited.property===published.property&&await ownCount()===1,
      'Edit must preserve listing/room/property identity and not duplicate publication');
    check(Number(edited.rent)===375&&edited.media===3,'Edit changes rent but retains existing photos');
    await publicPage.reload();await expect(publicPage.locator('.quiet-intro h1')).toHaveText('Synthetic customer studio edited');
    pass('Visible customer edit persists new title and rent without duplicating listing or losing uploaded photos');
    await publicPage.setViewportSize({width:390,height:844});
    check(await publicPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Published customer listing has no mobile horizontal overflow');
    await publicPage.screenshot({path:artifacts+'/customer-published-mobile.png'});
    pass('Real newly created and edited customer listing remains usable at mobile viewport');
    stage='password recovery request and invalid-link safety';
    const recoveryCtx=await context();opened.push(recoveryCtx);const recovery=await recoveryCtx.newPage();
    await recovery.goto(server.url+'/#forgot-password');
    await expect(recovery.locator('#recoveryRequest')).toBeVisible();
    await recovery.locator('#recoveryRequest [name=email]').fill(publisher.email);
    const recovered=recovery.waitForResponse(r=>r.url().startsWith(ROOT+'/auth/v1/recover')&&r.request().method()==='POST');
    await recovery.locator('#recoveryRequest button.primary').click();
    check((await recovered).ok(),'Actual local GoTrue accepts the visible password-recovery request');
    await expect(recovery.locator('#recoveryRequest [role=status]')).toContainText('If an account exists');
    check(await sql(`select (recovery_sent_at is not null)::text from auth.users where id='${publisher.id}';`)==='true',
      'Local GoTrue records recovery request for the intended synthetic account');
    check(await recovery.evaluate(()=>VACANCY_BACKEND.session()===null),'Recovery request must not sign in the browser');
    await recovery.goto(server.url+'/#error=access_denied&error_code=otp_expired&type=recovery');
    await expect(recovery.locator('#resetStatus')).toContainText('invalid or expired');
    await expect(recovery.locator('#resetPassword')).toHaveCount(0);
    check(await recovery.evaluate(()=>VACANCY_BACKEND.session()===null),'Invalid reset link must not replace the normal session');
    pass('Actual GoTrue recovery request uses non-enumerating UI; expired-link UI exposes no password form or session');
    evidence.customerJourneys={completed:true,checks:'creation, 3 photos, failed upload/retry, private draft, second-browser restore, explicit publication, edit, mobile, recovery request and invalid link',
      limits:['External geocoding not contacted; synthetic coordinates entered via existing map setter.','Final password reset Edge function and external breach-check/email delivery providers not exercised in this local stack.','Production customer data and settings unchanged.']};
  }catch(error){throw Error('Customer journey phase '+stage+': '+error.message);}
  finally{for(const ctx of opened.reverse())await ctx.close().catch(()=>{});}
}
