(() => {
  renderEdit = async function (id) {
    try {
      const listing = await VACANCY_BACKEND.listingForEdit(id);
      await renderList();
      const host = document.querySelector('#listingHost');
      const start = host?.querySelector('.listing-start');
      if (!start) throw new Error('The listing editor could not open');
      host.dataset.mode = 'edit';
      document.querySelector('main:has(#listingHost) .section-head')?.setAttribute('hidden','');
      document.querySelector('.vacancy-manager-head')?.setAttribute('hidden','');
      document.querySelector('#mine')?.setAttribute('hidden','');
      const type = start.querySelector('[data-listing-type="Residential"]') || start.querySelector('[data-listing-type]');
      type?.click();
      const preset = start.querySelector('[data-home-preset]');
      if (preset && [...preset.options].some(option => option.value === listing.unitType)) preset.value = listing.unitType;
      start.querySelector('[data-add-mode="new"]')?.click();
      await new Promise(resolve => setTimeout(resolve,0));
      const form = host.querySelector('#listingForm');
      if (!form || !form.dataset.journey101) throw new Error('The current listing editor could not open');
      form.dataset.editVacancy = id;
      delete form.dataset.draftDiscarded;form.dataset.draftScope='edit-'+id;
      form.querySelector('.add-unit')?.setAttribute('hidden','');
      form.querySelectorAll('.unit-editor:not([data-unit-index="0"])').forEach(unit => unit.remove());
      const unit = form.querySelector('.unit-editor');
      const assign = (name,value) => {
        const field = unit?.querySelector('[data-base-name="'+name+'"]') || form.elements[name];
        if (!field || value === undefined || value === null) return;
        if (field.tagName === 'SELECT' && ![...field.options].some(option => option.value === String(value))) field.add(new Option(String(value),String(value)));
        field.value = String(value);
        field.dataset.manual = 'true';
      };
      for (const name of ['region','city','locality','landmark','postal','marketCode','country','address','propertyType','parkingSpaces','household','roomName','unitType','rentAmount','rentCurrency','rentPeriod','deposit','availableFrom','minimumStayWeeks','maxOccupants','description']) assign(name,listing[name]);
      const title = unit.querySelector('[data-base-name="roomName"]');
      if (title?.dataset.titleMode === 'auto') unit.querySelector('.title-mode-toggle')?.click();
      if (title) title.value = listing.roomName;
      for (const name of ['furnished','ensuite','billsIncluded','smokingAllowed','petsConsidered','waterAvailable','electricityAvailable','securityAvailable','internetAvailable']) assign(name,listing[name] == null ? '' : String(listing[name]));
      assign('smokingOverride',listing.smokingAllowedOverride == null ? '' : String(listing.smokingAllowedOverride));
      assign('petsOverride',listing.petsConsideredOverride == null ? '' : String(listing.petsConsideredOverride));
      unit.querySelector('.unit-name-input').value = listing.privateName || listing.roomName;
      const details = listing.unitDetails || {};
      unit.dispatchEvent(new CustomEvent('vacancy:apply-unit-options',{detail:details,bubbles:true}));
      const map = form.querySelector('#newPropertyMap');
      map?._vacancySetLocation?.(listing.publicLatitude,listing.publicLongitude,false);
      assign('publicLatitude',listing.publicLatitude);
      assign('publicLongitude',listing.publicLongitude);
      const photoInput = unit.querySelector('input[type="file"]');
      if(photoInput){photoSelections.set(photoInput,[]);photoInput.value='';renderPhotoSelection(photoInput)}
      const photoLabel = photoInput?.closest('label');
      if (photoLabel) {
        const existing = document.createElement('div');
        existing.className = 'edit-existing-photos';
        existing.innerHTML = listing.media.map((photo,index) => `<span class="edit-existing-photo" data-media-id="${escapeHtml(photo.id)}"><img src="${escapeHtml(photo.url)}" alt="Listing photo ${index+1}"><button type="button" aria-label="Remove photo ${index+1}">×</button></span>`).join('');
        photoLabel.before(existing);
        existing.addEventListener('click',async event => {
          const button = event.target.closest('button');
          if (!button) return;
          const tile = button.closest('.edit-existing-photo');
          const photo = listing.media.find(item => item.id === tile?.dataset.mediaId);
          if (!photo || !confirm('Remove this photo from the listing?')) return;
          if (existing.querySelectorAll('.edit-existing-photo').length <= 3) { toast('Keep at least 3 uploaded photos on the listing'); return; }
          try { await VACANCY_BACKEND.deleteMedia(photo); tile.remove(); toast('Photo removed'); }
          catch (error) { toast(error.message); }
        });
      }
      const reuse = form.querySelector('[data-reuse-create-media]');
      if (reuse) reuse.textContent = 'Reuse existing photos';
      form.onsubmit = async event => {
        event.preventDefault();
        if (form.dataset.publishing === 'true') return;
        form.dataset.publishing = 'true';
        const button = form.querySelector('button.primary.wide');
        if (button) button.disabled = true;
        try {
          const values = Object.fromEntries(new FormData(form));
          const read = name => unit.querySelector('[data-base-name="'+name+'"]')?.value ?? values[name] ?? '';
          const general=values.locality||values.city||values.region||form.dataset.locationLabel||values.country||listing.country;
          const input = {...listing,...values,locality:values.locality||general,city:values.city||values.region||general,region:values.region||values.city||general,address:values.address||general,parkingSpaces:listing.parkingSpaces};
          for (const name of ['roomName','unitType','rentAmount','rentCurrency','rentPeriod','deposit','availableFrom','minimumStayWeeks','maxOccupants','description','furnished','ensuite','billsIncluded','smokingOverride','petsOverride']) input[name] = read(name);
          for (const name of ['furnished','ensuite']) input[name] = input[name] === '' ? null : input[name] === 'true';
          for (const name of ['billsIncluded','smokingAllowed','petsConsidered','waterAvailable','electricityAvailable','securityAvailable','internetAvailable']) input[name] = input[name] === 'true';
          const stayPeriod = unit.querySelector('[data-stay-period]')?.value || 'week';
          if (input.minimumStayWeeks) input.minimumStayWeeks = String(Math.round(Number(input.minimumStayWeeks) * ({week:1,month:4.345,year:52.14}[stayPeriod] || 1)));
          const files = selectedPhotoFiles(photoInput);
          const photoTotal = files.length + form.querySelectorAll('.edit-existing-photo').length;
          if (photoTotal < 3) throw new Error('Add at least 3 images for this listing');
          if (photoTotal > 8) throw new Error('Maximum 8 images');
          await VACANCY_BACKEND.updateListing(id,input);
          await VACANCY_BACKEND.updateRoomOverrides(listing.roomId,input);
          const unitDetails = JSON.parse(read('unitDetails') || '{}');
          await VACANCY_BACKEND.saveUnitListingDetails(id,unitDetails,unit.querySelector('.unit-name-input')?.value.trim() || '');
          if (files.length) await VACANCY_BACKEND.uploadListingImages(id,await optimiseListingImages(files),`edit-${crypto.randomUUID()}`);
          if (input.publicLatitude && input.publicLongitude) await VACANCY_BACKEND.setVacancyPublicLocation(id,input.publicLatitude,input.publicLongitude);
          await refreshVacancies();
          clearListingDraft(form);toast('Listing updated');
          nav('list');
        } catch (error) { toast(error.message); }
        finally { delete form.dataset.publishing; if (button) button.disabled = false; }
      };
      restoreListingDraft(form);
      const savedLat=form.elements.publicLatitude?.value,savedLon=form.elements.publicLongitude?.value;
      if(savedLat&&savedLon)map?._vacancySetLocation?.(Number(savedLat),Number(savedLon),false);
      window.scrollTo({top:0,behavior:'instant'});
    } catch (error) {
      layout('<section class="not-found" role="alert"><h1>Listing could not open</h1><p>'+escapeHtml(error.message)+'</p><button type="button" class="primary" id="retryListingEdit">Try again</button></section>');
      document.querySelector('#retryListingEdit').onclick = () => renderEdit(id);
    }
  };
})();
