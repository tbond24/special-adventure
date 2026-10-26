const vacancyPendingEnquiries=new Map();
for(const name of ['hashchange','popstate','pagehide'])window.addEventListener(name,event=>{for(const job of vacancyPendingEnquiries.values())if(event.type==='pagehide'||!job.current())job.controller.abort()});
const isGuestUser=()=>Boolean(currentUser?.is_anonymous);
const isPermanentUser=()=>Boolean(currentUser&&!currentUser.is_anonymous);

const guestDetailBefore=renderDetail;
renderDetail=function(id){
  guestDetailBefore(id);
  const button=document.querySelector('#enquire');
  if(button)button.onclick=()=>nav('enquire',id);
  if(!isPermanentUser()){
    const accountOnlyActions=[
      ['#reportListing','Sign in to report a vacancy'],
      ['#blockLister','Sign in to block a lister']
    ];
    accountOnlyActions.forEach(([selector,message])=>{
      const action=document.querySelector(selector);
      if(action)action.onclick=()=>{nav('auth');toast(message)};
    });
  }
};

renderEnquire=function(id){
  const v=vacancies.find(item=>item.id===id);
  if(!v){layout('<div class="empty">Vacancy not found.</div>');return}
  if(isPermanentUser()&&v.owner.id===currentUser.id){layout('<div class="empty">You cannot message on your own vacancy.</div>');return}
  const guest=!currentUser;
  const photo=v.room.media?.find(item=>item?.url)?.url;
  layout(`<section class="enquiry-chat"><header class="enquiry-chat-head"><button type="button" class="chat-back" aria-label="Go back">←</button><span class="thread-avatar">${v.owner.avatarUrl?`<img src="${escapeHtml(v.owner.avatarUrl)}" alt="">`:`<span>${escapeHtml((v.owner.displayName||'L').charAt(0))}</span>`}</span><strong>${escapeHtml(v.owner.displayName||'Lister')}</strong></header><a class="chat-listing" href="${escapeHtml(publicListingPath(v))}">${photo?`<img src="${escapeHtml(photo)}" alt="">`:'<span class="chat-listing-placeholder" aria-hidden="true"></span>'}<span><strong>${escapeHtml(v.room.name)}</strong><small>${escapeHtml([v.property.suburb,formatListingPrice(v)].filter(Boolean).join(' · '))}</small></span></a><form id="enquiryForm" class="enquiry-chat-form">${guest?'<label>Your name<input name="guestName" required maxlength="80" autocomplete="name"></label><p class="muted">Continue as a guest—no account or password needed. Replies remain available in this browser.</p>':isGuestUser()?'<p class="muted">Sending as a guest. Replies remain available in this browser.</p>':''}<label class="enquiry-message-label"><span class="sr-only">Message</span><textarea id="enquiryMessage" name="message" required maxlength="1200" placeholder="Write a message"></textarea></label><button class="primary" data-track="text_button_pressed">Send message</button></form></section>`);
  document.querySelector('.enquiry-chat-head .chat-back').onclick=()=>{if(history.length>1)history.back();else nav('detail',id)};
  document.querySelector('#app > .page-back')?.remove();
  document.querySelector('#enquiryForm').onsubmit=async event=>{
    event.preventDefault();const form=event.currentTarget,button=form.querySelector('button'),controller=new AbortController();
    const requested=location.pathname+location.hash,initialActor=currentUser?.id||null;
    const current=()=>form.isConnected&&location.pathname+location.hash===requested&&!controller.signal.aborted;
    let actor=initialActor,guest=Boolean(currentUser?.is_anonymous);
    const sameActor=()=>(currentUser?.id||null)===actor&&Boolean(currentUser?.is_anonymous)===guest;
    if(!current()||form.dataset.busy||vacancyPendingEnquiries.has(id))return;
    const job={controller,current};vacancyPendingEnquiries.set(id,job);form.dataset.busy='true';button.disabled=true;
    try{
      const input=Object.fromEntries(new FormData(form));
      if(!currentUser){
        const created=await VACANCY_BACKEND.signInGuest(input.guestName,{signal:controller.signal,isCurrent:current});if(!current())return;
        // The Auth adapter may have established the expected guest before identity refresh.
        const authenticated=created?.user?.id||VACANCY_BACKEND.session?.()?.user?.id;
        if(currentUser?.id&&(!currentUser.is_anonymous||authenticated&&currentUser.id!==authenticated))return;
        await refreshIdentity();if(!current())return;
        if(authenticated&&currentUser?.id!==authenticated)return;actor=currentUser?.id||null;guest=Boolean(currentUser?.is_anonymous);
      }
      if(!current()||!sameActor())return;
      const conversationId=await VACANCY_BACKEND.startEnquiry(id,input,{signal:controller.signal,isCurrent:()=>current()&&sameActor(),ownerId:actor});
      if(!current()||!sameActor())return;
      VACANCY_BACKEND.trackEvent('enquiry_sent',id,location.hash);nav('messages',conversationId);
    }catch(error){if(current()&&sameActor()&&error.name!=='AbortError')toast(error.message)}
    finally{if(vacancyPendingEnquiries.get(id)===job)vacancyPendingEnquiries.delete(id);delete form.dataset.busy;button.disabled=false;}

  };
};

const protectPermanent=(original,message)=>function(...args){if(!isPermanentUser()){VACANCY_LISTING_AUTH_RETURN.remember();nav('auth');toast(message);return}return original.apply(this,args)};
const listingBeforeGuestDraft=renderList;
renderList=function(...args){if(!isPermanentUser()&&parseHash().name==='list'){if(parseHash().id!=='new'){nav('list','new');return}return listingBeforeGuestDraft.apply(this,args)}return protectPermanent(listingBeforeGuestDraft,'Sign in to list a vacancy').apply(this,args)};
// Saved favourites support three browser-local guest entries.
renderAccount=protectPermanent(renderAccount,'Sign in to manage an account');
renderEdit=protectPermanent(renderEdit,'Sign in to edit a vacancy');
renderAdmin=protectPermanent(renderAdmin,'Sign in to access administration');


const guestHeaderBefore=bindHeader;
bindHeader=function(){
  guestHeaderBefore();
  const auth=document.querySelector('#authButton');
  if(auth&&isGuestUser()){auth.textContent='Sign in';auth.onclick=()=>nav('auth')}
};
