// Genuine deployed browser -> managed API -> persisted data. No RPC/DTO mocks.
import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ROOT,check} from '../hosted-admin/support.mjs';
export async function frontendAcceptance({actors,radius,dir,pass,key,bootstrap,request,rpc,barrier}){
  const lab=JSON.parse(await readFile(new URL('lab.json',dir),'utf8'));
  check(/^https:\/\/vacancy-admin-recovery-lab-20261015-[a-z0-9]+-tbond24s-projects\.vercel\.app$/.test(lab.url)&&/^dpl_[A-Za-z0-9]+$/.test(lab.deployment)&&/^[a-f0-9]{40}$/.test(lab.source),'Only pinned lab deployment allowed');
  const browser=await chromium.launch(),opened=[],samples=[],blocked=new Set();
  const lister=actors.find(a=>a.role==='lister'),renter=actors.find(a=>a.role==='renter');
  const owner=actors.find(a=>a.role==='owner');let published;
  const secrets=[lab.secret,lab.shareableUrl,key,...actors.flatMap(a=>[a.password,a.email,a.session.access_token,a.session.refresh_token])];
  const context=async()=>{
    const ctx=await browser.newContext({viewport:{width:1536,height:1024},serviceWorkers:'block'});opened.push(ctx);
    check(new URL(lab.shareableUrl).origin===lab.url,'Isolated access link');
    const access=await ctx.request.get(lab.shareableUrl,{maxRedirects:0});check(access.status()===307,'Short-lived protected lab cookie');
    await ctx.route('**/*',async route=>{
      const origin=new URL(route.request().url()).origin;
      if(origin===lab.url)return route.continue();
      if(origin===ROOT)return route.continue();
      blocked.add(origin);return route.abort();
    });return ctx;
  };
  const ui=async actor=>{
    const ctx=await context(),page=await ctx.newPage();await page.goto(lab.url+'/#auth');
    await expect(page.locator('#authUnified')).toBeVisible();
    await page.locator('#authUnified [name=email]').fill(actor.email);
    await page.locator('#authUnified [name=password]').fill(actor.password);
    await page.locator('#authUnified .primary').click();await expect(page).toHaveURL(/#home$/,{timeout:30000});
    await expect.poll(()=>page.evaluate(()=>currentUser?.id)).toBe(actor.id);return {ctx,page};
  };
  const ready=p=>p.waitForFunction(()=>typeof booting!=='undefined'&&!booting);
  const details=async form=>{if(await form.getAttribute('data-journey-step')==='0')await form.locator('.journey-next').click();await expect(form).toHaveAttribute('data-journey-step','1');};
  const review=async form=>{for(let i=0;i<2&&await form.getAttribute('data-journey-step')!=='2';i++)await form.locator('.journey-next').click();await expect(form).toHaveAttribute('data-journey-step','2');};
  try{
    const guest=await context(),publicPage=await guest.newPage();
    await publicPage.goto(lab.url+'/#home');await ready(publicPage);
    const delivered=await publicPage.evaluate(async()=>{
      const r=await fetch('/src/backend.js');return {source:await r.text(),csp:r.headers.get('content-security-policy')};
    });
    check(delivered.source.includes(ROOT)&&!delivered.source.includes('xtutkwiivqkgkqjpkxvj'),'Delivered backend is isolated');
    check(delivered.csp?.includes(ROOT)&&!delivered.csp.includes('xtutkwi'),'Delivered CSP restricts backend');
    const manifest=await publicPage.evaluate(async()=>{const r=await fetch('/qa-source-manifest.json');return r.json();});
    check(manifest.testProject==='raauicmfyjpcuhfzknak'&&manifest.source===lab.source,'Exact delivered source');
    for(const file of manifest.files.filter(f=>/\.(js|mjs|css|html)$/.test(f.path))){
      const actual=await publicPage.evaluate(async p=>{const r=await fetch('/'+p);return {ok:r.ok,bytes:Array.from(new Uint8Array(await r.arrayBuffer()))};},file.path);
      check(actual.ok&&createHash('sha256').update(Buffer.from(actual.bytes)).digest('hex')===file.sha256,'Delivered file hash '+file.path);
    }
    pass('Hosted lab delivered source hashes and CSP verify exact isolated bundle');
    const first=await ui(lister),page=first.page;
    await page.goto(lab.url+'/#list/new');await ready(page);
    await page.locator('[data-listing-type=Residential]').click();await page.locator('[data-preset=Studio]').click();
    await page.getByRole('button',{name:'New property',exact:true}).click();const form=page.locator('#listingForm');
    await expect(form).toHaveAttribute('data-journey-step','0');
    await form.evaluate(node=>{
      for(const [name,value]of Object.entries({country:'Australia',region:'WA',city:'Perth',locality:'Joondalup',address:'Synthetic hosted property'}))if(node.elements[name])node.elements[name].value=value;
      node.querySelector('#newPropertyMap')._vacancySetLocation(-31.75,115.77,false);
    });await details(form);
    const unit=form.locator('.unit-editor');await unit.locator('.unit-name-input').fill('Synthetic hosted unit');
    await unit.locator('.title-mode-toggle').click();await unit.locator('[data-base-name=roomName]').fill('Synthetic hosted studio');
    await unit.locator('[data-base-name=description]').fill('Synthetic isolated hosted acceptance listing.');
    await unit.locator('[data-base-name=rentAmount]').fill('350');await unit.locator('[data-base-name=deposit]').fill('700');
    await unit.locator('[data-base-name=rentCurrency]').selectOption('AUD');await unit.locator('[data-base-name=rentPeriod]').selectOption('week');
    const pngs=await page.evaluate(()=>['#924a30','#357c62','#415d99'].map(colour=>{const c=document.createElement('canvas');c.width=32;c.height=32;c.getContext('2d').fillStyle=colour;c.getContext('2d').fillRect(0,0,32,32);return c.toDataURL('image/png').split(',')[1];}));
    await unit.locator('input[type=file]').setInputFiles(pngs.map((p,i)=>({name:'hosted-'+i+'.png',mimeType:'image/png',buffer:Buffer.from(p,'base64')})));
    await expect(form.locator('.photo-selection-item')).toHaveCount(3);
    await expect(form.locator('[data-account-draft-status]')).toHaveAttribute('data-save-state','saved',{timeout:60000});
    const drafts=await request('rest/v1/listing_drafts?select=id',{token:lister.session.access_token,method:'GET'});
    check(drafts.ok&&drafts.data.length===1,'Real managed private account draft');
    await form.locator('.journey-save-exit').click();await expect(page).toHaveURL(/#list$/,{timeout:45000});
    const second=await ui(lister),other=second.page;await other.goto(lab.url+'/#list');await ready(other);
    await expect(other.locator('[data-open-account-draft]')).toHaveCount(1,{timeout:30000});await other.locator('[data-open-account-draft]').click();
    const restored=other.locator('#listingForm');await expect(restored.locator('.photo-selection-item')).toHaveCount(3,{timeout:30000});
    await details(restored);await expect(restored.locator('[data-base-name=roomName]')).toHaveValue('Synthetic hosted studio');
    pass('Managed private draft and three real photos restore on clean second browser');
    await review(restored);await restored.locator('.listing-submit-actions .primary').click();await expect(other).toHaveURL(/#list$/,{timeout:60000});
    published=await other.evaluate(async()=>{const rows=await VACANCY_BACKEND.myVacancies();return rows[0];});
    check(published?.id,'Real managed publication');
    await writeFile(new URL('customer-fixture.json',dir),JSON.stringify({run:JSON.parse(await readFile(new URL('window.json',dir),'utf8')).run,id:published.id}));
    await publicPage.goto(lab.url+'/#detail/'+published.id);await expect(publicPage.locator('.quiet-intro h1')).toHaveText('Synthetic hosted studio');
    const row=await publicPage.evaluate(async id=>(await VACANCY_BACKEND.activeVacancies()).find(x=>x.id===id),published.id);
    check(row?.room.media.length===3,'Managed join has three public photos');
    for(const media of row.room.media){check(new URL(media.url).origin===ROOT,'Test media origin');const r=await fetch(media.url);check(r.ok,'Managed photo bytes');}
    await other.goto(lab.url+'/#edit/'+published.id);const edit=other.locator('#listingForm');await expect(edit).toHaveAttribute('data-edit-vacancy',published.id,{timeout:30000});
    await expect(edit.locator('.edit-existing-photo')).toHaveCount(3);await details(edit);
    await edit.locator('[data-base-name=roomName]').fill('Synthetic hosted studio edited');await edit.locator('[data-base-name=rentAmount]').fill('375');
    await review(edit);await edit.locator('.listing-submit-actions .primary').click();await expect(other).toHaveURL(/#list$/,{timeout:60000});
    const edited=await other.evaluate(async id=>VACANCY_BACKEND.listingForEdit(id),published.id);
    check(edited.rentAmount===375&&edited.media.length===3,'Managed edit preserves photos');
    await publicPage.reload();await expect(publicPage.locator('.quiet-intro h1')).toHaveText('Synthetic hosted studio edited');
    check(await publicPage.locator('.quiet-save').evaluate(x=>getComputedStyle(x).borderRadius)==='17px','Published appearance reaches actual detail renderer');
    await publicPage.setViewportSize({width:390,height:844});check(await publicPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Hosted mobile no overflow');
    await publicPage.screenshot({path:fileURLToPath(new URL('customer-mobile.png',dir))});
    pass('Hosted customer create/publish/edit, three actual public photo downloads and mobile rendering');
    const html=await publicPage.evaluate(async id=>{const r=await fetch('/listings/'+id);return {status:r.status,text:await r.text()};},published.id);
    check(html.status===200&&html.text.includes('Studio in Joondalup')&&html.text.includes('AUD 375/week'),'Actual deployed listing server function');
    pass('Hosted clean listing URL executes actual server function against managed data');
    const adminCtx=await context();
    // Reuse the genuinely issued managed AAL2 session; no fabricated JWT or API replacement.
    await adminCtx.addInitScript(s=>localStorage.setItem('vacancy-session-v01',JSON.stringify(s)),owner.session);
    const admin=await adminCtx.newPage();await admin.goto(lab.url+'/#admin');await expect(admin.locator('#adminHost')).toBeVisible({timeout:30000});
    await admin.locator('#adminSectionMenu [data-section=design]').click();
    await expect(admin.locator('[data-frame-status]')).toContainText('Actual public renderer',{timeout:30000});
    const keys=await admin.evaluate(()=>VACANCY_ADMIN_DESIGN_REGISTRY.pages.flatMap(p=>p.elements.map(e=>e.key)));
    check(keys.includes('create-listing/language-selector')&&keys.includes('edit-listing/language-selector')&&keys.includes('find/search-button')&&keys.includes('listing-detail/about-heading'),'Approved separate editor targets');
    for(const k of keys){const state=await rpc('admin_appearance_state',owner,{p_element_key:k});check(state.ok,'Managed editor target '+k);}
    const sandbox=await admin.locator('[data-design-frame]').getAttribute('sandbox').catch(()=>null);
    check(sandbox!==null&&!sandbox.includes('allow-scripts')&&!sandbox.includes('allow-same-origin'),'Hosted preview sandbox closure');
    pass('Hosted actual admin route, approved Create/Edit/Find/detail targets and script-free preview sandbox');
    const from=new Date(Date.now()-86400000).toISOString(),to=new Date(Date.now()+1000).toISOString();
    const report=await rpc('admin_connected_journeys',owner,{p_from:from,p_to:to});check(report.ok,'Real managed connected report');
    const renters=await rpc('admin_renter_journeys',owner,{p_from:from,p_to:to});
    check(renters.ok&&renters.data.complete===false&&renters.data.retentionDays===30&&!('searches'in renters.data),'Renter disabled means unavailable');
    const disabled=await rpc('record_renter_journey',renter,{p_events:[],p_notice_version:'test-disabled'});check(disabled.ok&&disabled.data===0,'Renter off rejects collection');
    for(const name of ['record_lister_journey','record_lister_journey_v2']){
      const body={p_events:[{event_id:randomUUID(),visitor_id:randomUUID(),session_id:randomUUID(),event_name:'lister_session_started',route:name.endsWith('_v2')?'create':'#list/new'}]};
      const one=await rpc(name,lister,body),two=await rpc(name,lister,body);check(one.ok&&one.data===1&&two.ok&&two.data===0,'Compatible ingestion idempotency '+name);
      const invalid=await rpc(name,lister,{p_events:[{...body.p_events[0],event_id:randomUUID(),email:'forbidden@example.test'}]});check(!invalid.ok&&invalid.data.code==='22023','PII rejection '+name);
    }
    pass('Hosted compatible v1/v2 ingestion, replay deduplication, PII rejection and disabled renter reporting');
    const recovery=await bootstrap('recovery',renter),verified=await request('auth/v1/verify',{body:{type:'recovery',token_hash:recovery.token_hash}});
    check(verified.ok&&verified.data.access_token,'Genuine managed recovery OTP');
    const resetCtx=await context(),reset=await resetCtx.newPage(),session=verified.data;
    await reset.goto(lab.url+'/#'+new URLSearchParams({access_token:session.access_token,refresh_token:session.refresh_token,expires_in:String(session.expires_in),token_type:'bearer',type:'recovery'}));
    await expect(reset.locator('#resetPassword')).toBeVisible({timeout:30000});
    check(await reset.evaluate(()=>location.hash==='#reset-password'&&!VACANCY_BACKEND.session()),'Managed callback scrubbed and signed out');
    const next='Qr2!'+randomBytes(28).toString('base64url');
    secrets.push(next,session.access_token,session.refresh_token,recovery.token_hash);
    await reset.locator('#resetPassword [name=password]').fill(next);await reset.locator('#resetPassword [name=confirmation]').fill(next);
    const response=reset.waitForResponse(r=>r.url()===ROOT+'/functions/v1/secure-password-reset'&&r.request().method()==='POST');
    await reset.locator('#resetPassword button[type=submit]').click();const changed=await response;
    check(changed.status()===200,'Frozen managed reset Edge HTTP '+changed.status());check((await changed.json()).sessionsRevoked===true,'Managed global session revoke');
    await expect(reset.locator('#resetHost')).toContainText('Password updated. Sign in with your new password.');
    const old=await request('auth/v1/token?grant_type=password',{body:{email:renter.email,password:renter.password}});check(!old.ok,'Old hosted password rejected');
    const refresh=await request('auth/v1/token?grant_type=refresh_token',{body:{refresh_token:renter.session.refresh_token}});check(!refresh.ok,'Previous hosted session revoked');
    const replay=await request('auth/v1/verify',{body:{type:'recovery',token_hash:recovery.token_hash}});check(!replay.ok,'Consumed hosted recovery OTP rejected');
    renter.password=next;const fresh=await ui(renter);await fresh.ctx.close();
    pass('Hosted genuine recovery callback, frozen Edge/HIBP reset, global revocation, old-password denial and new-password UI login');
    const publicRequest=async()=>{const start=performance.now();const r=await rpc('site_appearance_published');check(r.ok,'Bounded public read');samples.push(Math.round(performance.now()-start));};
    for(let i=0;i<15;i++){await publicRequest();await new Promise(r=>setTimeout(r,250));}
    await writeFile(new URL('browser-evidence.json',dir),JSON.stringify({deployedSource:manifest.source,deployment:lab.deployment,completed:true,publicReadSample:{count:samples.length,minMs:Math.min(...samples),maxMs:Math.max(...samples),p95Ms:[...samples].sort((a,b)=>a-b)[Math.ceil(samples.length*.95)-1]},blockedExternalOrigins:[...blocked],externalSmtpDelivery:false,representativeLoad:false},null,2));
    pass('Bounded hosted pilot: 15 sequential public reads, below five requests/second');
  }catch(error){
    let label=String(error.message);for(const s of secrets.filter(Boolean))label=label.split(s).join('[REDACTED]');
    throw Error(label.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[JWT]').slice(0,700));
  }finally{
    // Keep access to live customer sessions until physical synthetic media is removed.
    try{
      await barrier('media-cleanup');
      const media=JSON.parse(await readFile(new URL('media-cleanup.ready',dir),'utf8'));
      check(Array.isArray(media)&&media.length<=30,'Bounded media cleanup');
      for(const bucket of new Set(media.map(x=>x.bucket_id))){
        check(['room-media','listing-draft-media'].includes(bucket),'Test media bucket');
        const names=media.filter(x=>x.bucket_id===bucket).map(x=>x.name);
        check(names.every(x=>x.startsWith(lister.id+'/')&&!x.includes('..')),'Synthetic media provenance');
        const r=await fetch(ROOT+'/storage/v1/object/'+bucket,{method:'DELETE',headers:{apikey:key,Authorization:'Bearer '+lister.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({prefixes:names})});
        check(r.ok,'Physical managed synthetic media cleanup');
      }
      pass('Physical synthetic media removed through Storage API with owner session');
    }finally{for(const ctx of opened.reverse())await ctx.close().catch(()=>{});await browser.close();}
  }
}
