// Explicit first-party tracking points. No text, URLs, inputs or listing IDs.
(() => {
 const catalog=Object.freeze([
  {id:'contact_button_pressed',label:'Contact button',kind:'press'},
  {id:'text_button_pressed',label:'Text / send message',kind:'press'},
  {id:'location_started',label:'Listing · Location',kind:'view'},
  {id:'listing_details_started',label:'Listing · Details',kind:'view'},
  {id:'listing_previewed',label:'Listing · Review',kind:'view'},
  {id:'listing_submitted',label:'Listing submitted',kind:'complete'}
 ]);
 let policy=null,visitor=null,session=null;const forms=new WeakMap();
 const storage=(store,key,value)=>{try{if(value!==undefined)store.setItem(key,JSON.stringify(value));return JSON.parse(store.getItem(key)||'null')}catch{return null}};
 const allowed=()=>policy?.enabled===true&&!VACANCY_ANALYTICS.excluded()&&navigator.doNotTrack!=='1'&&navigator.globalPrivacyControl!==true&&consent()?.version===policy.noticeVersion&&Date.now()-consent().at<30*864e5;
 const consent=()=>storage(localStorage,'vacancy-element-tracking-consent');
 function notice(){if(!policy?.enabled||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true||VACANCY_ANALYTICS.excluded()||document.querySelector('[data-element-consent]')||(consent()?.version===policy.noticeVersion&&Date.now()-consent().at<30*864e5))return;const panel=document.createElement('aside');panel.dataset.elementConsent='';panel.className='panel';panel.innerHTML='<p>Allow optional counts of Contact, Send message and listing creation steps? No entered text or contact details are collected. Records expire after 30 days.</p><button type="button" data-accept>Allow analytics</button> <button type="button" data-decline>No thanks</button>';panel.querySelector('[data-accept]').onclick=()=>{storage(localStorage,'vacancy-element-tracking-consent',{version:policy.noticeVersion,at:Date.now()});panel.remove();const form=document.querySelector('#listingForm,#existingListingForm');if(form)page(form,Number(form.dataset.journeyStep))};panel.querySelector('[data-decline]').onclick=()=>{storage(localStorage,'vacancy-element-tracking-consent',{version:'declined:'+policy.noticeVersion,at:Date.now()});panel.remove()};if(consent()?.version==='declined:'+policy.noticeVersion)return;document.querySelector('#app')?.append(panel)}
 const ready=Promise.resolve().then(()=>VACANCY_BACKEND.elementTrackingPolicy()).then(value=>{policy=value?.retentionDays===30&&value?.noticeVersion==='20261021-elements-v1'?value:null;notice()}).catch(()=>{});
 const queue=VACANCY_ANALYTICS.queue((events,options)=>allowed()?VACANCY_BACKEND.recordElementTracking(events,policy.noticeVersion,options):Promise.resolve(),{bindActor:false});
 addEventListener('hashchange',()=>{document.querySelector('[data-element-consent]')?.remove();notice()});
 function identity(){
  const now=Date.now();if(!visitor||now-visitor.at>=30*864e5){const old=storage(localStorage,'vacancy-element-browser');visitor=old&&now-old.at<30*864e5?old:{id:crypto.randomUUID(),at:now};storage(localStorage,'vacancy-element-browser',visitor)}
  if(!session||now-session.at>=1800000){const old=storage(sessionStorage,'vacancy-element-session');session=old&&now-old.at<1800000?old:{id:crypto.randomUUID(),at:now}}
  session.at=now;storage(sessionStorage,'vacancy-element-session',session);
 }
 function track(name,journey=null){try{
  if(!allowed()||!catalog.some(point=>point.id===name))return null;identity();
  return queue.push({event_id:crypto.randomUUID(),event_name:name,visitor_id:visitor.id,session_id:session.id,journey_id:journey,occurred_at:new Date().toISOString()});
 }catch{return null}}
 function page(form,index){
  if(!form||form.closest('[data-mode="edit"]')||form.dataset.editingVacancyId||!Number.isInteger(index)||index<0||index>2)return;
  void ready.then(()=>{if(!form.isConnected||document.hidden||form.closest('[hidden]')||Number(form.dataset.journeyStep)!==index||!allowed())return;
   let state=forms.get(form);if(!state){state={id:crypto.randomUUID(),step:null};forms.set(form,state)}
   if(state.step===index)return;state.step=index;track(catalog[index+2].id,state.id);
  });
 }
 document.addEventListener('click',event=>{const target=event.target.closest('[data-track]');if(!target||target.matches(':disabled,[aria-disabled="true"]')||!catalog.some(p=>p.id===target.dataset.track&&p.kind==='press')||target.closest('[inert],[hidden]')||!event.isTrusted)return;track(target.dataset.track)},true);
 for(const event of ['pagehide'])addEventListener(event,()=>void queue.flush());
 document.addEventListener('visibilitychange',()=>{if(document.hidden)void queue.flush();else{const form=document.querySelector('#listingForm,#existingListingForm');if(form)page(form,Number(form.dataset.journeyStep))}});
 // Success is recorded only after the existing publication operation resolves.
 const publish=VACANCY_BACKEND.reconfirmVacancy;
 VACANCY_BACKEND.reconfirmVacancy=async function(...args){const form=document.querySelector('#listingForm[data-publishing="true"],#existingListingForm[data-publishing="true"]'),state=forms.get(form);const result=await publish.apply(this,args);if(state)track('listing_submitted',state.id);return result};
 const info=renderInformationPage;
 renderInformationPage=function(name){const result=info.apply(this,arguments);if(name==='privacy'){const section=document.createElement('section');section.innerHTML='<h2>Optional button and page analytics</h2><p>Counts Contact, Send message and listing steps when enabled and allowed. No entered text is collected.</p><button type="button">Turn off button and page analytics</button>';section.querySelector('button').onclick=()=>{storage(localStorage,'vacancy-element-tracking-consent',{version:'declined:'+(policy?.noticeVersion||'20261021-elements-v1'),at:Date.now()});visitor=null;session=null;try{localStorage.removeItem('vacancy-element-browser');sessionStorage.removeItem('vacancy-element-session')}catch{}};document.querySelector('.information-page')?.append(section)}return result};
 window.VACANCY_TRACKING=Object.freeze({catalog,page,track,flush:queue.flush,ready});
})();
