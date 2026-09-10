(() => {
  const serviceIcon=name=>`<svg class="service-icon" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;

  function arrangeDiscoveryTools(){
    const toolbar=document.querySelector('.listing-toolbar'),sort=toolbar?.querySelector('.sort-control'),filter=toolbar?.querySelector('.results-filter-action');
    if(sort&&filter)filter.before(sort);
  }
  const homeBeforeStage60=renderHome;
  renderHome=function(){homeBeforeStage60();arrangeDiscoveryTools()};

  function organisePropertyPanel(form){
    const section=[...form.querySelectorAll('.composer-section')].find(item=>item.querySelector('summary strong')?.textContent==='Property details');if(!section)return;
    const body=section.querySelector('.composer-section-body'),continueButton=body.querySelector('.section-continue');
    const utilityNames=['waterAvailable','electricityAvailable','securityAvailable','internetAvailable'],rows=utilityNames.map(name=>body.querySelector(`select[name="${name}"]`)?.closest('.service-choice')).filter(Boolean);
    if(rows.length&&!body.querySelector('.property-utilities')){
      const utilities=document.createElement('details');utilities.className='property-utilities wide';utilities.innerHTML='<summary><span>Utilities</span><span class="utility-summary-icons" aria-label="Selected utilities"></span><small>Tap to open</small></summary><div class="property-utilities-body"></div>';
      const utilityBody=utilities.querySelector('.property-utilities-body'),icons=utilities.querySelector('.utility-summary-icons');rows[0].before(utilities);rows.forEach(row=>utilityBody.append(row));
      const render=()=>{const selected=utilityNames.map(name=>{const select=utilityBody.querySelector(`select[name="${name}"]`);if(select?.value!=='true')return'';const icon={waterAvailable:'water',electricityAvailable:'bolt',securityAvailable:'shield',internetAvailable:'wifi'}[name];return `<span title="${listingServiceMeta[name][0]}">${serviceIcon(icon)}</span>`}).join('');icons.innerHTML=selected||'<em>None selected</em>'};
      utilityBody.querySelectorAll('select').forEach(select=>select.addEventListener('change',render));utilities.addEventListener('toggle',()=>utilities.querySelector('small').textContent=utilities.open?'Tap to close':'Tap to open');render();
    }
    const advanced=[...body.querySelectorAll('.advanced-unit-settings')].find(item=>item.querySelector('summary')?.textContent.includes('Advanced property'));
    if(advanced){advanced.open=false;body.insertBefore(advanced,continueButton)}
  }

  function polishComposer(form){
    if(!form||form.dataset.stage60Ready)return;form.dataset.stage60Ready='true';organisePropertyPanel(form);
  }
  const listBeforeStage60=renderList;
  renderList=async function(){await listBeforeStage60();const host=document.querySelector('#listingHost');host?.querySelectorAll('form').forEach(polishComposer);if(host&&!host.dataset.stage60Observer){host.dataset.stage60Observer='true';new MutationObserver(()=>host.querySelectorAll('form').forEach(polishComposer)).observe(host,{childList:true,subtree:true})}};
})();
