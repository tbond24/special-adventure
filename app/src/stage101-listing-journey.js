(() => {
  const names = ['Location', 'Property details', 'Space details', 'Pricing', 'Review'];
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
        if (child.matches('legend')) return;
        const fields = controlsIn(child);
        child.dataset.journeyRole = child.matches('.unit-photo-choices, .unit-media-source') || fields.includes('images')
          ? 'media' : fields.some(name => priceFields.has(name)) ? 'pricing' : 'space';
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
    if(sections.property && sections.unit) sections.property.before(sections.unit);
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
    form.querySelector('.listing-choice-breadcrumb')?.after(title);
    if (!title.isConnected) form.prepend(title);
    const controls = document.createElement('div');
    controls.className = 'journey-controls wide';
    controls.innerHTML = '<button type="button" class="journey-back ghost">Back</button><button type="button" class="journey-next primary">Continue</button>';
    form.append(controls);
    const save = form.querySelector('.save-draft-action');
    if (save) controls.prepend(save);
    const media = form.querySelector('.property-media-pool');
    if (media && sections.property) sections.property.after(media);
    const review = form.querySelector('.listing-draft-preview');
    const submit = form.querySelector('.listing-submit-actions');
    const map = form.querySelector('#newPropertyMap');
    const existingSummary = document.createElement('p');
    existingSummary.className = 'journey-existing-property muted';
    title.after(existingSummary);
    let current = 0;

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
      title.textContent = index === 2 ? (propertyName ? propertyName + ' details' : 'Unit details') : names[index];
      existingSummary.textContent = index === 1 && !sections.property ? (form.querySelector('#propertyChoice')?.selectedOptions[0]?.textContent || '') : '';
      existingSummary.hidden = !existingSummary.textContent;
      Object.values(sections).forEach(section => { if (section) section.open = true; });
      const relevant = index === 1 || index === 2 ? sections.property : index === 3 ? sections.unit : null;
      if (relevant && relevant.querySelector('summary strong')) relevant.querySelector('summary strong').textContent = names[index];
      if (sections.unit && (index === 2 || index === 3)) sections.unit.querySelector('summary strong').textContent = names[index];
      controls.querySelector('.journey-back').hidden = index === 0;
      controls.querySelector('.journey-next').hidden = index === 4;
      if (submit) submit.hidden = index !== 4;
      if (review) review.hidden = index !== 4;
      if (index === 4) form.querySelector('.listing-preview-action')?.click();
      if (index === 0 && map) requestAnimationFrame(() => map._vacancyInvalidateSize?.());
      if (!keepPosition) window.scrollTo({top: 0, behavior: 'instant'});
    }
    async function validate(index) {
      if (index === 0) {
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
        if (selectedPhotos().some(files => files.length < 3)) { toast('Add at least 3 photos for each unit'); return false; }
      }
      if (index === 3) {
        const amount = [...form.querySelectorAll('[data-base-name="rentAmount"], [name="rentAmount"]')].find(input => !input.value || Number(input.value.replace(/,/g, '')) <= 0);
        if (amount) { amount.focus(); toast('Enter a rent amount for each unit'); return false; }
      }
      return true;
    }
    controls.querySelector('.journey-next').onclick = async () => { if (await validate(current)) show(Math.min(current + 1, 4)); };
    controls.querySelector('.journey-back').onclick = () => show(Math.max(current - 1, 0));
    function prepareDuplicateButtons(){
      form.querySelectorAll('.unit-editor').forEach(unit=>{
        if(unit.querySelector('.duplicate-unit-menu'))return;
        const menu=document.createElement('details');menu.className='duplicate-unit-menu wide';menu.dataset.journeyRole='space';
        menu.innerHTML='<summary><svg class="service-icon" aria-hidden="true"><use href="#icon-duplicate"></use></svg> Duplicate unit</summary><button type="button" class="duplicate-same-property">Copy into this property</button>';
        unit.querySelector('legend')?.after(menu);
        menu.querySelector('button').onclick=()=>{
          form.querySelector('.add-unit')?.click();
          setTimeout(()=>{
            const target=[...form.querySelectorAll('.unit-editor')].at(-1);
            if(!target||target===unit)return;
            target.querySelector('.duplicate-unit-menu')?.remove();
            unit.querySelectorAll('[data-base-name]').forEach(source=>{
              if(source.type==='file')return;
              const copied=target.querySelector('[data-base-name="'+CSS.escape(source.dataset.baseName)+'"]');
              if(copied)copied.value=source.value;
            });
            const copiedTitle=target.querySelector('[data-base-name="roomName"]');if(copiedTitle){copiedTitle.readOnly=false;copiedTitle.dataset.titleMode='manual';target.querySelector('.title-mode-toggle')?.remove()}
            window.copyListingUnitPhotos?.(form,unit,target);
            tagFields(form);prepareDuplicateButtons();menu.open=false;
            target.scrollIntoView({block:'start'});
            toast('Unit copied. Review its details and photos before publishing.');
          },0);
        };
      });
    }
    prepareDuplicateButtons();
    form.addEventListener('click', event => { if (event.target.closest('.add-unit, .remove-unit')) setTimeout(() => {tagFields(form);prepareDuplicateButtons()}, 0); });
    form.addEventListener('vacancy:location-used', () => { if (current === 0) show(1); });
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
  const before = renderList;
  renderList = async function () {
    await before();
    const host = document.querySelector('#listingHost');
    if (!host || host.dataset.journey101Observer) return;
    host.dataset.journey101Observer = 'true';
    const refresh = () => { simplifyTypeChoices(host.querySelector('.listing-start')); host.querySelectorAll('form.guided-listing').forEach(installJourney); };
    const page = document.querySelector('main:has(#listingHost)');
    page?.classList.add('listing-journey-page');
    const heading = page?.querySelector('.section-head h1');
    if (heading) heading.textContent = 'Complete your listing';
    refresh();
    new MutationObserver(refresh).observe(host, {childList: true, subtree: true});
    host.addEventListener('click', event => { if (event.target.closest('[data-add-mode]')) setTimeout(refresh, 0); }, true);
  };
})();
