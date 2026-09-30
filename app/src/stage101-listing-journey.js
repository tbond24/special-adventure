(() => {
  const names = ['Location', 'Listing details', 'Review'];
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
    const defaultMoney = () => {
      const propertyId = form.querySelector('#propertyChoice')?.value;
      const country = (window.__listingProperties || []).find(property => property.id === propertyId)?.country || form.elements.country?.value || 'Kenya';
      const defaultMarket = marketForCountry(country);
      form.querySelectorAll('.unit-editor').forEach(unit => {
        const currency = unit.querySelector('[data-base-name="rentCurrency"]');
        const period = unit.querySelector('[data-base-name="rentPeriod"]');
        if (currency && currency.dataset.manual !== 'true') currency.value = defaultMarket.currency;
        if (period && period.dataset.manual !== 'true') period.value = defaultMarket.rentPeriod;
        currency?.querySelector('option[value="KES"]')?.replaceChildren('KSh');
      });
    };
    form.addEventListener('change', event => {
      if (['rentCurrency', 'rentPeriod'].includes(event.target.dataset.baseName)) event.target.dataset.manual = 'true';
      if (event.target.id === 'propertyChoice') defaultMoney();
    });
    form.addEventListener('vacancy:location-used', defaultMoney);
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
    if (changeChoices) {
      changeChoices.textContent = 'Change';
      const previousChange = changeChoices.onclick;
      changeChoices.onclick = event => {
        previousChange?.call(changeChoices,event);
        document.querySelector('main:has(#listingHost)')?.classList.remove('listing-composing');
        window.scrollTo({top:0,behavior:'instant'});
      };
    }
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
    if (media) media.hidden = true;
    const firstUnit = sections.unit?.querySelector('.unit-editor');
    const misplacedPhoto = [...form.querySelectorAll('input[type="file"][data-base-name="images"]')].find(input => !input.closest('.unit-editor'));
    if (firstUnit && misplacedPhoto?.closest('label')) {
      const label = misplacedPhoto.closest('label');
      firstUnit.append(label);
    }
    const propertyName = form.querySelector('[name="propertyTitle"]')?.closest('label');
    if (propertyName && sections.unit) sections.unit.querySelector('.composer-section-body')?.prepend(propertyName);
    const descriptionHint = form.querySelector('[data-base-name="description"]');
    if (descriptionHint) descriptionHint.placeholder = '';
    form.querySelectorAll('.listing-title-caption').forEach(caption => { caption.textContent = 'Listing title'; });
    const review = form.querySelector('.listing-draft-preview');
    const submit = form.querySelector('.listing-submit-actions');
    const oldPreview = form.querySelector('.listing-preview-action');
    if (oldPreview && review) {
      const preview = oldPreview.cloneNode(true);
      oldPreview.replaceWith(preview);
      let previewUrls = [];
      preview.onclick = () => {
        previewUrls.forEach(URL.revokeObjectURL);
        previewUrls = [];
        const location = [form.elements.locality?.value, form.elements.city?.value].filter(Boolean).join(', ');
        review.innerHTML = [...form.querySelectorAll('.unit-editor')].map((unit, index) => {
          const read = name => unit.querySelector('[data-base-name="' + name + '"]')?.value || '';
          const files = selectedPhotoFiles(unit.querySelector('input[type="file"]'));
          const existing = [...unit.querySelectorAll('.edit-existing-photo img')].map(image => image.src);
          const photos = existing.concat(files.map(file => {
            const url = URL.createObjectURL(file);
            previewUrls.push(url);
            return url;
          })).map((url,photoIndex) => `<img src="${escapeHtml(url)}" alt="Preview photo ${photoIndex + 1} for unit ${index + 1}">`).join('');
          const amount = Number(read('rentAmount').replace(/,/g, ''));
          const price = amount > 0 ? `${escapeHtml(read('rentCurrency'))} ${amount.toLocaleString()} / ${escapeHtml(read('rentPeriod') || 'month')}` : 'Add a price';
          const deposit = Number(read('deposit').replace(/,/g, ''));
          const facts = [read('unitType'), location, deposit > 0 ? `Deposit: ${read('rentCurrency')} ${deposit.toLocaleString()}` : '', read('availableFrom') ? `Available ${read('availableFrom')}` : ''].filter(Boolean);
          let details = {}; try { details = JSON.parse(read('unitDetails') || '{}'); } catch {}
          const listed = [
            ...(details.amenities || []).map(item => item.label),
            ...(details.utilities || []).map(item => item.label),
            ...(details.rules || []).map(item => item.allowed ? `${item.label} allowed` : `No ${String(item.label || '').toLowerCase()}`),
            Number(details.parkingSpaces) > 0 ? `${details.parkingSpaces} parking spaces` : ''
          ].filter(Boolean);
          return `<article class="unit-draft-preview"><div class="muted">Unit ${index + 1}: ${escapeHtml(unit.querySelector('.unit-name-input')?.value || `Unit ${index + 1}`)}</div><div class="preview-gallery"><div class="preview-media" data-preview-track>${photos || '<div class="preview-photo-empty">Add photos for this unit</div>'}</div>${files.length + existing.length > 1 ? '<button type="button" class="preview-arrow preview-arrow-prev" data-preview-step="-1" aria-label="Previous preview photo">‹</button><button type="button" class="preview-arrow preview-arrow-next" data-preview-step="1" aria-label="Next preview photo">›</button>' : ''}</div><h3>${escapeHtml(read('roomName') || 'Untitled listing')}</h3><strong class="listing-price">${price}</strong><p>${facts.map(escapeHtml).join(' · ')}</p>${read('description') ? `<p>${escapeHtml(read('description'))}</p>` : ''}${listed.length ? `<p>${listed.map(escapeHtml).join(' · ')}</p>` : ''}</article>`;
        }).join('');
        review.hidden = false;
      };
      review.addEventListener('click', event => {
        const arrow = event.target.closest('[data-preview-step]');
        if (!arrow) return;
        const track = arrow.parentElement.querySelector('[data-preview-track]');
        track?.scrollBy({left:Number(arrow.dataset.previewStep) * track.clientWidth,behavior:'smooth'});
      });
    }
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
      if(index===1)form.querySelectorAll('.unit-editor').forEach(syncUnitTitle);
      const propertyName = form.querySelector('[name="propertyTitle"]')?.value.trim() || form.querySelector('#propertyChoice')?.selectedOptions[0]?.textContent?.split(' — ')[0]?.trim();
      title.textContent = names[index];
      existingSummary.textContent = index === 1 && propertyName ? propertyName : '';
      existingSummary.hidden = !existingSummary.textContent;
      Object.values(sections).forEach(section => { if (section) section.open = true; });
      if (sections.unit?.querySelector('summary strong')) sections.unit.querySelector('summary strong').textContent = names[1];
      stageHeading.querySelector('.journey-back').hidden = index === 0;
      controls.querySelector('.journey-next').hidden = index === 2;
      if (submit) submit.hidden = index !== 2;
      if (review) review.hidden = index !== 2;
      if (index === 2) form.querySelector('.listing-preview-action')?.click();
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
      if (index === 1 && selectedPhotos().some((files,position) => files.length + (form.querySelectorAll('.unit-editor')[position]?.querySelectorAll('.edit-existing-photo').length || 0) < 3)) { toast('Add at least 3 photos for each unit'); return false; }
      if (index === 1) {
        const amount = [...form.querySelectorAll('[data-base-name="rentAmount"], [name="rentAmount"]')].find(input => !input.value || Number(input.value.replace(/,/g, '')) <= 0);
        if (amount) { amount.focus(); toast('Enter a rent amount for each unit'); return false; }
      }
      return true;
    }
    controls.querySelector('.journey-next').onclick = async () => { if (await validate(current)) { saveListingDraft(form); show(Math.min(current + 1, 2)); } };
    stageHeading.querySelector('.journey-back').onclick = () => show(Math.max(current - 1, 0));
    function syncUnitOptions(unit) {
      const details = {
        parkingSpaces: Math.max(0, Number(unit.querySelector('.unit-parking-count')?.value || 0)),
        amenities: [...unit.querySelectorAll('[data-unit-amenity][aria-pressed="true"]')].map(button => ({label: button.dataset.unitAmenity, icon: button.dataset.icon})).concat([...unit.querySelectorAll('.unit-custom-amenities input')].map(input=>({label:input.value.trim(),icon:'house'})).filter(item=>item.label)),
        utilities: [...unit.querySelectorAll('[data-unit-utility][aria-pressed="true"]')].map(button => ({label: button.dataset.unitUtility, icon: button.dataset.icon})).concat([...unit.querySelectorAll('.unit-custom-utilities input')].map(input=>({label:input.value.trim(),icon:'bolt'})).filter(item=>item.label)),
        rules: [...unit.querySelectorAll('.unit-rule-row')].map(row => ({label: row.querySelector('input')?.value.trim(), allowed: row.querySelector('[aria-pressed="true"]')?.dataset.allowed === 'true'})).filter(rule => rule.label)
      };
      unit.querySelector('[data-base-name="unitDetails"]').value = JSON.stringify(details);
    }
    function unitOptionRow(kind, value = '') {
      const row = document.createElement('div');
      row.className = kind === 'rule' ? 'unit-rule-row' : 'unit-custom-row';
      row.dataset.kind = kind;
      row.innerHTML = `<input maxlength="40" aria-label="${kind === 'rule' ? 'Rule' : kind}" placeholder="${kind === 'rule' ? 'e.g. Smoking' : kind === 'utility' ? 'e.g. Solar power' : 'e.g. Balcony'}" value="${escapeHtml(value)}">${kind === 'rule' ? '<div class="unit-rule-choices"><button type="button" data-allowed="true" aria-pressed="true">Yes</button><button type="button" data-allowed="false" aria-pressed="false">No</button></div>' : ''}<button type="button" class="unit-row-remove" aria-label="Remove ${kind}">×</button>`;
      return row;
    }
    function setupUnitOptions(unit) {
      if (unit.querySelector('.unit-options-ready')) return;
      const amenities = unit.querySelector('.unit-features-body');
      const utilities = unit.querySelector('.unit-utilities .unit-group-body');
      const rules = unit.querySelector('.unit-rules .unit-group-body');
      if (!amenities || !utilities || !rules) return;
      unit.querySelectorAll('.property-features,.property-utilities,.property-rules').forEach(item => item.remove());
      for (const name of ['furnished','ensuite','smokingOverride','petsOverride']) unit.querySelector('[data-base-name="' + name + '"]')?.closest('.service-choice')?.setAttribute('hidden','');
      amenities.insertAdjacentHTML('afterbegin', '<div class="unit-options-ready"><button type="button" data-add-unit-option="amenity" class="add-feature-action">+ Add your own feature</button><label class="unit-parking-row">Parking spaces <span class="quantity-control"><button type="button" data-step="-1" aria-label="Decrease parking spaces">−</button><input class="unit-parking-count" type="number" min="0" max="50" value="0" aria-label="Parking spaces"><button type="button" data-step="1" aria-label="Increase parking spaces">+</button></span></label><div class="unit-custom-amenities"></div><div class="unit-option-grid"><button type="button" data-unit-amenity="Furnished" data-icon="furnished" aria-pressed="false">Furnished</button><button type="button" data-unit-amenity="Ensuite" data-icon="shower" aria-pressed="false">Ensuite</button><button type="button" data-unit-amenity="Balcony" data-icon="balcony" aria-pressed="false">Balcony</button><button type="button" data-unit-amenity="Swimming pool access" data-icon="pool" aria-pressed="false">Swimming pool access</button></div></div>');
      utilities.insertAdjacentHTML('afterbegin', '<div class="unit-option-grid"><button type="button" data-unit-utility="Wi-Fi" data-icon="wifi" aria-pressed="false">Wi-Fi</button><button type="button" data-unit-utility="Water" data-icon="water" aria-pressed="false">Water</button><button type="button" data-unit-utility="Electricity" data-icon="bolt" aria-pressed="false">Electricity</button><button type="button" data-unit-utility="Security" data-icon="shield" aria-pressed="false">Security</button></div><div class="unit-custom-utilities"></div><button type="button" data-add-unit-option="utility" class="add-feature-action">+ Add a utility</button>');
      rules.insertAdjacentHTML('afterbegin', '<div class="unit-custom-rules"></div><button type="button" data-add-unit-option="rule" class="add-feature-action">+ Add a rule</button>');
      const hidden = document.createElement('input');
      hidden.type = 'hidden'; hidden.name = unit.dataset.unitIndex === '0' ? 'unitDetails' : `unit${unit.dataset.unitIndex}_unitDetails`; hidden.dataset.baseName = 'unitDetails';
      unit.append(hidden);
      syncUnitOptions(unit);
    }
    function applyUnitOptions(unit, details) {
      if (!details || typeof details !== 'object') return;
      const parking = unit.querySelector('.unit-parking-count');
      if (parking) parking.value = String(Math.max(0, Number(details.parkingSpaces || 0)));
      for (const kind of ['amenity','utility']) {
        const items = Array.isArray(details[kind === 'amenity' ? 'amenities' : 'utilities']) ? details[kind === 'amenity' ? 'amenities' : 'utilities'] : [];
        const preset = unit.querySelectorAll(`[data-unit-${kind}]`);
        preset.forEach(button => button.setAttribute('aria-pressed', String(items.some(item => item.label === button.dataset[`unit${kind[0].toUpperCase()+kind.slice(1)}`]))));
        const custom = unit.querySelector(kind === 'amenity' ? '.unit-custom-amenities' : '.unit-custom-utilities');
        if (custom) { custom.replaceChildren(); items.filter(item => ![...preset].some(button => button.dataset[`unit${kind[0].toUpperCase()+kind.slice(1)}`] === item.label)).forEach(item => custom.append(unitOptionRow(kind, String(item.label || '')))); }
      }
      const rules = unit.querySelector('.unit-custom-rules');
      if (rules) { rules.replaceChildren(); (Array.isArray(details.rules) ? details.rules : []).forEach(rule => { const row=unitOptionRow('rule',String(rule.label||''));row.querySelectorAll('[data-allowed]').forEach(button=>button.setAttribute('aria-pressed',String((button.dataset.allowed==='true')===Boolean(rule.allowed))));rules.append(row); }); }
      for (const name of ['furnished','ensuite']) { const select=unit.querySelector('[data-base-name="'+name+'"]'),button=unit.querySelector('[data-unit-amenity="'+(name==='furnished'?'Furnished':'Ensuite')+'"]');if(select&&button)select.value=button.getAttribute('aria-pressed')==='true'?'true':''; }
      syncUnitOptions(unit);
    }
    form.addEventListener('vacancy:apply-unit-options',event => {
      const unit = event.target.closest('.unit-editor');
      if (unit) applyUnitOptions(unit,event.detail);
    });
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
      if (type) { type.classList.add('unit-type-data'); unit.append(type); }
      if (titleField) unit.append(titleField);
      if (description) unit.append(description);
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
      body('billsIncluded')?.remove();
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
        amenities?.querySelector('.shared-unit-note')?.remove();
      }
      [amenities, utilities, rules, advanced, unit.querySelector('.unit-photo-choices'), unit.querySelector('.unit-media-source'), unit.querySelector('.unit-delete')].filter(Boolean).forEach(item => unit.append(item));
      setupUnitOptions(unit);
      const photoInput = unit.querySelector('input[type="file"][data-base-name="images"]');
      const photoLabel = photoInput?.closest('label');
      if (photoLabel) {
        photoLabel.classList.remove('unit-media-source');
        photoLabel.classList.add('unit-photo-hint');
        photoInput.classList.add('unit-photo-file-input');
        if (photoLabel.firstChild?.nodeType === Node.TEXT_NODE) photoLabel.firstChild.textContent = '';
        let photoToolbar = unit.querySelector('.unit-media-toolbar');
        if (!photoToolbar) { photoToolbar=document.createElement('div');photoToolbar.className='unit-media-toolbar wide';photoToolbar.innerHTML='<span>Photos of this unit</span><button type="button">+ Add media</button>';photoLabel.before(photoToolbar); }
        photoToolbar.querySelector('button').onclick=()=>photoInput.click();
      }
      const choices=unit.querySelector('.unit-photo-choices');
      if(choices){choices.open=true;choices.querySelector('summary').firstChild.textContent='Selected photos for this unit ';const count=choices.querySelector('summary span');if(count)count.hidden=true;choices.querySelector('.add-unit-media')?.remove()}
      const rent=unit.querySelector('.rent-control'),deposit=unit.querySelector('.deposit-control');
      const photoToolbar=unit.querySelector('.unit-media-toolbar');
      let anchor=toolbar;
      for(const item of [titleField,rent,deposit,photoToolbar,photoLabel,choices])if(item&&anchor){anchor.after(item);anchor=item}
    }
    function syncUnitTitle(unit){
      const title=unit.querySelector('[data-base-name="roomName"]');
      if(!title||title.dataset.titleMode!=='auto')return;
      const type=unit.querySelector('[data-base-name="unitType"]')?.value||'Unit',place=form.elements.locality?.value.trim()||'';
      title.value=type+(place?' in '+place:'');
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
          const rows=['furnished','ensuite'].map(field=>unit.querySelector('[data-base-name="'+field+'"]')?.closest('.service-choice, label')).filter(Boolean);
          if(rows.length){const features=document.createElement('details');features.className='unit-features wide';features.innerHTML='<summary>Features</summary><div class="unit-features-body"></div>';toolbar.after(features);features.querySelector('.unit-features-body').append(...rows)}
        }
        arrangeUnit(unit,index);
        const name=toolbar.querySelector('.unit-name-input'),titleInput=unit.querySelector('[data-base-name="roomName"]');
        if(!name.value)name.value='Unit '+(index+1);
        else if(/^Unit \d+$/.test(name.value))name.value='Unit '+(index+1);
        unit.querySelector('legend').textContent=name.value;
        syncUnitTitle(unit);
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
            if(copiedTitle){copiedTitle.dataset.titleMode=titleInput?.dataset.titleMode||'auto';copiedTitle.readOnly=copiedTitle.dataset.titleMode==='auto';const toggle=target.querySelector('.title-mode-toggle');if(toggle){toggle.textContent=copiedTitle.readOnly?'Automatic':'Manual';toggle.dataset.automatic=String(copiedTitle.readOnly)}}
            target.querySelector('.unit-name-input').value=(unit.querySelector('.unit-name-input')?.value||'Unit')+' (copy)';
            for(const selector of ['.unit-options-ready','.unit-utilities .unit-option-grid','.unit-custom-utilities','.unit-custom-rules']){
              const sourceOptions=unit.querySelector(selector),targetOptions=target.querySelector(selector);
              if(sourceOptions&&targetOptions){targetOptions.innerHTML=sourceOptions.innerHTML;sourceOptions.querySelectorAll('input').forEach((input,index)=>{const copy=targetOptions.querySelectorAll('input')[index];if(copy)copy.value=input.value})}
            }
            syncUnitOptions(target);
            window.copyListingUnitPhotos?.(form,unit,target);
            const sourceInput=unit.querySelector('input[type="file"][data-base-name="images"]'),targetInput=target.querySelector('input[type="file"][data-base-name="images"]');
            if(sourceInput&&targetInput){const transfer=new DataTransfer();selectedPhotoFiles(sourceInput).forEach(file=>transfer.items.add(file));targetInput.files=transfer.files;targetInput.dispatchEvent(new Event('change',{bubbles:true}))}
            tagFields(form);prepareDuplicateButtons();menu.open=false;
            target.scrollIntoView({block:'start'});
            toast('Unit copied. Review its details and photos before publishing.');
          },0);
        };
      });
    }
    prepareDuplicateButtons();
    defaultMoney();
    try { const draft=JSON.parse(localStorage.getItem(listingDraftKey(form))||'null');form.querySelectorAll('.unit-editor').forEach((unit,index)=>{const saved=draft?.units?.[index];if(!saved)return;if(saved._privateName)unit.querySelector('.unit-name-input').value=saved._privateName;if(saved.unitDetails)applyUnitOptions(unit,JSON.parse(saved.unitDetails));}); } catch {}
    form.addEventListener('input',event=>{
      const unit=event.target.closest('.unit-editor');
      if(!unit)return;
      if(event.target.dataset.baseName==='unitType')syncUnitTitle(unit);
      if(event.target.closest('.unit-options-ready,.unit-custom-rules,.unit-custom-utilities')) syncUnitOptions(unit);
      const name=unit.querySelector('.unit-name-input'),titleInput=unit.querySelector('[data-base-name="roomName"]');
      if(event.target===name){
        unit.querySelector('legend').textContent=name.value.trim()||'Unit';
        unit.querySelector('.unit-delete')?.setAttribute('aria-label','Delete '+(name.value.trim()||'unit'));
      }
    });
    form.addEventListener('click',event=>{
      const parkingStep=event.target.closest('.unit-parking-row [data-step]');
      if(parkingStep){const input=parkingStep.parentElement.querySelector('.unit-parking-count');input.value=String(Math.max(0,Math.min(50,Number(input.value||0)+Number(parkingStep.dataset.step))));input.dispatchEvent(new Event('change',{bubbles:true}));syncUnitOptions(parkingStep.closest('.unit-editor'));return}
      const option=event.target.closest('[data-unit-amenity],[data-unit-utility]');
      if(option){option.setAttribute('aria-pressed',String(option.getAttribute('aria-pressed')!=='true'));const unit=option.closest('.unit-editor');const name=option.dataset.unitAmenity==='Furnished'?'furnished':option.dataset.unitAmenity==='Ensuite'?'ensuite':null;if(name){const select=unit.querySelector('[data-base-name="'+name+'"]');if(select)select.value=option.getAttribute('aria-pressed')==='true'?'true':'false'}syncUnitOptions(unit);return}
      const addOption=event.target.closest('[data-add-unit-option]');
      if(addOption){const unit=addOption.closest('.unit-editor'),kind=addOption.dataset.addUnitOption,target=unit.querySelector(kind==='amenity'?'.unit-custom-amenities':kind==='utility'?'.unit-custom-utilities':'.unit-custom-rules');if(target.children.length>=8){toast('Maximum 8 custom options');return}const row=unitOptionRow(kind);target.append(row);row.querySelector('input').focus();syncUnitOptions(unit);return}
      const removeOption=event.target.closest('.unit-row-remove');
      if(removeOption){const unit=removeOption.closest('.unit-editor');removeOption.parentElement.remove();syncUnitOptions(unit);return}
      const allowed=event.target.closest('[data-allowed]');
      if(allowed){const unit=allowed.closest('.unit-editor');allowed.parentElement.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button===allowed)));syncUnitOptions(unit);return}
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
        setTimeout(()=>{const units=[...form.querySelectorAll('.unit-editor')],target=units.at(-1);if(target){const name=target.querySelector('.unit-name-input');if(name)name.value='Unit '+units.length;for(const field of ['rentCurrency','rentPeriod']){const source=units[0].querySelector('[data-base-name="'+field+'"]'),copy=target.querySelector('[data-base-name="'+field+'"]');if(source&&copy){copy.value=source.value;if(source.dataset.manual)copy.dataset.manual=source.dataset.manual}}target.querySelectorAll('[data-unit-amenity],[data-unit-utility]').forEach(button=>button.setAttribute('aria-pressed','false'));target.querySelectorAll('.unit-custom-amenities,.unit-custom-utilities,.unit-custom-rules').forEach(list=>list.replaceChildren());const parking=target.querySelector('.unit-parking-count');if(parking)parking.value='0';syncUnitOptions(target);window.clearListingUnitPhotos?.(form,target)}tagFields(form);prepareDuplicateButtons()},0);
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
