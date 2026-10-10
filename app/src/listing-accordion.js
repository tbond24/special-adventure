/* Listing test branch: reuse the live form controls and save contracts. */
(() => {
  const labels = {location:'Location and details',photos:'Photos',description:'Description, features & amenities',rent:'Rent & deposit',availability:'Availability'};
  const field = (unit, name) => unit.querySelector(`[data-base-name="${name}"]`);
  const text = (node, value) => { if (node && node._accordionText !== value) { node._accordionText=value; node.textContent=value; } };
  const units = form => [...form.querySelectorAll('.unit-editor')];
  const panel = (unit, key) => unit.querySelector(`:scope > .listing-accordion-section[data-part="${key}"]`);
  function unwrapUnit(unit) {
    unit.querySelectorAll(':scope > .listing-accordion-section').forEach(section => {
      unit.append(...section.querySelector('.listing-accordion-panel').children);
      section.remove();
    });
    unit.querySelector(':scope > .listing-optional-label')?.remove();
  }
  function install(form, journey) {
    if (form._listingAccordion) return;
    form.classList.add('listing-accordion');
    const {sections, show:showJourney, validate, title, stageHeading, controls} = journey;
    const show=(...args)=>{showJourney(...args);delete title._accordionText;};
    const shared = document.createElement('div');
    shared.className = 'accordion-shared-fields';
    const propertyName = form.querySelector('[name="propertyTitle"]')?.closest('label');
    [sections.location, sections.property, propertyName, form.querySelector('#propertyChoice')?.closest('label'),form.querySelector('#inheritSummary')].filter(Boolean).forEach(node => shared.append(node));
    const subtitle = document.createElement('p');
    subtitle.className = 'listing-accordion-subtitle';
    stageHeading.after(subtitle);
    const warning = document.createElement('p');
    warning.className = 'listing-test-notice';
    warning.textContent = 'Test preview · Connected to the live Vacancy database. Publishing or editing changes real listings.';
    form.prepend(warning);
    const hint = document.createElement('p');
    hint.className = 'listing-review-hint';
    controls.prepend(hint);
    const next = controls.querySelector('.journey-next');
    next.textContent = 'Review unit';
    const back = stageHeading.querySelector('.journey-back');
    back.setAttribute('aria-label','Back to unit details');
    function createSection(unit, key) {
      const section = document.createElement('details');
      section.className = 'listing-accordion-section wide';
      section.dataset.part = key;
      section.innerHTML = `<summary><span class="listing-section-copy"><span class="listing-section-title">${labels[key]}</span><span class="listing-section-summary"></span></span><span class="listing-section-status"></span><span class="listing-section-arrow" aria-hidden="true">›</span></summary><div class="listing-accordion-panel"></div>`;
      unit.append(section);
      return section;
    }
    function wrapUnit(unit, index) {
      const active = unit.dataset.openAccordion || '';
      // Existing add/duplicate logic arranges controls before calling refresh.
      // Reparent those exact nodes; never rebuild inputs or submit handlers.
      const sections = Object.fromEntries(Object.keys(labels).map(key => [key,panel(unit,key)||createSection(unit,key)]));
      const move = (key,node) => { const target=sections[key].querySelector('.listing-accordion-panel'); if (node && node.parentElement!==target) target.append(node); };
      if (index === 0) move('location',shared);
      move('location',unit.querySelector('.unit-toolbar'));
      move('location',field(unit,'roomName')?.closest('label'));
      ['.unit-media-toolbar','.unit-photo-hint','.unit-photo-choices','.unit-media-source','.edit-existing-photos'].forEach(selector => move('photos',unit.querySelector(selector)));
      move('description',field(unit,'description')?.closest('label'));
      ['.unit-features','.unit-utilities','.unit-rules'].forEach(selector => move('description',unit.querySelector(selector)));
      move('rent',unit.querySelector('.rent-control'));
      move('rent',unit.querySelector('.deposit-control'));
      move('rent',unit.querySelector('.listing-compare-editor'));
      // Keep every existing advanced control reachable, including minimum stay,
      // occupants, property notes and private property nickname.
      move('availability',unit.querySelector(':scope > .advanced-unit-settings') || unit.querySelector('.advanced-unit-settings:not(.shared-property-control)'));
      const available = field(unit,'availableFrom')?.closest('.optional-listing-field');
      if (available) {
        move('availability',available);
        const label=available.querySelector('label'); if(label)label.hidden=false;
        available.querySelector(':scope > button')?.setAttribute('hidden','');
      }
      let optional=unit.querySelector(':scope > .listing-optional-label');
      if(!optional){optional=document.createElement('p');optional.className='listing-optional-label';optional.textContent='OPTIONAL DETAILS';sections.availability.before(optional);}
      for(const [key,section] of Object.entries(sections)) section.open=active===key;
      // Non-field hidden inputs stay directly in their owning fieldset.
      unit.querySelector('.unit-delete') && unit.append(unit.querySelector('.unit-delete'));
    }
    function locationInfo() {
      const property=(window.__listingProperties||[]).find(item=>item.id===form.querySelector('#propertyChoice')?.value);
      const place=property?[property.locality,property.city].filter(Boolean).join(', '):[form.elements.locality?.value,form.elements.city?.value].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(', ')||form.dataset.locationLabel||'';
      const lat=form.elements.publicLatitude?.value,lon=form.elements.publicLongitude?.value;
      return {place,valid:Boolean(property || (lat && lon && Number.isFinite(Number(lat)) && Number.isFinite(Number(lon))))};
    }
    function statuses(unit) {
      const read=name=>field(unit,name)?.value||'';
      const info=locationInfo();
      const count=(unit.querySelector('input[type=file]')?selectedPhotoFiles(unit.querySelector('input[type=file]')).length:0)+unit.querySelectorAll('.edit-existing-photo').length;
      const moneyText=value=>value.trim().replace(/,/g,'').replace(/^\./,'0.').replace(/\.$/,'');
      const rent=moneyText(read('rentAmount')),deposit=moneyText(read('deposit'));
      const moneyValid=/^\d+(\.\d+)?$/.test(rent)&&Number(rent)>0&&(!deposit||(/^\d+(\.\d+)?$/.test(deposit)&&Number(deposit)>=0));
      let details={};try{details=JSON.parse(read('unitDetails')||'{}')}catch{}
      const features=[...(details.amenities||[]),...(details.utilities||[])].map(item=>item.label).filter(Boolean);
      const identity=[read('unitType'),unit.querySelector('.unit-name-input')?.value].filter(Boolean).join(' · ');
      const period={month:'month',week:'week',night:'night'}[read('rentPeriod')]||read('rentPeriod');
      const price=moneyValid?`${read('rentCurrency')} ${Number(rent).toLocaleString()} / ${period} · ${deposit&&Number(deposit)===Number(rent)?'same deposit':deposit?Number(deposit).toLocaleString()+' deposit':'no deposit added'}`:'Add rent and deposit';
      return {location:{valid:info.valid,summary:[info.place,identity].filter(Boolean).join(' · ')||'Choose a location and add unit details'},photos:{valid:count>=3&&count<=8,summary:count?`${count} photo${count===1?'':'s'} added`:'Add at least 3 photos of this unit'},description:{valid:Boolean(read('description')||features.length),optional:true,summary:features.length?features.join(', '):read('description')?'Description added':'Add a description and unit features'},rent:{valid:moneyValid,summary:price},availability:{valid:!field(unit,'availableFrom')||field(unit,'availableFrom').validity.valid,summary:read('availableFrom')?'Available from '+read('availableFrom'):'Available now'}};
    }
    function update() {
      const all=units(form);const info=locationInfo();let firstMissing='';
      for(const unit of all){
        for(const [key,state] of Object.entries(statuses(unit))){
          const section=panel(unit,key);if(!section)continue;
          text(section.querySelector('.listing-section-summary'),state.summary);
          text(section.querySelector('.listing-section-status'),state.valid?'Done':state.optional?'Optional':'Required');
          section.dataset.complete=String(state.valid);
          section.dataset.optional=String(Boolean(state.optional));
          if(!state.valid&&!state.optional&&!firstMissing)firstMissing=key;
        }
      }
      text(subtitle,all.length===1?[field(all[0],'unitType')?.value,all[0].querySelector('.unit-name-input')?.value].filter(Boolean).join(' · '):`${all.length} units${info.place?' · '+info.place:''}`);
      const reviewing=form.dataset.journeyStep==='2';
      text(title,reviewing?(all.length>1?'Review units':'Review unit'):'Unit details');
      text(next,all.length>1?'Review units':'Review unit');
      text(hint,firstMissing?({location:'Add a location to review.',photos:'Add at least 3 photos per unit to review.',rent:'Check rent and deposit to review.',availability:'Check the availability date.'}[firstMissing]):'Ready to review.');
      next.disabled=Boolean(firstMissing)||form.dataset.accordionReviewing==='true';
      back.hidden=false;
      back.setAttribute('aria-label',reviewing?'Back to unit details':form.dataset.editVacancy?'Back to listings':'Back to listing choices');
      const submit=form.querySelector('.listing-submit-actions .primary');
      if(submit&&form.dataset.editVacancy){submit.dataset.idleLabel='Save changes';if(!submit.disabled)text(submit,'Save changes');}
      form.querySelector('.unit-add-choices')?.toggleAttribute('hidden',Boolean(form.dataset.editVacancy));
    }
    function refresh() { units(form).forEach(wrapUnit); update(); }
    form._listingAccordion={refresh,update,unwrapUnit};
    form.addEventListener('toggle',event=>{
      const section=event.target;if(!section.matches('.listing-accordion-section'))return;
      const unit=section.closest('.unit-editor');
      if(section.open){unit.dataset.openAccordion=section.dataset.part;form.querySelectorAll('.listing-accordion-section[open]').forEach(other=>{if(other!==section){other.open=false;delete other.closest('.unit-editor').dataset.openAccordion;}});unit.dataset.openAccordion=section.dataset.part;if(section.dataset.part==='location')requestAnimationFrame(()=>form.querySelector('#newPropertyMap')?._vacancyInvalidateSize?.());}
      else if(unit.dataset.openAccordion===section.dataset.part)delete unit.dataset.openAccordion;
      text(section.querySelector('.listing-section-arrow'),section.open?'⌃':'›');
    },true);
    const schedule=()=>queueMicrotask(update);
    ['input','change','click','vacancy:location-used','vacancy:apply-unit-options'].forEach(name=>form.addEventListener(name,schedule));
    form.addEventListener('invalid',event=>{const section=event.target.closest('.listing-accordion-section');if(section){show(1,true);let ancestor=event.target.parentElement;while(ancestor&&ancestor!==form){if(ancestor.matches('details'))ancestor.open=true;if(ancestor.matches('label[hidden]')&&ancestor.closest('.optional-listing-field')){ancestor.hidden=false;ancestor.parentElement.querySelector(':scope > button')?.setAttribute('aria-expanded','true');}ancestor=ancestor.parentElement;}update();}},true);
    // Photo additions/removals and edit hydration don't always dispatch input.
    const observer=new MutationObserver(schedule);
    observer.observe(form,{childList:true,subtree:true});
    next.onclick=async()=>{
      if(form.dataset.accordionReviewing==='true')return;
      form.dataset.accordionReviewing='true';update();
      try{if(await validate(0)&&await validate(1)){saveListingDraft(form);show(2);update();}}
      finally{delete form.dataset.accordionReviewing;update();}
    };
    back.onclick=async()=>{if(form.dataset.journeyStep==='2'){show(1);update();}else if(form.dataset.editVacancy){await saveAndExitListing(form,back);if(back.isConnected)back.textContent='←';}else{await saveAndExitListing(form,back,()=>form.querySelector('.listing-choice-breadcrumb button')?.click());if(back.isConnected)back.textContent='←';}};
    refresh();
    // The initial chooser can outlive the first IndexedDB read while the
    // composer still holds its photo input outside the unit. Restore again
    // after the real input has its final owning fieldset; preserve new files.
    const pendingMedia=form._draftMediaRestore;
    form._draftMediaRestore=Promise.resolve(pendingMedia).then(async()=>{
      if(!form.isConnected)return;
      let draft;try{draft=JSON.parse(localStorage.getItem(listingDraftKey(form))||'null');}catch{}
      if(draft?.savedMedia)await restoreDraftMedia(form,draft);
      update();
    });
    form._draftMediaRestore.catch(()=>{});
  }
  window.VACANCY_LISTING_ACCORDION={install,unwrapUnit};
})();
