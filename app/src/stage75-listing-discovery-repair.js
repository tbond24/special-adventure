(() => {
  const serviceIcon = name => `<svg class="service-icon" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
  const categoryDetails = value => ({
    home: ['house', 'Home'],
    apartment: ['building', 'Apartment'],
    shop: ['shop', 'Shop'],
    other: ['location-pin', 'Other']
  })[value] || ['location-pin', 'Other'];

  function priceParts(v) {
    const original = v.rentCurrency || marketForCountry(v.property?.country).currency;
    const shown = displayAmount(v.rentAmount ?? v.monthlyRent, original);
    const amount = `${shown.converted ? '≈ ' : ''}${shown.label} ${shown.value.toLocaleString(shown.locale)}`;
    const period = v.rentPeriod || marketForCountry(v.property?.country).rentPeriod;
    return `<span class="listing-price-amount">${escapeHtml(amount)}</span><span class="listing-price-period">/${escapeHtml(period)}</span>`;
  }

  function standoutFeatures(v) {
    const custom = (v.property?.customFeatures || []).filter(item => item?.label && item?.icon);
    const known = [
      [v.property?.securityAvailable, 'shield', 'Security'],
      [v.property?.internetAvailable, 'wifi', 'Wi-Fi'],
      [v.room?.ensuite === true, 'shower', 'Ensuite'],
      [v.room?.furnished === true, 'furnished', 'Furnished'],
      [v.property?.parkingSpaces > 0, 'parking', 'Parking']
    ].filter(item => item[0]).map(([, icon, label]) => ({icon, label}));
    const seen = new Set();
    return [...custom, ...known].filter(item => {
      const key = String(item.label).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 4);
  }

  card = function(v) {
    const isSaved = saved.has(v.id);
    const place = listingLocation(v);
    const category = vacancyCategory(v);
    const [categoryIcon, categoryLabel] = categoryDetails(category);
    const currency = Object.values(MARKETS).find(item => item.currency === v.rentCurrency) || marketForCountry(v.property.country);
    const deposit = v.deposit != null && Number(v.deposit) > 0
      ? `<span class="deposit-card-pill"><span class="deposit-long">Deposit</span><span class="deposit-short">Dep.</span> ${currency.currencyLabel} ${Number(v.deposit).toLocaleString(currency.locale)}</span>`
      : '';
    const distance = typeof distanceTo === 'function' ? distanceTo(v) : null;
    const unit = typeof distanceUnit === 'function' ? distanceUnit() : 'km';
    const shownDistance = distance == null ? '' : `${(unit === 'mi' ? distance / 1.609344 : distance).toFixed(1)} ${unit} away`;
    const features = standoutFeatures(v);
    return `<article class="card listing-card category-${category}" data-open-card="${v.id}" role="link" tabindex="0" aria-label="Open ${escapeHtml(v.room.name)}">
      <div class="listing-visual">${cardMedia(v)}<button class="heart-action${isSaved ? ' saved' : ''}" data-save="${v.id}" aria-label="${isSaved ? 'Remove from saved' : 'Save'} ${escapeHtml(v.room.name)}" aria-pressed="${isSaved}"><svg class="nav-icon nav-icon--fillable" aria-hidden="true"><use href="#icon-saved"></use></svg></button></div>
      <div class="card-body">
        <div class="listing-location" title="${escapeHtml(place)}">${serviceIcon('location-pin')}${escapeHtml(place)}</div>
        <h3 class="listing-category-title">${serviceIcon(categoryIcon)}<span>${escapeHtml(v.room.roomType || categoryLabel)}</span></h3>
        <div class="price listing-price">${priceParts(v)}</div>
        ${shownDistance ? `<div class="listing-distance list-detail">${escapeHtml(shownDistance)}</div>` : ''}
        <div class="listing-highlights">${features.map((item, index) => `<span class="service-card-pill ${index > 1 ? 'list-detail' : ''}" title="${escapeHtml(item.label)}">${serviceIcon(item.icon)}<span class="sr-only">${escapeHtml(item.label)}</span></span>`).join('')}${deposit}</div>
      </div>
    </article>`;
  };

  const setCurrencyBefore75 = setDisplayCurrency;
  setDisplayCurrency = async function(code) {
    const view = exploreMap ? {center: exploreMap.getCenter(), zoom: exploreMap.getZoom()} : null;
    await setCurrencyBefore75(code);
    if (view && exploreMap) {
      suppressMapMove = true;
      exploreMap.setView(view.center, view.zoom, {animate: false});
    }
  };

  function repairListingJourney() {
    const host = document.querySelector('#listingHost');
    const start = host?.querySelector('.listing-start');
    const form = host?.querySelector('form.guided-listing');
    if (!start || !form || form.dataset.stage75) return;
    if (!start.classList.contains('complete')) return;
    form.dataset.stage75 = 'true';
    const type = start.querySelector('[data-listing-type].selected')?.dataset.listingType || 'Listing';
    const mode = start.querySelector('[data-add-mode].selected')?.dataset.addMode === 'existing' ? 'Existing property' : 'New property';
    const breadcrumb = document.createElement('nav');
    breadcrumb.className = 'listing-choice-breadcrumb';
    breadcrumb.setAttribute('aria-label', 'Listing choices');
    breadcrumb.innerHTML = `<button type="button" aria-label="Change listing choices">←</button><span>${escapeHtml(type)}</span><b>›</b><span>${escapeHtml(mode)}</span>`;
    form.prepend(breadcrumb);
    breadcrumb.querySelector('button').onclick = () => {
      form.hidden = true;
      start.classList.remove('complete');
      start.querySelectorAll('button').forEach(button => button.disabled = button.dataset.addMode === 'existing' && !window.__listingProperties?.length);
      start.hidden = false;
    };
    start.hidden = true;

    const steps = form.querySelector('.listing-steps');
    if (steps) {
      steps.classList.remove('compact-progress');
      steps.classList.add('listing-top-stepper');
      const labels = ['Property', 'Unit', 'Location', 'Review'];
      [...steps.querySelectorAll('button')].forEach((button, index) => {
        const number = button.querySelector('b');
        const text = [...button.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
        if (number) number.textContent = String(index + 1);
        if (text) text.textContent = ` ${labels[index] || 'Review'}`;
      });
    }

    form.querySelector('.listing-preview-action')?.classList.add('review-action-hidden');
    form.querySelectorAll('[data-base-name="smokingOverride"], [name="smokingOverride"], [data-base-name="petsOverride"], [name="petsOverride"]').forEach(control => {
      control.value = '';
      const row = control.closest('.service-choice, label');
      if (row) row.hidden = true;
    });
    const unitAdvanced = [...form.querySelectorAll('.advanced-unit-settings')].find(item => /Advanced unit/i.test(item.textContent));
    unitAdvanced?.querySelector('.inheritance-note')?.replaceChildren(document.createTextNode('Property rules apply automatically to every unit.'));

    const propertyBody = [...form.querySelectorAll('.composer-section')].find(item => /Property details/i.test(item.textContent))?.querySelector('.composer-section-body');
    if (propertyBody) {
      const continuation = propertyBody.querySelector('.section-continue');
      ['.property-features', '.property-utilities', '.property-rules', '.advanced-unit-settings'].forEach(selector => {
        const item = propertyBody.querySelector(selector);
        if (item && continuation) continuation.before(item);
      });
    }
  }

  const renderListBefore75 = renderList;
  renderList = async function() {
    await renderListBefore75();
    const host = document.querySelector('#listingHost');
    const repair = () => host?.querySelectorAll('form.guided-listing').forEach(repairListingJourney);
    repair();
    if (host && !host.dataset.stage75Observer) {
      host.dataset.stage75Observer = 'true';
      new MutationObserver(repair).observe(host, {childList: true, subtree: true});
      host.addEventListener('click', event => {
        if (event.target.closest('[data-add-mode]')) setTimeout(repair, 0);
      }, true);
    }
  };

  function keepOwnerActionsIconOnly() {
    document.querySelectorAll('#mine [data-status="paused"]').forEach(button => {
      button.className = 'icon-button pause-icon-action';
      button.innerHTML = '<svg class="control-icon" aria-hidden="true"><use href="#icon-pause"></use></svg>';
      button.setAttribute('aria-label', 'Pause listing');
      button.title = 'Pause listing';
    });
  }
  const renderListIconBefore75 = renderList;
  renderList = async function() { await renderListIconBefore75(); keepOwnerActionsIconOnly(); };
})();
