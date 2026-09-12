let vacancyAudience='renter';

const renderHomeBefore73=renderHome;
renderHome=function(){
  renderHomeBefore73();
  document.querySelector('#locationSuggestions')?.remove();
  document.querySelector('#q')?.removeAttribute('list');
  document.querySelector('.quick-searches')?.remove();
  document.querySelector('.user-location-status')?.remove();
};

function applyAudienceNavigation(){
  const item=document.querySelector('.mobile-nav [data-nav="saved"],.mobile-nav [data-audience-slot]');
  if(!item)return;
  item.dataset.audienceSlot='true';
  if(vacancyAudience==='lister'){
    item.dataset.nav='list';
    item.innerHTML='<svg class="nav-icon" aria-hidden="true"><use href="#icon-building"></use></svg><span>Listings</span>';
    item.setAttribute('aria-label','Your listing dashboard');
  }else{
    item.dataset.nav='saved';
    item.innerHTML='<svg class="nav-icon nav-icon--fillable" aria-hidden="true"><use href="#icon-saved"></use></svg><span>Saved</span>';
    item.setAttribute('aria-label','Saved listings');
  }
  item.onclick=()=>nav(item.dataset.nav);
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
renderList=async function(){await renderListBefore73();enhanceListingJourney()};
