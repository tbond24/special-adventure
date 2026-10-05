// First-party, bounded and best effort. Never await analytics from a product action.
(() => {
 const uuid=()=>crypto.randomUUID(),short=(v,n=100)=>String(v||'').slice(0,n);
 const read=(kind,key)=>{try{return JSON.parse(window[kind].getItem(key)||'null')}catch{return null}};
 const write=(kind,key,value)=>{try{window[kind].setItem(key,JSON.stringify(value))}catch{}};
 const route=()=>{const hash=location.hash.slice(1);return location.pathname.startsWith('/listings/')||hash.startsWith('detail')?'listing':hash.startsWith('list/new')?'create':hash.startsWith('list')?'list':hash.startsWith('auth')?'auth':!hash||hash.startsWith('home')?'find':'other'};
 const params=new URLSearchParams(location.search);let host='';try{host=new URL(document.referrer).hostname;if(host===location.hostname)host=''}catch{}
 const entry={source:short(params.get('utm_source'),80)||(host?'Referral':'Unknown'),medium:short(params.get('utm_medium'),80)||'unknown',campaign:short(params.get('utm_campaign')),campaign_id:short(params.get('campaign_id')),adset_id:short(params.get('adset_id')),ad_id:short(params.get('ad_id')),content_id:short(params.get('utm_content')),referrer_host:short(host,120),device_class:/iPad|Tablet/i.test(navigator.userAgent)?'tablet':/Mobi|Android|iPhone/i.test(navigator.userAgent)?'mobile':'desktop'};
 const visitorRecord=read('localStorage','vacancy-connected-visitor');
 const visitor=visitorRecord&&Date.now()-visitorRecord.at<90*86400000?visitorRecord.id:uuid();write('localStorage','vacancy-connected-visitor',{id:visitor,at:visitorRecord?.id===visitor?visitorRecord.at:Date.now()});
 let session=read('sessionStorage','vacancy-connected-session'),queue=[],timer,sending=false,retries=0;
 const campaignChanged=session&&params.has('utm_source')&&['source','medium','campaign'].some(k=>session.acquisition?.[k]!==entry[k]);if(campaignChanged)session=null;
 function baseEvent(name,extra={}){return {event_id:uuid(),event_name:name,visitor_id:visitor,session_id:session.id,occurred_at:new Date().toISOString(),route:route(),...session.acquisition,...extra};}
 function enqueue(event){if(queue.length>=100)queue.shift();queue.push(event);if(!timer)timer=setTimeout(flush,600);return event.event_id;}
 function touch(){const now=Date.now();if(!session||now-session.lastSeen>=1800000){session={id:uuid(),lastSeen:now,acquisition:entry};enqueue(baseEvent('lister_session_started'));}session.lastSeen=now;write('sessionStorage','vacancy-connected-session',session);}
 async function flush(){clearTimeout(timer);timer=null;if(sending||!queue.length)return;sending=true;const batch=[];let size=2;for(const item of queue.slice(0,20)){const bytes=new TextEncoder().encode(JSON.stringify(item)).length+1;if(size+bytes>30000)break;batch.push(item);size+=bytes;}
  try{await VACANCY_BACKEND.recordConnectedJourney(batch);queue.splice(0,batch.length);retries=0;}catch{retries++;if(retries>=3){queue.splice(0,batch.length);retries=0;}}finally{sending=false;if(queue.length)timer=setTimeout(flush,retries?5000:600);}
 }
 function track(name,extra={}){try{touch();return enqueue(baseEvent(name,extra));}catch{return null;}}
 function metadata(form){
  if(!form||form.closest('#listingHost')?.dataset.mode==='edit'||form.dataset.editingVacancyId)return null;
  if(form._connectedJourney)return form._connectedJourney;
  touch();let saved;try{saved=JSON.parse(form.dataset.connectedJourney||'null')}catch{}
  if(saved?.visitor===visitor&&Date.now()-saved.started<90*86400000&&saved.id){form._connectedJourney=saved;return saved;}
  const m={id:uuid(),visitor,started:Date.now(),acquisition:{...session.acquisition},mode:form.dataset.restoredLegacyDraft==='true'?'legacy':'new',previous:null,step:null};form._connectedJourney=m;return m;
 }
 function remember(form,m){form.dataset.connectedJourney=JSON.stringify(m);}
 function step(form,index){try{const m=metadata(form);if(!m||m.step===index)return;const first=m.step==null;m.previous=track(first?'listing_started':'step_ready',{...m.acquisition,journey_id:m.id,journey_mode:m.mode,previous_event_id:m.previous,from_step:m.step,to_step:index});m.step=index;remember(form,m);}catch{}}
 function context(form){const m=metadata(form);return m?{...m.acquisition,journey_id:m.id,journey_mode:m.mode}:null;}
 const beforeList=renderList;renderList=async function(...args){const result=await beforeList.apply(this,args);const form=document.querySelector('#listingForm,#existingListingForm');if(form&&parseHash().name==='list'&&parseHash().id==='new')step(form,Number(form.dataset.journeyStep||0));return result;};
 for(const name of ['createListing','createRoomVacancyForProperty']){const original=VACANCY_BACKEND[name];VACANCY_BACKEND[name]=async function(...args){const form=document.querySelector('#listingForm[data-publishing="true"],#existingListingForm[data-publishing="true"]');const input=name==='createListing'?args[0]:args[1];let ctx;
   try{ctx=context(form);if(ctx&&input?.requestId){const m=metadata(form);m.previous=track('publish_clicked',{...ctx,previous_event_id:m.previous,from_step:m.step,to_step:3,unit_request_id:input.requestId});m.step=3;remember(form,m);}}catch{}
   try{return await original.apply(this,args)}catch(error){if(ctx)track('journey_error',{...ctx,error_code:'listing_save_failed'});throw error;}
 };}
 for(const [name,event] of [['uploadListingImages','photo_upload'],['reconfirmVacancy','listing_submitted']]){const original=VACANCY_BACKEND[name];VACANCY_BACKEND[name]=async function(...args){const form=document.querySelector('#listingForm[data-publishing="true"],#existingListingForm[data-publishing="true"]');let ctx;try{ctx=context(form)}catch{}const started=performance.now();try{const result=await original.apply(this,args);if(ctx)track(event,{...ctx,duration_ms:Math.round(performance.now()-started)});return result;}catch(error){if(ctx)track('journey_error',{...ctx,error_code:name==='uploadListingImages'?'photo_upload_failed':'publish_failed'});throw error;}};}
 document.addEventListener('click',e=>{if(e.target.closest('[data-nav="list"],#createNewListing'))track('list_property_clicked');},true);
 window.addEventListener('pagehide',()=>void flush());document.addEventListener('visibilitychange',()=>{if(document.hidden)void flush();});
 window.VACANCY_CONNECTED_JOURNEY={step,track,flush};track('lister_landing_viewed');
})();
