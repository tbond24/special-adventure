(() => {
  const icon=name=>`<svg class="service-icon" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
  const row=(name,text)=>`<li>${icon(name)}<span>${escapeHtml(text)}</span></li>`;

  const previousDetail=renderDetail;
  renderDetail=function(id){
    previousDetail(id);
    const v=vacancies.find(item=>item.id===id),summary=document.querySelector('.detail-summary'),gallery=document.querySelector('.detail-gallery');
    if(!v||!summary||!gallery)return;
    document.querySelector('.breadcrumbs')?.remove();
    const panel=summary.querySelector(':scope > .panel'),enquire=panel?.querySelector('.detail-primary-action');
    if(panel&&enquire){
      const location=panel.querySelector(':scope > .muted'),title=panel.querySelector('h1'),price=panel.querySelector('.price');
      [...panel.children].forEach(child=>child.remove());
      if(location)panel.append(location);if(title)panel.append(title);
      if(price){const line=document.createElement('div');line.className='detail-price-line';line.append(price);if(v.deposit!=null&&Number(v.deposit)>0){const shown=displayAmount(v.deposit,v.rentCurrency||marketForCountry(v.property.country).currency);line.insertAdjacentHTML('beforeend',`<span class="deposit-pill">Deposit ${shown.label} ${shown.value.toLocaleString(shown.locale)}</span>`)}panel.append(line)}
      panel.append(enquire);
    }
    const detailMap=document.querySelector('.detail-map-card');if(detailMap)summary.append(detailMap);
    document.querySelector('.detail-hero~.split')?.remove();
    const facts=[
      row('furnished',v.room.furnished?'Furnished':'Unfurnished'),
      row('shower',v.room.ensuite?'Private ensuite':'Shared bathroom'),
      row('bills',v.billsIncluded?'Utilities included':'Utilities charged separately'),
      row('water',v.property.waterAvailable?'Water available':'Water availability not confirmed'),
      row('bolt',v.property.electricityAvailable?'Electricity available':'Electricity not confirmed'),
      row('shield',v.property.securityAvailable?'Security provided':'Security not confirmed'),
      row('wifi',v.property.internetAvailable?'Internet / fibre available':'Internet not included'),
      row('smoking',v.property.smokingAllowed?'Smoking allowed':'No smoking allowed'),
      row('pets',v.property.petsConsidered?'Pets considered':'Pets not allowed')
    ];
    if(Number(v.property.parkingSpaces)>0)facts.splice(3,0,row('parking',`${v.property.parkingSpaces} parking space${Number(v.property.parkingSpaces)===1?'':'s'}`));
    const about=String(v.property.householdSummary||'').trim();
    summary.insertAdjacentHTML('afterend',`<section class="listing-detail-sections">${about?`<section class="detail-flat-section"><h2>About the property</h2><p>${escapeHtml(about)}</p></section>`:''}<section class="detail-flat-section"><h2>Utilities and access</h2><ul>${facts.join('')}</ul></section></section>`);
    const flag=document.querySelector('#listingSafetyToggle'),heart=document.querySelector('#saveDetail');if(flag){flag.classList.add('detail-gallery-flag');gallery.append(flag);if(heart)flag.style.top=`${Math.max(54,heart.offsetTop+heart.offsetHeight+8)}px`}
  };

  const previousHome=renderHome;
  renderHome=function(){
    previousHome();
    const old=document.querySelector('#distanceUnitToggle');
    if(old){const choices=document.createElement('div');choices.className='distance-unit-choices';choices.setAttribute('aria-label','Distance unit');choices.innerHTML='<button type="button" data-unit="km">KM</button><button type="button" data-unit="mi">MI</button>';old.replaceWith(choices);const paint=()=>choices.querySelectorAll('button').forEach(button=>button.classList.toggle('active',button.dataset.unit===distanceUnit()));choices.onclick=event=>{const button=event.target.closest('[data-unit]');if(!button)return;localStorage.setItem('vacancy-distance-unit-v1',button.dataset.unit);paint();syncRadiusUI();applySearch()};paint()}
  };

  const previousList=renderList;
  renderList=async function(){await previousList();const host=document.querySelector('#listingHost'),removeDuplicate=()=>document.querySelector('#useExisting')?.remove();removeDuplicate();if(host)new MutationObserver(removeDuplicate).observe(host,{childList:true,subtree:true})};
})();
