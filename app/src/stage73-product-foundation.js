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
  // Both audiences use the same five destinations; owners see their summary on List.
  document.querySelectorAll('.mobile-nav [data-audience-home],.desktop-nav [data-audience-home],.mobile-nav [data-nav="home"],.desktop-nav [data-nav="home"],.mobile-nav [data-nav="dashboard"],.desktop-nav [data-nav="dashboard"]').forEach(item=>{
    item.dataset.audienceHome='true';
    item.dataset.nav='home';
    item.innerHTML='<svg class="nav-icon" aria-hidden="true"><use href="#icon-find"></use></svg><span>Find</span>';
    item.setAttribute('aria-label','Find vacancies');
    item.onclick=()=>nav(item.dataset.nav);
  });
  const item=document.querySelector('.mobile-nav [data-nav="saved"],.mobile-nav [data-audience-slot]');
  if(!item)return;
  item.dataset.audienceSlot='true';
  item.dataset.nav='saved';
  item.innerHTML='<svg class="nav-icon nav-icon--fillable" aria-hidden="true"><use href="#icon-saved"></use></svg><span>Saved</span>';
  item.setAttribute('aria-label','Saved listings');
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
