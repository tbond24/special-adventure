import {randomUUID} from 'node:crypto';
import {expect} from '@playwright/test';
import {assertActivityEnvironment} from './activity-log-reports.mjs';

export async function verifyRemainingDisplays(h){
 const {ROOT,key,sql,request,check,pass,evidence,owner,operator,page,server,sensitive,context}=h;
 assertActivityEnvironment(ROOT);
 const info=evidence.remainingDisplays={completed:false,targets:[],realAuth:true};
 for(const [actor,p] of [[owner,page]]){
  actor.session=await p.evaluate(async()=>{await VACANCY_BACKEND.currentUser();return VACANCY_BACKEND.session();});
  sensitive.add(actor.session.access_token);sensitive.add(actor.session.refresh_token);
 }
 const rpc=(name,actor,body)=>request('rest/v1/rpc/'+name,{token:actor?.session.access_token,body});
 const state=(actor,k)=>rpc('admin_appearance_state',actor,{p_element_key:k});
 const config=value=>({all:{enabled:value}});
 const save=(actor,k,value,v,r)=>rpc('admin_appearance_save_draft',actor,{p_element_key:k,p_config:config(value),p_expected_draft_version:v,p_expected_published_revision:r});
 const publish=(actor,k,r,v,id=randomUUID())=>rpc('admin_appearance_publish',actor,{p_element_key:k,p_expected_published_revision:r,p_expected_draft_version:v,p_reason:'Disposable detail display acceptance',p_request_id:id});
 await sql(`update public.properties set internet_available=true,parking_spaces=1,security_available=true,water_available=true,electricity_available=true,
 custom_features='[{"label":"Synthetic optional feature","icon":"house"}]'::jsonb where id='77777777-7777-4777-8777-777777777777';
 update public.rooms set furnished=true,ensuite=true,unit_details='{}'::jsonb where id='66666666-6666-4666-8666-666666666666';
 update public.vacancies set bills_included=true where id='55555555-5555-4555-8555-555555555555';`);
 const targets=[['wifi','Wi-Fi or internet'],['parking','1 parking space'],['furnished','Furnished'],['ensuite','Private ensuite'],['bills','Utilities included'],['security','Security'],['custom','Synthetic optional feature'],['water','Water available'],['electricity','Electricity available']];
 const publicContext=await context(),publicPage=await publicContext.newPage();
 async function render(width){
  await publicPage.setViewportSize({width,height:900});
  await publicPage.goto(server.url+'/#detail/55555555-5555-4555-8555-555555555555');
  await expect(publicPage.locator('.quiet-detail')).toBeVisible();
  return publicPage.evaluate(async()=>{
   await VACANCY_LISTING_OPTIONS.refresh();
   const row=(await VACANCY_BACKEND.activeVacancies()).find(r=>r.id==='55555555-5555-4555-8555-555555555555');
   if(!row)throw Error('Public fixture unavailable');
   const html=await renderDetailQuiet(row.id,row),doc=new DOMParser().parseFromString(html,'text/html');
   return {features:[...doc.querySelectorAll('.quiet-features li span')].map(n=>n.textContent),price:html.includes('320'),contact:html.includes('Is this available?'),rules:html.includes('Rules')};
  });
 }
 try{
  for(const [name,label] of targets){
   const slot='listing-'+name,k='listing-display/'+slot;
   let s=await state(owner,k);check(s.ok&&s.data.published.revision===0&&s.data.published.config.all.enabled===true,'Adopt existing '+slot);
   check((await save(operator,k,false,0,0)).ok,'Operator private '+slot);
   check((await state(owner,k)).data.draft===null,'Private draft isolation '+slot);
   check(!(await publish(operator,k,0,1)).ok,'Operator publication denied '+slot);
   const invalid=await rpc('admin_appearance_save_draft',owner,{p_element_key:k,p_config:{mobile:{enabled:false}},p_expected_draft_version:0,p_expected_published_revision:0});
   check(!invalid.ok&&invalid.data.code==='22023','Viewport scope denied '+slot);
   const legacy=await rpc('admin_set_listing_display_option',owner,{p_slot:slot,p_enabled:false});
   check(legacy.status===409,'Immediate bypass denied '+slot);
   check((await save(owner,k,false,0,0)).ok,'Owner private save '+slot);
   check((await save(owner,k,true,0,0)).status===409,'Stale draft denied '+slot);
   const before=await render(390);check(before.features.includes(label),'Private save preserves actual feature '+slot);
   const id=randomUUID(),out=await publish(owner,k,0,1,id);
   check(out.ok&&(await publish(owner,k,0,1,id)).data.alreadyApplied===true,'Idempotent publication '+slot);
   for(const width of [1536,390]){
    const hidden=await render(width);check(!hidden.features.includes(label)&&hidden.price&&hidden.contact,'Actual optional row hidden; price/contact retained '+slot);
   }
   check((await save(owner,k,true,0,1)).ok&&(await publish(owner,k,1,1)).ok,'Restore shared value as new publication '+slot);
   check((await render(390)).features.includes(label),'Actual feature restored '+slot);
   const history=await rpc('admin_appearance_history',owner,{p_element_key:k});check(history.ok&&JSON.stringify(history.data.map(row=>row.revision))==='[2,1,0]'&&history.data[2].config.all.enabled===true&&history.data[2].actor_id===null&&history.data[2].published_at===null,'Both publications and actual initial baseline retained '+slot);
   info.targets.push(slot);
  }
 }finally{await publicContext.close();}
 await page.reload();await page.locator('#adminSectionMenu [data-section=icons]').click();
 const select=page.locator('[data-display-target]');await expect(select).toBeEnabled();
 await select.selectOption('listing-wifi');await expect(page.locator('[data-display-enabled]')).toBeChecked();
 await page.locator('[data-display-enabled]').uncheck();await select.selectOption('listing-water');
 await expect(page.locator('.display-draft dialog')).toBeVisible();
 await page.locator('[data-display-stay]').click();await expect(select).toHaveValue('listing-wifi');
 await page.locator('[data-display-save]').click();await expect(page.locator('[data-display-status]')).toContainText('Private draft saved');
 await page.locator('[data-display-review]').click();await page.locator('[data-display-reason]').fill('Disposable remaining display UI');
 await page.locator('[data-display-publish]').click();await expect(page.locator('[data-display-status]')).toContainText('verified in public settings');
 await page.locator('[data-display-history]').click();await page.locator('[data-display-restore="2"]').click();
 await page.locator('[data-display-reason]').fill('Disposable remaining display UI restore');await page.locator('[data-display-publish]').click();
 await expect(page.locator('[data-display-status]')).toContainText('Published revision 4; verified');
 info.completed=true;info.actualUi=true;info.viewports=[1536,390];
 pass('All nine actual detail display bindings preserve private drafts, deny legacy/Operator publication and hide/restore only optional rows on desktop/mobile');
}
