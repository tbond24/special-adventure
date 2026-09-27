let vacancyAudience='renter';

const renderHomeBefore73=renderHome;
renderHome=function(){
  renderHomeBefore73();
  if(!currentUser){vacancyAudience='renter';applyAudienceNavigation()}
  document.querySelector('#locationSuggestions')?.remove();
  document.querySelector('#q')?.removeAttribute('list');
  document.querySelector('.quick-searches')?.remove();
  document.querySelector('.user-location-status')?.remove();
};

function applyAudienceNavigation(){
  const lister=vacancyAudience==='lister'&&currentUser&&!currentUser.is_anonymous;
  document.querySelectorAll('.mobile-nav [data-audience-home],.desktop-nav [data-audience-home],.mobile-nav [data-nav="home"],.desktop-nav [data-nav="home"],.mobile-nav [data-nav="dashboard"],.desktop-nav [data-nav="dashboard"]').forEach(item=>{
    item.dataset.audienceHome='true';
    item.dataset.nav=lister?'dashboard':'home';
    item.innerHTML=lister
      ? '<svg class="nav-icon" aria-hidden="true"><use href="#icon-card-grid"></use></svg><span>Dashboard</span>'
      : '<svg class="nav-icon" aria-hidden="true"><use href="#icon-find"></use></svg><span>Find</span>';
    item.setAttribute('aria-label',lister?'Lister dashboard':'Find vacancies');
    item.onclick=()=>nav(item.dataset.nav);
  });
  const item=document.querySelector('.mobile-nav [data-nav="saved"],.mobile-nav [data-audience-slot]');
  if(!item)return;
  item.dataset.audienceSlot='true';
  if(lister){
    item.dataset.nav='list';
    item.innerHTML='<svg class="nav-icon" aria-hidden="true"><use href="#icon-building"></use></svg><span>Listings</span>';
    item.setAttribute('aria-label','Your listings');
  }else{
    item.dataset.nav='saved';
    item.innerHTML='<svg class="nav-icon nav-icon--fillable" aria-hidden="true"><use href="#icon-saved"></use></svg><span>Saved</span>';
    item.setAttribute('aria-label','Saved listings');
  }
  item.onclick=()=>nav(item.dataset.nav);
}

async function renderListerDashboard(){
  if(!currentUser||currentUser.is_anonymous){vacancyAudience='renter';applyAudienceNavigation();nav('home');return}
  let rows;
  try{rows=await VACANCY_BACKEND.myVacancies()}catch{toast('Could not load your listings');nav('home');return}
  if(parseHash().name!=='dashboard')return;
  if(!rows.length){vacancyAudience='renter';applyAudienceNavigation();nav('home');return}
  vacancyAudience='lister';
  const active=rows.filter(row=>row.status==='active').length;
  const paused=rows.filter(row=>row.status==='paused').length;
  layout('<section class="account-page"><div class="section-head"><h1>Dashboard</h1></div><div class="pref-grid"><div class="pref-item"><strong>'+rows.length+'</strong><span>Your listings</span></div><div class="pref-item"><strong>'+active+'</strong><span>Active</span></div><div class="pref-item"><strong>'+paused+'</strong><span>Paused</span></div></div><div class="account-grid"><button class="account-action" data-owner-listings><div><strong>Manage listings</strong><span>View and edit your vacancies</span></div><b>›</b></button><button class="account-action" data-owner-inbox><div><strong>Inbox</strong><span>Messages about your listings</span></div><b>›</b></button><button class="account-action" data-owner-find><div><strong>Find</strong><span>Browse vacancies</span></div><b>›</b></button></div></section>');
  applyAudienceNavigation();
  bindHeader();
  document.querySelector('[data-owner-listings]').onclick=()=>nav('list');
  document.querySelector('[data-owner-inbox]').onclick=()=>nav('messages');
  document.querySelector('[data-owner-find]').onclick=()=>nav('home');
}
async function detectAudience(){
  vacancyAudience='renter';
  if(currentUser&&!currentUser.is_anonymous){
    try{vacancyAudience=(await VACANCY_BACKEND.myVacancies()).length?'lister':'renter'}catch{}
  }
  applyAudienceNavigation();
}

const refreshIdentityBefore73=refreshIdentity;
refreshIdentity=async function(){await refreshIdentityBefore73();await detectAudience()};

function enhanceListingJourney(){
  const start=document.querySelector('.listing-start');
  if(start&&!start.querySelector('.journey-kicker'))start.insertAdjacentHTML('afterbegin','<p class="journey-kicker">Step 1 of 5 · Type</p>');
  document.querySelectorAll('.listing-steps').forEach(steps=>{
    if(steps.dataset.stage73)return;
    steps.dataset.stage73='true';
    const names=['Property','Unit','Location','Review'];
    [...steps.querySelectorAll('button')].forEach((button,index)=>{
      const number=button.querySelector('b');
      if(number&&!button.classList.contains('complete'))number.textContent=String(index+2);
      const text=[...button.childNodes].find(node=>node.nodeType===Node.TEXT_NODE);
      if(text&&names[index])text.textContent=` ${names[index]}`;
    });
    const publish=document.createElement('span');
    publish.className='listing-publish-step';
    publish.innerHTML='<b>5</b> Publish';
    steps.append(publish);
  });
}

const renderListBefore73=renderList;
renderList=async function(){await renderListBefore73();enhanceListingJourney();await detectAudience()};
