(() => {
  const serviceIcon=name=>`<svg class="service-icon" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
  const baseCard=card;
  card=function(v){
    const savedState=saved.has(v.id),place=listingLocation(v),currency=Object.values(MARKETS).find(item=>item.currency===v.rentCurrency)||marketForCountry(v.property.country);
    const allServices=[[v.property.parkingSpaces>0,'parking','Parking'],[v.property.securityAvailable,'shield','Security'],[v.property.internetAvailable,'wifi','Internet'],[v.property.waterAvailable,'water','Water'],[v.property.electricityAvailable,'bolt','Electricity'],[v.room.furnished,'furnished','Furnished'],[v.room.ensuite,'shower','Ensuite']].filter(item=>item[0]);
    const deposit=v.deposit!=null&&Number(v.deposit)>0?`<span class="deposit-card-pill"><span class="deposit-long">Deposit</span><span class="deposit-short">Dep.</span> ${currency.currencyLabel} ${Number(v.deposit).toLocaleString(currency.locale)}</span>`:'';
    const distance=typeof distanceTo==='function'?distanceTo(v):null,unit=typeof distanceUnit==='function'?distanceUnit():'km',shownDistance=distance==null?'':`${(unit==='mi'?distance/1.609344:distance).toFixed(1)} ${unit} away`;
    return `<article class="card listing-card" data-open-card="${v.id}" role="link" tabindex="0" aria-label="Open ${escapeHtml(v.room.name)}"><div class="listing-visual">${cardMedia(v)}<button class="heart-action${savedState?' saved':''}" data-save="${v.id}" aria-label="${savedState?'Remove from saved':'Save'} ${escapeHtml(v.room.name)}" aria-pressed="${savedState}"><svg class="nav-icon nav-icon--fillable" aria-hidden="true"><use href="#icon-saved"></use></svg></button></div><div class="card-body"><div class="listing-location" title="${escapeHtml(place)}">${serviceIcon('location-pin')}${escapeHtml(place)}</div><h3>${escapeHtml(v.room.roomType||v.room.name||'Unit')}</h3><div class="price listing-price">${formatListingPrice(v)}</div>${shownDistance?`<div class="listing-distance list-detail">${escapeHtml(shownDistance)}</div>`:''}<div class="listing-highlights">${allServices.map(([,name,label],index)=>`<span class="service-card-pill ${index>1?'list-detail':''}" title="${label}">${serviceIcon(name)}<span class="sr-only">${label}</span></span>`).join('')}${deposit}</div></div></article>`;
  };

  const homeWithTools=renderHome;
  renderHome=function(){homeWithTools();document.querySelector('.quick-searches')?.remove()};

  function applyListingType(form,type){
    const map={Room:{unit:'Room',property:'House'},Studio:{unit:'Studio',property:'Apartment'},Apartment:{unit:'1 bedroom',property:'Apartment'},House:{unit:'House',property:'House'}}[type]||{};
    const unit=form.querySelector('[data-base-name="unitType"], [name="unitType"]'),property=form.querySelector('[name="propertyType"]');
    if(unit&&[...unit.options].some(option=>option.value===map.unit||option.textContent===map.unit)){unit.value=map.unit;unit.dispatchEvent(new Event('change',{bubbles:true}))}
    if(property&&[...property.options].some(option=>option.value===map.property||option.textContent===map.property)){property.value=map.property;property.dispatchEvent(new Event('change',{bubbles:true}))}
  }

  function addAddressSuggestions(form){
    const input=form.querySelector('[name="address"]');if(!input||input.dataset.suggestions)return;input.dataset.suggestions='true';
    const results=document.createElement('div');results.className='address-autocomplete';results.hidden=true;input.after(results);let timer,request=0;
    input.addEventListener('input',()=>{clearTimeout(timer);results.hidden=true;const query=input.value.trim();if(query.length<3)return;timer=setTimeout(async()=>{const current=++request;results.hidden=false;results.textContent='Finding address…';try{const response=await fetch(`/api/geocode?q=${encodeURIComponent(query)}`),place=await response.json();if(current!==request)return;if(!response.ok)throw new Error(place.error||'Address not found');results.innerHTML=`<button type="button">${escapeHtml(place.label)}</button>`;results.querySelector('button').onclick=()=>{input.value=place.label;form.querySelector('#newPropertyMap')?._vacancySetLocation?.(place.lat,place.lon,false);results.hidden=true;input.dispatchEvent(new Event('change',{bubbles:true}))}}catch(error){if(current===request){results.textContent=error.message;results.classList.add('error')}}},500)});
  }

  function installListingStart(host){
    if(!host||host.dataset.stage59Start)return;host.dataset.stage59Start='true';const initial=[...host.children];initial.forEach(node=>node.hidden=true);
    const start=document.createElement('section');start.className='listing-start';start.innerHTML=`<h2>What are you listing?</h2><div class="listing-type-grid">${['Room','Studio','Apartment','House'].map(type=>`<button type="button" data-listing-type="${type}">${type}</button>`).join('')}</div><div class="listing-add-choice" hidden><h2>Add to</h2><div><button type="button" data-add-mode="existing" ${window.__listingProperties?.length?'':'disabled'}>Existing property</button><button type="button" data-add-mode="new">New property</button></div></div>`;host.prepend(start);let selected='';
    start.onclick=event=>{const typeButton=event.target.closest('[data-listing-type]');if(typeButton){selected=typeButton.dataset.listingType;start.querySelectorAll('[data-listing-type]').forEach(button=>button.classList.toggle('selected',button===typeButton));start.querySelector('.listing-add-choice').hidden=false;return}const mode=event.target.closest('[data-add-mode]')?.dataset.addMode;if(!mode||!selected)return;let form;if(mode==='new'){const create=initial[0]?.querySelector('#createProperty');if(create)create.click();else initial.forEach(node=>node.hidden=false);form=host.querySelector('#listingForm');if(form){applyListingType(form,selected);addAddressSuggestions(form)}}else{initial.forEach(node=>node.hidden=false);form=host.querySelector('#existingListingForm');if(form){applyListingType(form,selected);form.hidden=false}}if(!start.isConnected)host.prepend(start);start.classList.add('complete');start.querySelectorAll('button').forEach(button=>button.disabled=true);form?.scrollIntoView({behavior:'smooth',block:'start'})};
  }

  const listWithStage58=renderList;
  renderList=async function(){await listWithStage58();installListingStart(document.querySelector('#listingHost'))};
})();
