// Prospective opt-in only. Server gate defaults off; no identifiers before consent.
(() => {
 if(window.VACANCY_ANALYTICS_PREFERENCES?.disabled)return;
 const VERSION='20261016-renter-v1',KEY='vacancy-renter-consent-v1',SESSION='vacancy-renter-session-v1';
 const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
 const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
 let enabled=false,session=null,search=null,opens=new Map();
 const queue=VACANCY_ANALYTICS.queue((events,options)=>enabled&&consent()?VACANCY_BACKEND.recordRenterJourney(events,VERSION,options):Promise.resolve(0));
 function consent(){const c=read(KEY);return c?.version===VERSION&&c.accepted===true&&Date.now()-c.at<30*86400000;}
 function track(name,extra={}){
  if(!enabled||!consent()||VACANCY_ANALYTICS.excluded())return null;
  try{
   const prior=read(SESSION),now=Date.now();
   if(!session){session=prior&&now-prior.at<1800000&&now-prior.born<30*86400000?prior:{visitor:crypto.randomUUID(),id:crypto.randomUUID(),at:now,born:now};}
   if(now-session.at>=1800000||now-session.born>=30*86400000){const expired=now-session.born>=30*86400000;session={visitor:expired?crypto.randomUUID():session.visitor,born:expired?now:session.born,id:crypto.randomUUID(),at:now};search=null;opens.clear();}
   session.at=now;write(SESSION,session);
   const event={event_id:crypto.randomUUID(),event_name:name,visitor_id:session.visitor,session_id:session.id,occurred_at:new Date().toISOString(),...extra};
   return queue.push(event);
  }catch{return null;}
 }
 const before=VACANCY_BACKEND.trackEvent;
 // The Find magnifier first expands its field. Count the existing search
 // action only after a valid-length request, including keyboard activation.
 const mapSearch=searchMapLocation;
 searchMapLocation=function(...args){try{if(parseHash().name==='home'&&(document.querySelector('#q')?.value.trim().length||0)>=2){search=track('search_used');opens.clear();}}catch{}return mapSearch.apply(this,args);};
 VACANCY_BACKEND.trackEvent=function(name,listing,...args){
  try{if(name==='search_used'){search=track('search_used');opens.clear();}
   if(name==='vacancy_opened'&&listing){const event=track('vacancy_opened',{vacancy_id:listing,parent_id:search});if(event)opens.set(listing,event);}}
  catch{ /* Preserve the existing metric and product action. */ }
  return before.call(this,name,listing,...args);
 };
 const enquiry=VACANCY_BACKEND.startEnquiry;
 VACANCY_BACKEND.startEnquiry=async function(listing,...args){
  const result=await enquiry.call(this,listing,...args);
  try{const parent=opens.get(listing);if(parent&&typeof result==='string')track('enquiry_linked',{vacancy_id:listing,conversation_id:result,parent_id:parent});}catch{}
  return result;
 };
 function notice(){
  if(!enabled||VACANCY_ANALYTICS.excluded()||document.querySelector('[data-renter-consent]'))return;
  const prior=read(KEY);if(prior?.version===VERSION&&Date.now()-prior.at<30*86400000)return;
  const panel=document.createElement('aside');panel.dataset.renterConsent='';panel.className='panel';panel.setAttribute('aria-label','Optional renter analytics');
  panel.innerHTML='<p>Allow optional analytics to understand search, listing opens, enquiries and first replies? The planned retention is 30 days. Search text, addresses and message contents are excluded. <a href="#privacy">Privacy details</a></p><button type="button" data-accept>Allow analytics</button> <button type="button" data-decline>No thanks</button>';
  const choose=accepted=>{write(KEY,{accepted,version:VERSION,at:Date.now()});panel.remove();if(!accepted){session=null;search=null;opens.clear();try{localStorage.removeItem(SESSION)}catch{}}};
  panel.querySelector('[data-accept]').onclick=()=>choose(true);panel.querySelector('[data-decline]').onclick=()=>choose(false);document.body.append(panel);
 }
 // Do not add any poller or emit events merely because the policy is readable.
 VACANCY_BACKEND.renterAnalyticsPolicy().then(policy=>{enabled=policy?.enabled===true&&policy?.retentionDays===30&&policy?.noticeVersion===VERSION;notice();}).catch(()=>{});
 window.addEventListener('hashchange',()=>{if(VACANCY_ANALYTICS.excluded())document.querySelector('[data-renter-consent]')?.remove();else notice();});
 window.addEventListener('pagehide',()=>void queue.flush());
 window.VACANCY_RENTER_JOURNEY=Object.freeze({flush:queue.flush,enabled:()=>enabled});
 // Consent remains changeable from Privacy; no deletion of server records here.
 const info=renderInformationPage;
 renderInformationPage=function(name){const result=info.apply(this,arguments);if(name==='privacy'){
  const section=document.createElement('section');section.innerHTML='<h2>Optional renter analytics</h2><p>Prospective search, listing-open and enquiry/reply measurement is disabled until its notice and 30-day retention enforcement are reviewed. When enabled, it requires an optional choice; declining does not affect Find, listings or messaging. Existing service records and earlier analytics have separate policies.</p><button type="button">Turn off optional renter analytics</button>';
  section.querySelector('button').onclick=()=>{write(KEY,{accepted:false,version:VERSION,at:Date.now()});session=null;search=null;opens.clear();try{localStorage.removeItem(SESSION)}catch{}};
  document.querySelector('.information-page')?.append(section);
 }return result;};
})();
