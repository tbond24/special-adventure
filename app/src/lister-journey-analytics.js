// First-party, best-effort lister milestones. Never holds up the listing flow.
(() => {
  const visitorKey='vacancy-lister-visitor-v1',firstKey='vacancy-lister-first-touch-v1',sessionKey='vacancy-lister-session-v1';
  const id=()=>crypto.randomUUID();
  const read=(storage,key)=>{try{return JSON.parse(storage.getItem(key)||'null')}catch{return null}};
  const write=(storage,key,value)=>{try{storage.setItem(key,JSON.stringify(value))}catch{}};
  const short=(value,length=100)=>String(value||'').slice(0,length);
  const visitorId=read(localStorage,visitorKey)||id();write(localStorage,visitorKey,visitorId);
  const params=new URLSearchParams(location.search);
  let referrerHost='';try{referrerHost=new URL(document.referrer).hostname.toLowerCase()}catch{}
  const utmSource=short(params.get('utm_source'),80),utmMedium=short(params.get('utm_medium'),80);
  const source=utmSource||(/(^|\.)google\./.test(referrerHost)?'Google':/(^|\.)bing\./.test(referrerHost)?'Bing':/(^|\.)facebook\.|(^|\.)fb\./.test(referrerHost)?'Facebook':/(^|\.)instagram\./.test(referrerHost)?'Instagram':/(^|\.)tiktok\./.test(referrerHost)?'TikTok':referrerHost&&referrerHost!==location.hostname?'Referral':'Direct / Unknown');
  const medium=utmMedium||(/google\.|bing\./.test(referrerHost)?'organic_search':source==='Referral'?'referral':source==='Direct / Unknown'?'unknown':'organic_social');
  const entryAcquisition={source,medium,campaign:short(params.get('utm_campaign')),campaign_id:short(params.get('campaign_id')),adset_id:short(params.get('adset_id')),ad_id:short(params.get('ad_id')),content_id:short(params.get('utm_content')),referrer_host:short(referrerHost,120),landing_path:short(location.pathname,120)};
  const first=read(localStorage,firstKey)||entryAcquisition;write(localStorage,firstKey,first);
  const oldSession=read(sessionStorage,sessionKey),now=Date.now();
  const newCampaign=Boolean(utmSource&&oldSession?.acquisition?.campaign!==entryAcquisition.campaign);
  const session=oldSession&&!newCampaign&&now-oldSession.lastSeen<30*60*1000?oldSession:{id:id(),lastSeen:now,acquisition:entryAcquisition};
  session.acquisition ||= entryAcquisition;
  const acquisition=session.acquisition;
  session.lastSeen=now;write(sessionStorage,sessionKey,session);
  const ua=navigator.userAgent||'';
  const device=/iPad|Tablet/i.test(ua)?'tablet':/Mobi|Android|iPhone/i.test(ua)?'mobile':'desktop';
  const browser=/Edg\//.test(ua)?'Edge':/Firefox\//.test(ua)?'Firefox':/Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'Other';
  const os=/Android/.test(ua)?'Android':/iPhone|iPad/.test(ua)?'iOS':/Windows/.test(ua)?'Windows':/Mac OS/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':'Other';
  const queue=[];let timer=null,sending=false;
  async function flush(){
    clearTimeout(timer);timer=null;if(sending||!queue.length)return;
    sending=true;const batch=queue.slice(0,20);
    try{await VACANCY_BACKEND.recordListerJourney(batch);queue.splice(0,batch.length)}catch{ /* Analytics failure must never affect the product. */ }
    finally{sending=false;if(queue.length&&queue[0]!==batch[0])timer=setTimeout(flush,500)}
  }
  function track(eventName,extra={}){
    session.lastSeen=Date.now();write(sessionStorage,sessionKey,session);
    queue.push({event_id:id(),event_name:eventName,visitor_id:visitorId,session_id:session.id,
      source:acquisition.source,medium:acquisition.medium,campaign:acquisition.campaign,
      campaign_id:acquisition.campaign_id,adset_id:acquisition.adset_id,ad_id:acquisition.ad_id,content_id:acquisition.content_id,
      first_source:first.source,first_medium:first.medium,first_campaign:first.campaign,
      referrer_host:acquisition.referrer_host,landing_path:acquisition.landing_path,
      route:short(location.pathname+location.hash,120),device_class:device,browser_family:browser,os_family:os,...extra});
    if(!timer)timer=setTimeout(flush,500);
  }
  function once(name,extra={}){const key='vacancy-journey-once:'+session.id+':'+name;if(read(sessionStorage,key))return;write(sessionStorage,key,true);track(name,extra)}
  once('lister_session_started');once('lister_landing_viewed');
  document.addEventListener('visibilitychange',()=>{if(document.hidden)void flush()});
  window.addEventListener('pagehide',()=>{void flush()});

  const stepNames=['location','listing_details','review'];
  function journeyId(form){
    if(form.dataset.analyticsJourneyId)return form.dataset.analyticsJourneyId;
    let key;try{key='vacancy-journey:'+listingDraftKey(form)}catch{key='vacancy-journey:'+session.id}
    const value=read(localStorage,key)||id();write(localStorage,key,value);
    form.dataset.analyticsJourneyId=value;return value;
  }
  function installForm(form){
    if(!form||form.dataset.analyticsInstalled||!form.dataset.journeyStep)return;
    form.dataset.analyticsInstalled='true';
    const context=()=>({journey_id:journeyId(form)});
    let step=Number(form.dataset.journeyStep),entered=performance.now(),visibleStarted=document.hidden?null:entered,active=0,pending=null;
    const activeTime=()=>active+(visibleStarted==null?0:performance.now()-visibleStarted);
    const visibility=()=>{if(document.hidden&&visibleStarted!=null){active+=performance.now()-visibleStarted;visibleStarted=null}else if(!document.hidden&&visibleStarted==null)visibleStarted=performance.now()};
    document.addEventListener('visibilitychange',visibility);
    track('listing_started',context());track('location_started',{...context(),step:'location'});
    form.addEventListener('click',event=>{
      const next=event.target.closest('.journey-next');
      if(next)pending={from:step,at:performance.now()};
    },true);
    form.addEventListener('submit',()=>track('publish_clicked',{...context(),step:'review'}),true);
    const observer=new MutationObserver(()=>{
      const next=Number(form.dataset.journeyStep);if(next===step||!Number.isInteger(next))return;
      const old=step,elapsed=Math.min(3600000,Math.round(performance.now()-entered)),activeMs=Math.min(3600000,Math.round(activeTime()));
      if(next>old){
        if(old===0)track('location_completed',{...context(),step:'location',duration_ms:elapsed,active_ms:activeMs});
        if(old===1){
          track('listing_details_completed',{...context(),step:'listing_details',duration_ms:elapsed,active_ms:activeMs});
          track('photos_completed',context());track('pricing_completed',context());
        }
      }
      if(pending&&next>pending.from)track('step_ready',{...context(),step:stepNames[next],duration_ms:Math.round(performance.now()-pending.at)});
      pending=null;step=next;entered=performance.now();active=0;visibleStarted=document.hidden?null:entered;
      if(next===0)track('location_started',{...context(),step:'location'});
      if(next===1)track('listing_details_started',{...context(),step:'listing_details'});
      if(next===2)track('listing_previewed',{...context(),step:'review'});
    });
    observer.observe(form,{attributes:true,attributeFilter:['data-journey-step']});
    new MutationObserver(()=>{if(form.isConnected)return;observer.disconnect();document.removeEventListener('visibilitychange',visibility)}).observe(document.body,{childList:true,subtree:true});
  }
  const beforeList=renderList;
  renderList=async function(...args){const result=await beforeList.apply(this,args);if(parseHash().name==='list'&&parseHash().id==='new')installForm(document.querySelector('#listingForm,#existingListingForm'));return result};
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-nav="list"]'))track('list_property_clicked');
    if(event.target.closest('#createNewListing'))track('list_property_clicked');
    if(event.target.closest('[data-listing-type]')&&!event.target.closest('#listingHost[data-mode="edit"]'))track('property_type_completed');
  },true);

  for(const [name,code] of [['uploadListingImages','photo_upload'],['reconfirmVacancy','listing_submitted']]){
    const before=VACANCY_BACKEND[name];
    VACANCY_BACKEND[name]=async function(...args){
      const form=document.querySelector('#listingForm[data-publishing="true"],#existingListingForm[data-publishing="true"]');
      if(!form)return before.apply(this,args);
      const start=performance.now(),extra={journey_id:journeyId(form),vacancy_id:args[0],step:name==='uploadListingImages'?'listing_details':'review'};
      try{const result=await before.apply(this,args);track(code,{...extra,duration_ms:Math.round(performance.now()-start)});return result}
      catch(error){track('journey_error',{...extra,error_code:name==='uploadListingImages'?'photo_upload_failed':'publish_failed',duration_ms:Math.round(performance.now()-start)});throw error}
    };
  }
  for(const name of ['createListing','createRoomVacancyForProperty']){
    const before=VACANCY_BACKEND[name];
    VACANCY_BACKEND[name]=async function(...args){const result=await before.apply(this,args);const form=document.querySelector('#listingForm[data-publishing="true"],#existingListingForm[data-publishing="true"]');if(form){const vacancyId=Array.isArray(result)?result[0]:result;track('listing_record_created',{journey_id:journeyId(form),vacancy_id:vacancyId})}return result};
  }
  for(const name of ['signUp','updateGuestEmail','setGuestUpgradePassword']){
    const before=VACANCY_BACKEND[name];
    VACANCY_BACKEND[name]=async function(...args){
      track('signup_started');
      const result=await before.apply(this,args);
      if(name==='setGuestUpgradePassword'||result?.access_token)track('signup_completed');
      else track('signup_pending_confirmation');
      return result;
    };
  }
  window.VACANCY_LISTER_JOURNEY={track,flush};
})();
