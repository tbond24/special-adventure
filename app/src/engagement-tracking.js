// Named low-volume events using the shared bounded queue. Product actions never wait.
(() => {
 const catalog=Object.freeze([{id:'contact_button_pressed',label:'Contact clicks',kind:'press'},{id:'text_button_pressed',label:'Text clicks',kind:'press'}]);
 const disabled=()=>window.VACANCY_ANALYTICS_PREFERENCES?.disabled||window.VACANCY_ANALYTICS?.excluded()||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true||String(read(localStorage,'vacancy-element-tracking-consent')?.version||'').startsWith('declined:');
 const read=(store,key)=>{try{return JSON.parse(store.getItem(key)||'null')}catch{return null}},write=(store,key,value)=>{try{store.setItem(key,JSON.stringify(value))}catch{}};
 let context=null,contextJob=null,lastActor=Symbol(),contextAt=0;
 const queue=VACANCY_ANALYTICS.queue((events,options)=>disabled()?Promise.resolve():VACANCY_BACKEND.recordSiteEngagement(events.map(e=>({...e,city:context?.city||null,country:context?.country||null})),options));
 function identity(){const now=Date.now();let v=read(localStorage,'vacancy-connected-visitor');if(!v?.id||now-v.at>=90*864e5){v={id:crypto.randomUUID(),at:now};write(localStorage,'vacancy-connected-visitor',v)}let s=read(sessionStorage,'vacancy-engagement-session');if(!s?.id||now-s.at>=1800000)s={id:crypto.randomUUID()};s.at=now;write(sessionStorage,'vacancy-engagement-session',s);return {visitor_id:v.id,session_id:s.id};}
 function track(point){try{if(disabled())return null;return queue.push({event_id:crypto.randomUUID(),point,...identity(),occurred_at:new Date().toISOString()})}catch{return null}}
 function page(){
  if(disabled())return;const actor=typeof currentUser==='undefined'?null:currentUser?.id||null;
  if(actor===lastActor&&Date.now()-contextAt<1800000)return;if(Date.now()-contextAt>=1800000)contextJob=null;lastActor=actor;contextAt=Date.now();
  if(!contextJob){const cached=read(sessionStorage,'vacancy-engagement-context');if(cached&&Date.now()-cached.at<1800000){context=cached;contextJob=Promise.resolve()}else{contextJob=fetch('/api/visitor-context',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(3000)}).then(r=>r.ok?r.json():null).then(g=>{if(disabled())return;if(g&&g.approximate===true){context={city:typeof g.city==='string'?g.city.slice(0,80):null,country:/^[A-Z]{2}$/.test(g.country)?g.country:null,at:Date.now()};write(sessionStorage,'vacancy-engagement-context',context)}}).catch(()=>{})}}
  void contextJob.then(()=>track('context'));
 }
 const textSelector='#enquiryForm button.primary,#enquiryForm button[type="submit"],[data-contact="text"],[data-contact="whatsapp"],a[href^="sms:"]';
 const contactSelector='.quiet-message,#enquire,#enquireButton,[data-enquire],.enquire-action,[data-contact="phone"],a[href^="tel:"]';
 document.addEventListener('click',event=>{const target=event.target.closest?.('[data-track],'+textSelector+','+contactSelector);if(!event.isTrusted||!target||target.matches(':disabled,[aria-disabled="true"]')||target.closest('[hidden],[inert]')||disabled())return;
  const point=catalog.some(p=>p.id===target.dataset.track)?target.dataset.track:target.matches(textSelector)?'text_button_pressed':target.matches(contactSelector)?'contact_button_pressed':null;if(point)track(point);
 },true);
 window.addEventListener('vacancy:page-rendered',page);window.addEventListener('hashchange',()=>queueMicrotask(page));window.addEventListener('pagehide',()=>void queue.flush());document.addEventListener('visibilitychange',()=>{if(document.hidden)void queue.flush();else page()});
 if(typeof renderInformationPage==='function'){const original=renderInformationPage;renderInformationPage=function(name){const result=original.apply(this,arguments);if(name==='privacy'){const section=document.createElement('section');section.innerHTML='<h2>Site activity counts</h2><p>We count Contact and Text button presses and listing journeys. Approximate city and country may accompany activity; we do not record your IP address, exact location, entered messages or contact details in these analytics.</p><button type="button">Turn off analytics in this browser</button>';section.querySelector('button').onclick=()=>{window.VACANCY_ANALYTICS_PREFERENCES?.setDisabled(true);try{sessionStorage.removeItem('vacancy-engagement-context')}catch{}context=null;section.querySelector('button').textContent='Analytics disabled in this browser'};document.querySelector('.information-page')?.append(section)}return result};}
 window.VACANCY_ENGAGEMENT=Object.freeze({catalog,page,track,flush:queue.flush,ready:Promise.resolve()});queueMicrotask(page);
})();
