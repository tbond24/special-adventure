(() => {
  const names = ['Location', 'Property details', 'Units', 'Pricing', 'Review'];
  const priceFields = new Set(['rentAmount', 'rentCurrency', 'rentPeriod', 'deposit', 'availableFrom', 'minimumStayWeeks']);
  const identityFields = new Set(['propertyTitle', 'propertyNickname', 'propertyType']);
  const baseName = control => control.dataset.baseName || control.name || '';
  const controlsIn = node => [...node.querySelectorAll('[name]')].map(baseName);
  const sectionByTitle = (form, title) => [...form.querySelectorAll('.composer-section')].find(section => section.dataset.journeySection === title || section.querySelector(':scope > summary strong')?.textContent === title);

  function tagFields(form) {
    const property = sectionByTitle(form, 'Property details');
    const unit = sectionByTitle(form, 'Unit & availability');
    if (property) property.dataset.journeySection = 'Property details';
    if (unit) unit.dataset.journeySection = 'Unit & availability';
    const location = sectionByTitle(form, 'Location');
    if (location) location.dataset.journeySection = 'Location';
    property?.querySelectorAll(':scope > .composer-section-body > *').forEach(child => {
      if (child.matches('.section-continue')) return;
      const fields = controlsIn(child);
      child.dataset.journeyRole = !child.matches('.advanced-unit-settings') && fields.some(name => identityFields.has(name)) ? 'property' : 'space';
    });
    unit?.querySelectorAll('.unit-editor').forEach(editor => {
      [...editor.children].forEach(child => {
        if (child.matches('legend, .unit-toolbar, .unit-delete')) return;
        const fields = controlsIn(child);
        child.dataset.journeyRole = child.matches('.unit-photo-choices, .unit-media-source') || fields.includes('images')
          ? 'media' : child.matches('.unit-features, .unit-utilities, .unit-rules, .advanced-unit-settings') ? 'space' : fields.some(name => priceFields.has(name)) ? 'pricing' : 'space';
      });
    });
    return {property, unit, location};
  }

  function installJourney(form) {
    if (form.dataset.journey101 || !form.closest('#listingHost')?.querySelector('.listing-start.complete')) return;
    form.dataset.journey101 = 'true';
    const host = form.closest('#listingHost');
    const propertyAdvanced = sectionByTitle(form, 'Property details')?.querySelector('.advanced-unit-settings .advanced-settings-body');
    const nicknameField = form.querySelector('.optional-listing-field:has([name=propertyNickname])');
    if (propertyAdvanced && nicknameField) {
      const label = nicknameField.querySelector('button span');
      if (label) label.textContent = 'Private manager nickname';
      propertyAdvanced.append(nicknameField);
    }
    const sections = tagFields(form);
    if(sections.property && sections.unit) {
      sections.property.before(sections.unit);
      const note=document.createElement('p');
      note.className='inheritance-note';
      note.dataset.journeyRole='space';
      note.textContent='Shared features and rules apply to every unit in this property.';
      sections.property.querySelector('.composer-section-body')?.prepend(note);
    }
    const heading = document.querySelector('main:has(#listingHost) .section-head h1');
    if (heading) heading.textContent = 'Complete your listing';
    document.querySelector('main:has(#listingHost)')?.classList.add('listing-journey-page');
    host.querySelector('.journey-kicker')?.remove();
    const breadcrumb = form.querySelector('.listing-choice-breadcrumb');
    const changeChoices = breadcrumb?.querySelector('button');
    if (changeChoices) changeChoices.textContent = 'Change';
    const chosenType = host.querySelector('[data-listing-type].selected');
    const chosenLabel = chosenType?.dataset.listingType === 'Residential'
      ? host.querySelector('[data-home-preset]')?.selectedOptions[0]?.textContent
      : chosenType?.querySelector('span')?.textContent;
    if (chosenLabel && breadcrumb?.querySelector('span')) breadcrumb.querySelector('span').textContent = chosenLabel;
    form.querySelector('.listing-steps')?.setAttribute('hidden', '');
    form.querySelectorAll('.section-continue').forEach(button => button.hidden = true);

    const title = document.createElement('h2');
    title.className = 'journey-current-title wide';
    const stageHeading = document.createElement('div');
    stageHeading.className = 'journey-stage-heading wide';
    stageHeading.innerHTML = '<button type="button" class="journey-back" aria-label="Previous step" title="Previous step">←</button>';
    stageHeading.append(title);
    form.querySelector('.listing-choice-breadcrumb')?.after(stageHeading);
    if (!stageHeading.isConnected) form.prepend(stageHeading);
    const controls = document.createElement('div');
    controls.className = 'journey-controls wide';
    controls.innerHTML = '<button type="button" class="journey-next primary">Continue</button>';
    form.append(controls);
    const save = form.querySelector('.save-draft-action');
    if (save) save.hidden = true;
    const media = form.querySelector('.property-media-pool');
    if (media && sections.unit) sections.unit.after(media);
    const review = form.querySelector('.listing-draft-preview');
    const submit = form.querySelector('.listing-submit-actions');
    const map = form.querySelector('#newPropertyMap');
    const existingSummary = document.createElement('p');
    existingSummary.className = 'journey-existing-property muted';
    stageHeading.after(existingSummary);
    let current = 0;
    const addressFields = new Set(['address', 'locality', 'city', 'region', 'postal']);
    let forwardRequest = 0;
    form.addEventListener('input', event => {
      if (!addressFields.has(event.target.name)) return;
      forwardRequest++;
      map?._vacancyClearLocation?.();
    });
    form.addEventListener('change', event => {
      if (!addressFields.has(event.target.name)) return;
      if (event.target.dataset.resolvedLocation) { delete event.target.dataset.resolvedLocation; return; }
      const request = ++forwardRequest;
      const query = [form.elements.address?.value, form.elements.locality?.value, form.elements.city?.value, form.elements.region?.value, form.elements.postal?.value].filter(Boolean).join(', ');
      if (query.length < 3 || !map) return;
      map._vacancyForwardLookup = (async () => {
        try {
          const response = await fetch('/api/geocode?q=' + encodeURIComponent(query));
          const place = await response.json();
          if (request !== forwardRequest) return;
          if (!response.ok) throw new Error(place.error || 'Location not found');
          if(place.country){let country=form.elements.country;if(!country){country=document.createElement('input');country.type='hidden';country.name='country';form.append(country)}country.value=place.country}for(const name of ['region','city','locality','postal'])if(place[name]&&form.elements[name]&&!form.elements[name].value)form.elements[name].value=place[name];map._vacancySetLocation?.(place.lat, place.lon, false);
        } catch (error) { if (request === forwardRequest) toast(error.message || 'Check this address or choose a point on the map'); }
      })();
    });

    function selectedPhotos() {
      return [...form.querySelectorAll('.unit-editor input[type="file"]')].map(input => selectedPhotoFiles(input));
    }
    function missingRequired(root) {
      return [...(root?.querySelectorAll('[required]') || [])].find(input => !input.checkValidity());
    }
    function show(index, keepPosition = false) {
      current = index;
      form.dataset.journeyStep = String(index);
      const propertyName = form.querySelector('[name="propertyTitle"]')?.value.trim() || form.querySelector('#propertyChoice')?.selectedOptions[0]?.textContent?.split(' — ')[0]?.trim();
      if(index >= 1 && sections.property){let chosen=sections.property.querySelector('.chosen-property-address');if(!chosen){chosen=document.createElement('p');chosen.className='chosen-property-address';sections.property.querySelector('.composer-section-body')?.prepend(chosen)}if(chosen)chosen.textContent=[form.elements.locality?.value,form.elements.city?.value,form.elements.country?.value||market().label].filter(Boolean).filter((part,i,parts)=>parts.indexOf(part)===i).join(', ')}
      title.textContent = index === 2 && form.querySelectorAll('.unit-editor').length > 1 ? 'Units' : names[index];
      existingSummary.textContent = index === 2 && propertyName ? propertyName : index === 1 && !sections.property ? (form.querySelector('#propertyChoice')?.selectedOptions[0]?.textContent || '') : '';
      existingSummary.hidden = !existingSummary.textContent;
      Object.values(sections).forEach(section => { if (section) section.open = true; });
      const relevant = index === 1 || index === 2 ? sections.property : index === 3 ? sections.unit : null;
      if (relevant && relevant.querySelector('summary strong')) relevant.querySelector('summary strong').textContent = names[index];
      if (sections.unit && (index === 2 || index === 3)) sections.unit.querySelector('summary strong').textContent = names[index];
      stageHeading.querySelector('.journey-back').hidden = index === 0;
      controls.querySelector('.journey-next').hidden = index === 4;
      if (submit) submit.hidden = index !== 4;
      if (review) review.hidden = index !== 4;
      if (index === 4) form.querySelector('.listing-preview-action')?.click();
      if (index === 0 && map) requestAnimationFrame(() => map._vacancyInvalidateSize?.());
      if (!keepPosition) window.scrollTo({top: 0, behavior: 'instant'});
    }
    async function validate(index) {
      if (index === 0) {
        await map?._vacancyAddressLookup;
        await map?._vacancyForwardLookup;
        if (sections.location) {
          const invalid = missingRequired(sections.location);
          if (invalid) { invalid.reportValidity(); return false; }
          if (!form.elements.publicLatitude?.value || !form.elements.publicLongitude?.value) {
            const query = [form.elements.address?.value, form.elements.locality?.value, form.elements.city?.value, form.elements.region?.value].filter(Boolean).join(', ');
            try {
              const response = await fetch('/api/geocode?q=' + encodeURIComponent(query));
              const place = await response.json();
              if (!response.ok || !Number.isFinite(Number(place.lat)) || !Number.isFinite(Number(place.lon))) throw new Error(place.error || 'Address not found');
              map?._vacancySetLocation?.(place.lat, place.lon, false);
            } catch (error) { toast(error.message || 'Choose a location on the map'); return false; }
          }
        } else if (!form.querySelector('#propertyChoice')?.value) { toast('Choose a property'); return false; }
      }
      if (index === 1) {
        const invalid = missingRequired(sections.property);
        if (invalid) { invalid.reportValidity(); return false; }
      }
      if (index === 2 && selectedPhotos().some(files => files.length < 3)) { toast('Add at least 3 photos for each unit'); return false; }
      if (index === 3) {
        const amount = [...form.querySelectorAll('[data-base-name="rentAmount"], [name="rentAmount"]')].find(input => !input.value || Number(input.value.replace(/,/g, '')) <= 0);
        if (amount) { amount.focus(); toast('Enter a rent amount for each unit'); return false; }
      }
      return true;
    }
    controls.querySelector('.journey-next').onclick = async () => { if (await validate(current)) { saveListingDraft(form); show(Math.min(current + 1, 4)); } };
    stageHeading.querySelector('.journey-back').onclick = () => show(Math.max(current - 1, 0));
    function arrangeUnit(unit, index) {
      const toolbar = unit.querySelector('.unit-toolbar');
      if (!toolbar) return;
      const type = unit.querySelector('[data-base-name="unitType"]')?.closest('label');
      const titleField = unit.querySelector('[data-base-name="roomName"]')?.closest('label');
      const description = unit.querySelector('[data-base-name="description"]')?.closest('label');
      if (description?.closest('.optional-listing-field')) {
        const wrapper = description.closest('.optional-listing-field');
        description.hidden = false;
        wrapper.before(description);
        wrapper.remove();
      }
      [type, titleField, description].filter(Boolean).forEach(field => unit.append(field));
      const amenities = unit.querySelector('.unit-features');
      if (amenities) amenities.querySelector('summary').textContent = 'Amenities';
      const group = (className, label) => {
        let item = unit.querySelector(':scope > .' + className);
        if (!item) {
          item = document.createElement('details');
          item.className = className + ' wide';
          item.innerHTML = '<summary>' + label + '</summary><div class="unit-group-body"></div>';
        }
        return item;
      };
      const utilities = group('unit-utilities', 'Utilities');
      const rules = group('unit-rules', 'Rules');
      const body = name => unit.querySelector('[data-base-name="' + name + '"]')?.closest('.service-choice, label');
      const bills = body('billsIncluded');
      if (bills) utilities.querySelector('.unit-group-body').append(bills);
      ['smokingOverride', 'petsOverride'].forEach(name => {
        const row = body(name);
        if (row) { row.hidden = false; rules.querySelector('.unit-group-body').append(row); }
      });
      const unitSectionBody = sections.unit?.querySelector('.composer-section-body');
      let advanced = unit.querySelector(':scope > .advanced-unit-settings');
      if (!advanced && index === 0) advanced = unitSectionBody?.querySelector(':scope > .advanced-unit-settings');
      if (advanced) {
        advanced.querySelector('summary').firstChild.textContent = 'Advanced properties ';
        const available = unit.querySelector('[data-base-name="availableFrom"]')?.closest('.optional-listing-field');
        if (available) advanced.querySelector('.advanced-settings-body')?.append(available);
      }
      if (index === 0 && sections.property) {
        const propertyBody = sections.property.querySelector('.composer-section-body');
        const shared = [
          ['.property-features', amenities?.querySelector('.unit-features-body')],
          ['.property-utilities', utilities.querySelector('.unit-group-body')],
          ['.property-rules', rules.querySelector('.unit-group-body')],
          ['.advanced-unit-settings', advanced?.querySelector('.advanced-settings-body')]
        ];
        shared.forEach(([selector, target]) => {
          const item = propertyBody?.querySelector(selector);
          if (item && target) { item.classList.add('shared-property-control'); item.open=true; target.prepend(item); }
        });
        const minimum = unit.querySelector('[data-base-name="minimumStayWeeks"]')?.closest('.optional-listing-field');
        if (minimum && advanced && !advanced.contains(minimum)) advanced.querySelector('.advanced-settings-body')?.append(minimum);
        propertyBody?.querySelector('.inheritance-note')?.remove();
        if (amenities && !amenities.querySelector('.shared-unit-note')) amenities.querySelector('.unit-features-body')?.insertAdjacentHTML('afterbegin', '<p class="inheritance-note shared-unit-note">Property amenities apply to every unit. Unit choices below can differ.</p>');
      }
      [amenities, utilities, rules, advanced, unit.querySelector('.unit-photo-choices'), unit.querySelector('.unit-media-source'), unit.querySelector('.unit-delete')].filter(Boolean).forEach(item => unit.append(item));
    }
    function prepareDuplicateButtons(){
      form.querySelectorAll('.unit-editor').forEach((unit,index)=>{
        unit.querySelectorAll('.remove-unit').forEach(button=>button.remove());
        let toolbar=unit.querySelector('.unit-toolbar');
        if(!toolbar){
          toolbar=document.createElement('div');
          toolbar.className='unit-toolbar wide';
          toolbar.innerHTML='<input type="text" class="unit-name-input" maxlength="100" aria-label="Unit name" title="Tap to name this unit"><details class="duplicate-unit-menu"><summary aria-label="Duplicate unit" title="Duplicate unit"><svg class="service-icon" aria-hidden="true"><use href="#icon-duplicate"></use></svg><span class="sr-only">Duplicate unit</span></summary><button type="button" class="duplicate-same-property">Copy into this property</button></details>';
          unit.querySelector('legend')?.after(toolbar);
          const rows=['furnished','ensuite','billsIncluded'].map(field=>unit.querySelector('[data-base-name="'+field+'"]')?.closest('.service-choice, label')).filter(Boolean);
          if(rows.length){const features=document.createElement('details');features.className='unit-features wide';features.innerHTML='<summary>Features</summary><div class="unit-features-body"></div>';toolbar.after(features);features.querySelector('.unit-features-body').append(...rows)}
        }
        arrangeUnit(unit,index);
        const name=toolbar.querySelector('.unit-name-input'),titleInput=unit.querySelector('[data-base-name="roomName"]');
        if(!name.value)name.value=titleInput?.dataset.titleMode==='manual'&&titleInput.value?titleInput.value:'Unit '+(index+1);
        else if(/^Unit \d+$/.test(name.value))name.value='Unit '+(index+1);
        unit.querySelector('legend').textContent=name.value;
        if(index>0&&titleInput&&!titleInput.value){titleInput.value=name.value;titleInput.dataset.titleMode='manual';titleInput.readOnly=false;const toggle=unit.querySelector('.title-mode-toggle');if(toggle){toggle.textContent='Manual';toggle.dataset.automatic='false';toggle.setAttribute('aria-label','Use automatic listing title')}}
        else if(titleInput&&/^Unit \d+$/.test(titleInput.value)&&/^Unit \d+$/.test(name.value))titleInput.value=name.value;
        if(!unit.querySelector('.unit-delete')){
          const remove=document.createElement('button');
          remove.type='button';remove.className='unit-delete';remove.setAttribute('aria-label','Delete '+name.value);remove.title='Delete unit';
          remove.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-9 0 1 14h10l1-14M10 11v6m4-6v6"/></svg>';
          unit.append(remove);
        }
        const menu=toolbar.querySelector('.duplicate-unit-menu');
        menu.open=false;
        menu.querySelector('button').onclick=()=>{
          form.querySelector('.add-unit')?.click();
          setTimeout(()=>{
            const target=[...form.querySelectorAll('.unit-editor')].at(-1);
            if(!target||target===unit)return;
            unit.querySelectorAll('[data-base-name]').forEach(source=>{
              if(source.type==='file')return;
              const copied=target.querySelector('[data-base-name="'+CSS.escape(source.dataset.baseName)+'"]');
              if(copied)copied.value=source.value;
            });
            const copiedTitle=target.querySelector('[data-base-name="roomName"]');
            if(copiedTitle){copiedTitle.readOnly=false;copiedTitle.dataset.titleMode='manual';const toggle=target.querySelector('.title-mode-toggle');if(toggle){toggle.textContent='Manual';toggle.dataset.automatic='false';toggle.setAttribute('aria-label','Use automatic listing title')}}
            target.querySelector('.unit-name-input').value=unit.querySelector('.unit-name-input')?.value||target.querySelector('.unit-name-input').value;
            window.copyListingUnitPhotos?.(form,unit,target);
            tagFields(form);prepareDuplicateButtons();menu.open=false;
            target.scrollIntoView({block:'start'});
            toast('Unit copied. Review its details and photos before publishing.');
          },0);
        };
      });
    }
    prepareDuplicateButtons();
    form.addEventListener('input',event=>{
      const unit=event.target.closest('.unit-editor');
      if(!unit)return;
      const name=unit.querySelector('.unit-name-input'),titleInput=unit.querySelector('[data-base-name="roomName"]');
      if(event.target===name&&titleInput){
        titleInput.dataset.titleMode='manual';titleInput.readOnly=false;titleInput.value=name.value.trim();
        unit.querySelector('legend').textContent=name.value.trim()||'Unit';
        const toggle=unit.querySelector('.title-mode-toggle');
        if(toggle){toggle.textContent='Manual';toggle.dataset.automatic='false';toggle.setAttribute('aria-label','Use automatic listing title')}
        unit.querySelector('.unit-delete')?.setAttribute('aria-label','Delete '+(name.value.trim()||'unit'));
        titleInput.dispatchEvent(new Event('change',{bubbles:true}));
      }else if(event.target===titleInput&&name&&titleInput.dataset.titleMode==='manual'){name.value=titleInput.value;unit.querySelector('legend').textContent=titleInput.value.trim()||'Unit'}
    });
    form.addEventListener('click',event=>{
      const clonedControl=event.target.closest('.unit-editor[data-unit-index]:not([data-unit-index="0"]) .quantity-control button[data-step], .unit-editor[data-unit-index]:not([data-unit-index="0"]) .optional-listing-field > button');
      if(clonedControl&&!clonedControl.onclick){if(clonedControl.hasAttribute('data-step')){const input=clonedControl.parentElement.querySelector('input[type=number]');if(input){const minimum=Number(input.min||0),maximum=Number(input.max||50);input.value=String(Math.max(minimum,Math.min(maximum,Number(input.value||minimum)+Number(clonedControl.dataset.step))));input.dispatchEvent(new Event('change',{bubbles:true}))}}else{const label=clonedControl.parentElement.querySelector('label');if(label){label.hidden=!label.hidden;clonedControl.setAttribute('aria-expanded',String(!label.hidden));clonedControl.querySelector('use')?.setAttribute('href',label.hidden?'#icon-eye-off':'#icon-eye')}}return}
      if(event.target.closest('.unit-delete')){
        const units=[...form.querySelectorAll('.unit-editor')];
        if(units.length===1){toast('Keep at least one unit in the listing');return}
        const removed=event.target.closest('.unit-editor');
        const remaining=units.find(unit=>unit!==removed);
        removed.querySelectorAll('.shared-property-control').forEach(item=>{
          const selector=item.matches('.property-features')?'.unit-features-body':item.matches('.property-utilities')?'.unit-utilities .unit-group-body':item.matches('.property-rules')?'.unit-rules .unit-group-body':'.advanced-unit-settings .advanced-settings-body';
          remaining.querySelector(selector)?.prepend(item);
        });
        removed.remove();
        renumberUnitEditors(form);
        tagFields(form);prepareDuplicateButtons();
      }else if(event.target.closest('.add-unit')){
        setTimeout(()=>{const units=[...form.querySelectorAll('.unit-editor')],target=units.at(-1);if(target){const name=target.querySelector('.unit-name-input');if(name)name.value='Unit '+units.length;window.clearListingUnitPhotos?.(form,target)}tagFields(form);prepareDuplicateButtons()},0);
      }
    });
    form.addEventListener('vacancy:location-used', () => { saveListingDraft(form); });
    show(0, true);
  }

  function simplifyTypeChoices(start) {
    const grid = start?.querySelector('.listing-type-grid');
    if (!grid || grid.dataset.journey101Types) return;
    grid.dataset.journey101Types = 'true';
    const room = grid.querySelector('[data-listing-type="Room"]');
    if (room) {
      room.dataset.listingType = 'Residential';
      room.querySelector('span').textContent = 'Room / apartment';
      room.insertAdjacentHTML('beforeend', '<small>Studio, 1bdrm, 2brm, more</small>');
      room.setAttribute('aria-expanded', 'false');
      const group = document.createElement('div');
      group.className = 'listing-residential-group';
      room.replaceWith(group);
      group.append(room);
      const preset = document.createElement('div');
      preset.className = 'listing-home-preset';
      preset.hidden = true;
      preset.innerHTML = '<select data-home-preset hidden aria-label="Selected room or apartment type"><option value="Room">Room</option><option value="Studio">Studio</option><option value="1 bedroom apartment">1 bedroom apartment</option><option value="2 bedroom apartment">2 bedroom apartment</option><option value="3+ bedroom apartment">3+ bedroom apartment</option></select><div class="listing-home-options" role="group" aria-label="Choose room or apartment type"><button type="button" data-preset="Room">Room</button><button type="button" data-preset="Studio">Studio</button><button type="button" data-preset="1 bedroom apartment">1 bedroom</button><button type="button" data-preset="2 bedroom apartment">2 bedrooms</button><button type="button" data-preset="3+ bedroom apartment">More bedrooms</button></div>';
      group.append(preset);
      const selectedPill=document.createElement('span');selectedPill.className='selected-home-pill';selectedPill.hidden=true;room.append(selectedPill);
      room.addEventListener('click', () => {
        preset.hidden = false;
        room.setAttribute('aria-expanded', 'true');
        queueMicrotask(() => { start.querySelector('.listing-add-choice').hidden = true; });
      });
      preset.addEventListener('click', event => {
        const option = event.target.closest('[data-preset]');
        if (!option) return;
        preset.querySelector('[data-home-preset]').value = option.dataset.preset;
        selectedPill.textContent = option.textContent.trim();
        selectedPill.hidden = false;
        preset.hidden = true;
        room.setAttribute('aria-expanded', 'false');
        start.querySelector('.listing-add-choice').hidden = false;
      });
      grid.addEventListener('click', event => {
        if (!event.target.closest('.listing-residential-group')) {
          if (event.target.closest('[data-listing-type]')) selectedPill.hidden = true;
          preset.hidden = true;
          room.setAttribute('aria-expanded', 'false');
        }
      }, true);
    }
    grid.querySelector('[data-listing-type="Studio"]')?.remove();
    grid.querySelector('[data-listing-type="Apartment"]')?.remove();
  }
  let pendingDuplicate=null;
  function applyDuplicateToForm(form){
    const source=pendingDuplicate,unit=form?.querySelector('.unit-editor');
    if(!source||!unit)return;
    const values={roomName:source.roomName,unitType:source.unitType,rentAmount:source.rentAmount,rentCurrency:source.rentCurrency,rentPeriod:source.rentPeriod,deposit:source.deposit,availableFrom:source.availableFrom,minimumStayWeeks:source.minimumStayWeeks,maxOccupants:source.maxOccupants,furnished:source.furnished==null?'':String(source.furnished),ensuite:source.ensuite==null?'':String(source.ensuite),billsIncluded:String(Boolean(source.billsIncluded)),description:source.description,smokingOverride:source.smokingAllowedOverride==null?'':String(source.smokingAllowedOverride),petsOverride:source.petsConsideredOverride==null?'':String(source.petsConsideredOverride)};
    const title=unit.querySelector('[data-base-name="roomName"]');
    if(title){title.readOnly=false;title.dataset.titleMode='manual';const toggle=unit.querySelector('.title-mode-toggle');if(toggle){toggle.textContent='Manual';toggle.dataset.automatic='false';toggle.setAttribute('aria-label','Use automatic listing title')}}
    for(const [name,value] of Object.entries(values)){
      const field=unit.querySelector(`[data-base-name="${name}"]`);
      if(!field||value==null)continue;
      if(field.tagName==='SELECT'&&![...field.options].some(option=>option.value===String(value)))field.add(new Option(String(value),String(value)));
      field.value=String(value);
      field.dispatchEvent(new Event('change',{bubbles:true}));
    }
    const name=unit.querySelector('.unit-name-input');
    if(name)name.value=source.roomName||'Unit 1';
    unit.querySelector('legend').textContent=name?.value||source.roomName||'Unit 1';
    const choice=form.querySelector('#propertyChoice');
    if(choice&&[...choice.options].some(option=>option.value===source.propertyId)){choice.value=source.propertyId;choice.dispatchEvent(new Event('change',{bubbles:true}))}
    pendingDuplicate=null;
    toast('Unit details copied. Choose photos and review the property before publishing.');
  }
  window.beginVacancyDuplicate=async function(id){
    try{
      pendingDuplicate=await VACANCY_BACKEND.listingForEdit(id);
      await renderList();
      const start=document.querySelector('#listingHost .listing-start');
      if(!start)return;
      const note=document.createElement('p');note.className='notice duplicate-destination-note';
      note.innerHTML=`Copying ${escapeHtml(pendingDuplicate.roomName||'listing')} · choose a property <button type="button" class="ghost" aria-label="Cancel duplicate">Cancel</button>`;
      start.querySelector('h2')?.before(note);
      note.querySelector('button').onclick=()=>{pendingDuplicate=null;note.remove()};
      const type=String(pendingDuplicate.unitType||pendingDuplicate.propertyType||'').toLowerCase();
      const category=/shop|retail|commercial/.test(type)?'Shop':/house|maisonette|villa/.test(type)?'House':'Residential';
      start.querySelector(`[data-listing-type="${category}"]`)?.click();
      await Promise.resolve();
      if(category==='Residential'){
        const preset=/2\s*(bed|bdrm)/.test(type)?'2 bedroom apartment':/1\s*(bed|bdrm)/.test(type)?'1 bedroom apartment':/studio/.test(type)?'Studio':'Room';
        start.querySelector(`[data-preset="${preset}"]`)?.click();
      }
      window.scrollTo({top:0,behavior:'instant'});
    }catch(error){pendingDuplicate=null;toast(error.message)}
  };
  const before = renderList;
  renderList = async function () {
    await before();
    const host = document.querySelector('#listingHost');
    if (!host || host.dataset.journey101Observer) return;
    host.dataset.journey101Observer = 'true';
    const refresh = () => { simplifyTypeChoices(host.querySelector('.listing-start')); host.querySelectorAll('form.guided-listing').forEach(installJourney); page?.classList.toggle('listing-composing', Boolean(host.querySelector('.listing-start.complete'))); };
    const page = document.querySelector('main:has(#listingHost)');
    page?.classList.add('listing-journey-page');
    const heading = page?.querySelector('.section-head h1');
    if (heading) heading.textContent = 'Complete your listing';
    refresh();
    new MutationObserver(refresh).observe(host, {childList: true, subtree: true});
    host.addEventListener('click', event => { if (event.target.closest('[data-add-mode]')) setTimeout(()=>{refresh();applyDuplicateToForm(host.querySelector('#listingForm:not([hidden]), #existingListingForm:not([hidden])'))}, 0); }, true);
  };
})();
