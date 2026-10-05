let activeVacancyCategory='all';

function vacancyCategory(v){
  const value=`${v?.property?.propertyType||''} ${v?.room?.roomType||''}`.toLowerCase();
  if(/shop|retail|commercial|store/.test(value))return'shop';
  if(/apartment|studio|flat|bedsitter/.test(value))return'apartment';
  if(/house|maisonette|room|hostel/.test(value))return'home';
  return'other';
}

function categoryMeta(category){
  return {shop:['shop','Shop'],apartment:['building','Apartment'],home:['house','Home'],other:['location-pin','Other']}[category]||['location-pin','Other'];
}

function stage64Icon(name,className='control-icon'){
  return `<svg class="${className}" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
}

const pinIconBefore64=pinIcon;
pinIcon=function(v,selected=false){
  const category=vacancyCategory(v),[symbol,label]=categoryMeta(category),price=escapeHtml(markerPrice(v));
  return L.divIcon({className:'vacancy-marker',html:`<div class="map-pin category-${category} ${selected?'selected':''}" data-marker-price="${price}" aria-label="${label}">${stage64Icon(symbol,'marker-category-icon')}<span>${price}</span></div>`,iconSize:[96,38],iconAnchor:[48,38]});
};

function installCategoryFilter(){
  const filters=document.querySelector('#discoveryFilters');
  if(!filters||filters.querySelector('.category-filter'))return;
  const group=document.createElement('div');
  group.className='category-filter';
  group.setAttribute('aria-label','Vacancy category');
  group.innerHTML=[['all','location-pin','All'],['home','house','Homes'],['apartment','building','Apartments'],['shop','shop','Shops'],['other','location-pin','Other']].map(([value,icon,label])=>`<button type="button" data-category="${value}" class="${value===activeVacancyCategory?'active':''}">${stage64Icon(icon)}<span>${label}</span></button>`).join('');
  filters.prepend(group);
  group.onclick=event=>{const button=event.target.closest('[data-category]');if(!button)return;activeVacancyCategory=button.dataset.category;group.querySelectorAll('button').forEach(item=>item.classList.toggle('active',item===button));applySearch()};
}

function polishDiscovery64(){
  const removeRecommendations=()=>{document.querySelector('#locationSuggestions')?.remove();document.querySelector('#q')?.removeAttribute('list');document.querySelector('.quick-searches')?.remove();document.querySelector('.user-location-status')?.remove()};
  removeRecommendations();
  installCategoryFilter();
  const shell=document.querySelector('.map-first-shell'),filters=document.querySelector('#discoveryFilters'),toggle=document.querySelector('#filtersToggle'),resultsToggle=document.querySelector('#resultsFiltersToggle');
  if(shell&&!shell.dataset.stage64Cleanup){shell.dataset.stage64Cleanup='true';new MutationObserver(removeRecommendations).observe(shell,{childList:true,subtree:true})}
  if(shell&&filters){
    const sync=()=>shell.classList.toggle('filters-open',!filters.hidden);
    new MutationObserver(sync).observe(filters,{attributes:true,attributeFilter:['hidden']});
    [toggle,resultsToggle].forEach(button=>button?.addEventListener('click',()=>setTimeout(sync,0)));
    sync();
  }
}

const renderHomeBefore64=renderHome;
renderHome=function(){renderHomeBefore64();polishDiscovery64()};

function addListingCategories(start){
  const grid=start?.querySelector('.listing-type-grid');if(!grid||grid.dataset.stage64)return;grid.dataset.stage64='true';
  const types=[['Residential','house'],['House','house'],['Shop','shop'],['Other','location-pin']];
  grid.innerHTML=types.map(([type,icon])=>`<button type="button" data-listing-type="${type}">${stage64Icon(icon)}<span>${type==='Residential'?'Room / apartment':type}</span>${type==='Residential'?'<small>Studio, 1bdrm, 2brm, more</small>':''}</button>`).join('');
  const custom=document.createElement('label');custom.className='custom-listing-type';custom.hidden=true;custom.innerHTML='Category name<input maxlength="40" placeholder="e.g. Office, stall or warehouse">';grid.after(custom);
  grid.addEventListener('click',event=>{const button=event.target.closest('[data-listing-type]');custom.hidden=button?.dataset.listingType!=='Other';if(!custom.hidden)custom.querySelector('input').focus()},true);
}

function improveComposer64(form){
  if(!form||form.dataset.stage64)return;form.dataset.stage64='true';
  form.querySelector('.listing-steps')?.classList.add('compact-progress');
  const propertySection=[...form.querySelectorAll('.composer-section')].find(x=>x.querySelector('summary strong')?.textContent==='Property details');
  const unitSection=[...form.querySelectorAll('.composer-section')].find(x=>x.querySelector('summary strong')?.textContent==='Unit & availability');
  const propertyBody=propertySection?.querySelector('.composer-section-body'),unitBody=unitSection?.querySelector('.composer-section-body');
  const propertyType=form.querySelector('[name="propertyType"]');
  if(propertyType){propertyType.closest('label').classList.add('derived-property-type');propertyType.tabIndex=-1;propertyType.setAttribute('aria-hidden','true')}
  if(propertyBody){
    const advanced=[...propertyBody.querySelectorAll('.advanced-unit-settings')].find(x=>x.textContent.includes('Advanced property'));
    const household=form.querySelector('[name="household"]')?.closest('.optional-listing-field')||form.querySelector('[name="household"]')?.closest('label');
    const minStay=form.querySelector('[data-base-name="minimumStayWeeks"], [name="minimumStayWeeks"]')?.closest('.optional-listing-field');
    if(advanced){[household,minStay].filter(Boolean).forEach(item=>advanced.querySelector('.advanced-settings-body').append(item));advanced.open=false}
    const names=[['.property-features','Features'],['.property-utilities','Utilities'],['.property-rules','Rules']];
    names.forEach(([selector,label])=>{const section=propertyBody.querySelector(selector);if(section){section.open=false;section.querySelector('summary>span:first-child')&&(section.querySelector('summary>span:first-child').textContent=label);section.querySelector('.add-more-choice')?.remove()}});
  }
  if(unitBody){
    const advanced=[...unitBody.querySelectorAll('.advanced-unit-settings')][0];
    if(advanced){advanced.querySelector('summary').firstChild.textContent='Advanced unit settings ';advanced.open=false;if(!advanced.querySelector('.inheritance-note'))advanced.querySelector('.advanced-settings-body').insertAdjacentHTML('afterbegin','<p class="inheritance-note">Smoking and pet rules inherit from the property unless you override them for this unit.</p>')}
    const choices=unitBody.querySelector('.unit-photo-choices');if(choices){choices.open=false;choices.querySelector('summary').firstChild.textContent='Photos for this unit '}
  }
  const preview=form.querySelector('.listing-preview-action'),output=form.querySelector('.listing-draft-preview');
  preview?.addEventListener('click',()=>{output?.classList.remove('preview-error-bar');if(output&&output.offsetWidth<200)output.classList.add('preview-error-bar')});
  const publish=form.querySelector('.listing-submit-actions button.primary, button.primary.wide');
  form.addEventListener('submit',()=>{if(publish)publish.dataset.stage64Publishing='true'});
}

function polishListingManager64(host){
  host?.querySelectorAll('.property-tree .muted').forEach(node=>{node.innerHTML=node.innerHTML.replace(/\s*·\s*VAC-P-[A-Z0-9-]+/g,'')});
  host?.querySelectorAll('.room-manage-copy small').forEach(node=>node.remove());
  host?.querySelectorAll('[data-edit]').forEach(button=>{if(button.closest('.room-manage-copy'))return;button.className='icon-button edit-icon-action';button.innerHTML=stage64Icon('pencil');button.setAttribute('aria-label','Edit listing');button.title='Edit listing'});
  host?.querySelectorAll('[data-delete]').forEach(button=>{button.className='icon-button danger';button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-9 0 1 14h10l1-14M10 11v6m4-6v6"/></svg>';button.setAttribute('aria-label','Delete archived listing');button.title='Delete archived listing'});
  host?.querySelectorAll('[data-status="paused"]').forEach(button=>{button.className='icon-button pause-icon-action';button.innerHTML=stage64Icon('pause');button.setAttribute('aria-label','Pause listing');button.title='Pause listing'});
}

document.addEventListener('vacancy:inventory-rendered',()=>polishListingManager64(document.querySelector('#mine')));

const renderListBefore64=renderList;
renderList=async function(){await renderListBefore64();const host=document.querySelector('#listingHost');addListingCategories(host?.querySelector('.listing-start'));host?.querySelectorAll('form').forEach(improveComposer64);polishListingManager64(document.querySelector('#mine'));if(host&&!host.dataset.stage64Observer){host.dataset.stage64Observer='true';new MutationObserver(()=>{addListingCategories(host.querySelector('.listing-start'));host.querySelectorAll('form').forEach(improveComposer64)}).observe(host,{childList:true,subtree:true})}};

function showPublishedCheck(){
  const toastNode=document.querySelector('#toast');if(!toastNode||toastNode.dataset.stage64Watch)return;toastNode.dataset.stage64Watch='true';
  new MutationObserver(()=>{if(!/published/i.test(toastNode.textContent))return;const done=document.createElement('div');done.className='publish-success';done.innerHTML='<span>✓</span><strong>Listing published</strong>';document.body.append(done);setTimeout(()=>done.remove(),1200)}).observe(toastNode,{childList:true,subtree:true,characterData:true});
}

function renderAuth64(){
  const upgradeKey='vacancy-guest-upgrade-pending';
  const pendingGuestId=localStorage.getItem(upgradeKey);
  if(pendingGuestId&&currentUser&&!currentUser.is_anonymous){
    if(currentUser.id!==pendingGuestId){localStorage.removeItem(upgradeKey);nav('account');return}
    layout(`<section class="auth-simple"><form id="authUnified" class="form-grid"><h1>Finish your account</h1><p class="wide">Your email is confirmed. Set a password to keep your chats when you sign in again.</p><label>Password<input name="password" type="password" required minlength="12" autocomplete="new-password" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{12,}"></label><button class="primary wide">Finish account</button></form></section>`);
    const form=document.querySelector('#authUnified');
    form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('button');button.disabled=true;try{await VACANCY_BACKEND.setGuestUpgradePassword(form.elements.password.value);localStorage.removeItem(upgradeKey);await refreshIdentity();toast('Account ready. Your chats are saved.');nav('messages')}catch(error){toast(error.message);button.disabled=false}};
    return;
  }
  if(currentUser&&!currentUser.is_anonymous){nav('account');return}
  const notice=VACANCY_RECOVERY.takeAuthNotice();
  layout(`<section class="auth-simple"><a class="auth-brand" href="#home" aria-label="Vacancy home"><span class="brand-logo-stack" aria-hidden="true"><img class="brand-logo" src="assets/vacancy-logo.png" alt=""></span></a>${notice?`<p id="authNotice" role="status">${escapeHtml(notice)}</p>`:''}<form id="authUnified" class="form-grid" data-mode="signin"><h1>Sign in</h1><button type="button" class="google-auth-action wide" hidden><svg class="google-brand-icon" aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.12H3.05v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.92A6 6 0 0 1 6.07 12c0-.67.12-1.32.32-1.92V7.49H3.05A10 10 0 0 0 2 12c0 1.61.38 3.14 1.05 4.51l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.83 1.5L18.7 4.6A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.95 5.49l3.34 2.59C7.18 7.72 9.39 5.96 12 5.96Z"/></svg>Continue with Google</button><div class="auth-divider wide" hidden><span>or use email</span></div><label class="signup-only" hidden>Name<input name="name" maxlength="80" autocomplete="name"></label><label>Email<input name="email" type="email" required autocomplete="email"></label><label>Password<input name="password" type="password" required autocomplete="current-password"><small id="signupPasswordHelp" hidden>Use at least 12 characters, with uppercase and lowercase letters and a number.</small></label><a class="forgot-link" href="#forgot-password">Forgot password?</a><button class="primary wide">Sign in</button><button type="button" class="auth-mode-switch">Create account</button><p class="auth-confirmation-note" hidden>You may need to confirm your email before signing in.</p></form></section>`);
  const form=document.querySelector('#authUnified'),switcher=form.querySelector('.auth-mode-switch'),nameRow=form.querySelector('.signup-only'),note=form.querySelector('.auth-confirmation-note'),heading=form.querySelector('h1'),submit=form.querySelector('.primary'),password=form.elements.password;
  const google=form.querySelector('.google-auth-action'),divider=form.querySelector('.auth-divider');google.onclick=()=>location.assign(VACANCY_BACKEND.googleOAuthUrl());VACANCY_BACKEND.googleProviderReady().then(ready=>{if(!form.isConnected)return;google.hidden=!ready;divider.hidden=!ready});
  const nameInput=nameRow.querySelector('input'),validateName=()=>nameInput.setCustomValidity(form.dataset.mode==='signup'&&!nameInput.value.trim()?'Enter your name.':'');nameInput.addEventListener('input',validateName);
  switcher.onclick=()=>{const signup=form.dataset.mode!=='signup';form.dataset.mode=signup?'signup':'signin';nameRow.hidden=!signup;nameRow.querySelector('input').required=signup;note.hidden=!signup;heading.textContent=signup?'Create account':'Sign in';submit.textContent=signup?'Create account':'Sign in';switcher.textContent=signup?'Already have an account? Sign in':'Create account';password.closest('label').hidden=signup&&Boolean(currentUser?.is_anonymous);password.required=!(signup&&currentUser?.is_anonymous);password.autocomplete=signup?'new-password':'current-password';password.minLength=signup&&!currentUser?.is_anonymous?12:0;if(signup&&!currentUser?.is_anonymous){password.pattern='(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{12,}';password.setAttribute('aria-describedby','signupPasswordHelp')}else{password.removeAttribute('pattern');password.removeAttribute('aria-describedby')}form.querySelector('#signupPasswordHelp').hidden=!(signup&&!currentUser?.is_anonymous);validateName();if(signup&&currentUser?.is_anonymous)note.textContent='We will email you a confirmation link. Return to this browser to set your password and keep your chats.'};
  form.onsubmit=async event=>{event.preventDefault();if(form.dataset.busy)return;form.dataset.busy='true';submit.disabled=true;const data=Object.fromEntries(new FormData(form));data.name=String(data.name||'').trim();try{if(form.dataset.mode==='signup'){if(currentUser?.is_anonymous){await VACANCY_BACKEND.updateGuestEmail(data);localStorage.setItem(upgradeKey,currentUser.id);toast('Check your email, then return here to finish your account')}else{const result=await VACANCY_BACKEND.signUp(data);if(result.access_token){await refreshIdentity();toast('Account created');nav('home')}else toast('Check your email to confirm the account')}}else{await VACANCY_BACKEND.signIn(data);localStorage.removeItem(upgradeKey);await refreshIdentity();toast('Signed in');nav('home')}}catch(error){toast(error.message)}finally{delete form.dataset.busy;submit.disabled=false}};
}

renderAuth=renderAuth64;

function openMediaLightbox(images,start=0){
  if(!images.length)return;let index=Math.max(0,Math.min(start,images.length-1));
  const overlay=document.createElement('div');overlay.className='edit-media-lightbox';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Listing photo viewer');
  const paint=()=>{overlay.innerHTML=`<button type="button" class="lightbox-close" aria-label="Close photo viewer">×</button><button type="button" class="lightbox-prev" aria-label="Previous photo">‹</button><img src="${escapeHtml(images[index])}" alt="Listing photo ${index+1} of ${images.length}"><span>${index+1}/${images.length}</span><button type="button" class="lightbox-next" aria-label="Next photo">›</button>`;overlay.querySelector('.lightbox-close').onclick=()=>overlay.remove();overlay.querySelector('.lightbox-prev').onclick=()=>{index=(index-1+images.length)%images.length;paint()};overlay.querySelector('.lightbox-next').onclick=()=>{index=(index+1)%images.length;paint()}};
  overlay.onclick=event=>{if(event.target===overlay)overlay.remove()};document.body.append(overlay);paint();overlay.querySelector('.lightbox-close').focus();
}

document.addEventListener('click',event=>{const target=event.target.closest('.media-manager img,[data-view-media]');if(!target)return;const manager=target.closest('.media-manager'),articles=[...manager.querySelectorAll('[data-media-id]')],article=target.closest('[data-media-id]'),images=articles.map(item=>item.querySelector('img')?.src).filter(Boolean);event.preventDefault();event.stopImmediatePropagation();openMediaLightbox(images,Math.max(0,articles.indexOf(article)))},true);

const renderEditBefore64=renderEdit;
renderEdit=async function(id){await renderEditBefore64(id);const form=document.querySelector('#editListingForm');if(!form)return;const headings=[...form.querySelectorAll(':scope > h2')];for(const heading of headings){const details=document.createElement('details');details.className='edit-form-group wide';details.open=heading===headings[0];details.innerHTML=`<summary>${escapeHtml(heading.textContent)}<span>Tap to ${details.open?'close':'open'}</span></summary><div class="edit-form-group-body form-grid"></div>`;heading.before(details);const body=details.lastElementChild;let node=heading.nextElementSibling;heading.remove();while(node&&node.tagName!=='H2'&&!node.matches('.row')){const next=node.nextElementSibling;body.append(node);node=next}details.addEventListener('toggle',()=>details.querySelector('summary span').textContent=`Tap to ${details.open?'close':'open'}`)}const panel=form.closest('.panel'),title=form.elements.roomName?.value||'Listing';panel?.classList.add('edit-listing-shell');panel?.querySelector('h1')?.insertAdjacentHTML('afterend',`<span class="edit-property-pill">${escapeHtml(title)}</span><button type="button" class="ghost edit-add-unit">+ Add unit</button>`);panel?.querySelector('.edit-add-unit')?.addEventListener('click',()=>nav('list'))};
showPublishedCheck();
