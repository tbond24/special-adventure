const isGuestUser=()=>Boolean(currentUser?.is_anonymous);
const isPermanentUser=()=>Boolean(currentUser&&!currentUser.is_anonymous);

const guestDetailBefore=renderDetail;
renderDetail=function(id){
  guestDetailBefore(id);
  const button=document.querySelector('#enquire');
  if(button)button.onclick=()=>nav('enquire',id);
};

renderEnquire=function(id){
  const v=vacancies.find(item=>item.id===id);
  if(!v){layout('<div class="empty">Vacancy not found.</div>');return}
  if(isPermanentUser()&&v.owner.id===currentUser.id){layout('<div class="empty">You cannot enquire on your own vacancy.</div>');return}
  const guest=!currentUser;
  layout(`<section class="split guest-enquiry"><div class="panel"><div class="muted">${escapeHtml(v.property.suburb)}</div><h1>${escapeHtml(v.room.name)}</h1><div class="price">${formatListingPrice(v)}</div><p>${escapeHtml(v.property.householdSummary||'')}</p></div><form id="enquiryForm" class="panel form-grid"><h2 class="wide">Contact the lister</h2>${guest?'<label class="wide">Your name<input name="guestName" required maxlength="80" autocomplete="name"></label><p class="notice wide">Continue as a guest—no account or password needed. Replies remain available in this browser.</p>':isGuestUser()?'<p class="notice wide">Sending as a guest. Replies remain available in this browser.</p>':''}<label>Move-in date<input name="moveIn" type="date" required></label><label>Planned stay (weeks)<input name="stayWeeks" type="number" min="1" value="26"></label><label class="wide">A little about you<textarea name="intro" maxlength="600" placeholder="Work, study, routine, what you are looking for"></textarea></label><label class="wide">Message<textarea name="message" required maxlength="1200" placeholder="Hi, I would love to organise a viewing..."></textarea></label><button class="primary wide">Send enquiry</button></form></section>`);
  document.querySelector('#enquiryForm').onsubmit=async event=>{
    event.preventDefault();const form=event.currentTarget,button=form.querySelector('button');if(form.dataset.busy)return;form.dataset.busy='true';button.disabled=true;
    try{const input=Object.fromEntries(new FormData(form));if(!currentUser){await VACANCY_BACKEND.signInGuest(input.guestName);await refreshIdentity()}await VACANCY_BACKEND.startEnquiry(id,input);VACANCY_BACKEND.trackEvent('enquiry_sent',id,location.hash);toast('Enquiry sent');nav('messages')}
    catch(error){toast(error.message)}finally{delete form.dataset.busy;button.disabled=false}
  };
};

const protectPermanent=(original,message)=>function(...args){if(!isPermanentUser()){nav('auth');toast(message);return}return original.apply(this,args)};
renderList=protectPermanent(renderList,'Sign in to list a vacancy');
renderSaved=protectPermanent(renderSaved,'Sign in to save vacancies');
renderAccount=protectPermanent(renderAccount,'Sign in to manage an account');
renderEdit=protectPermanent(renderEdit,'Sign in to edit a vacancy');
renderAdmin=protectPermanent(renderAdmin,'Sign in to access administration');
toggleSave=protectPermanent(toggleSave,'Sign in to save vacancies');

const guestHeaderBefore=bindHeader;
bindHeader=function(){
  guestHeaderBefore();
  const auth=document.querySelector('#authButton');
  if(auth&&isGuestUser()){auth.textContent='Sign in';auth.onclick=()=>nav('auth')}
};
