// Isolated listing-page experiment. The existing #detail route and renderer stay untouched.
async function renderDetailQuiet(id) {
  await window.VACANCY_LISTING_OPTIONS?.ready;
  if (!['detail', 'detail-quiet'].includes(parseHash().name) || parseHash().id !== id) return;
  const vacancy = vacancies.find(item => item.id === id);
  if (!vacancy) {
    layout('<div class="empty">Vacancy not found. <a href="#home">Return to Find</a></div>');
    document.querySelector('#app > .page-back')?.remove();
    return;
  }

  const v = vacancy;
  VACANCY_BACKEND.trackEvent('vacancy_opened', id, window.location.hash);
  const title = String(v.room?.name || 'Vacancy');
  const media = (v.room?.media || []).filter(item => item?.url);
  const siblings = vacancies.filter(item => item.id !== id && item.property?.id === v.property?.id);
  const location = [v.property?.suburb, v.property?.city, v.property?.state]
    .filter(Boolean).filter((part, index, parts) => parts.indexOf(part) === index).join(', ');
  const priceFor = item => Number(item.rentAmount ?? item.monthlyRent) > 0 ? formatListingPrice(item) : 'Price on request';
  const price = priceFor(v);
  const icon = name => `<svg class="control-icon" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
  const featureRows = [];
  const unitOptions = v.room?.unitDetails && typeof v.room.unitDetails === 'object' ? v.room.unitDetails : {};
  const hasUnitOptions = Object.keys(unitOptions).length > 0;
  const safeUnitIcon = (value, fallback) => { const name=String(value||'').toLowerCase().replace(/[^a-z-]/g,''); return document.getElementById(`icon-${name}`) ? name : fallback; };
  const addFeature = (label, symbol, group, priority) => {
    const slot = group === 'More features' ? 'listing-custom' : ({wifi:'listing-wifi',parking:'listing-parking',furnished:'listing-furnished',shower:'listing-ensuite',bills:'listing-bills',shield:'listing-security',water:'listing-water',bolt:'listing-electricity'})[symbol];
    if (slot && window.VACANCY_LISTING_OPTIONS?.isVisible(slot) === false) return;
    if (!label || featureRows.some(item => item.label.toLowerCase() === label.toLowerCase())) return;
    featureRows.push({label, symbol, group, priority});
  };
  if (hasUnitOptions) {
    const parking = Number(unitOptions.parkingSpaces || 0);
    if (parking > 0) addFeature(`${parking} parking space${parking === 1 ? '' : 's'}`, 'parking', 'Parking', 1);
    for (const feature of Array.isArray(unitOptions.amenities) ? unitOptions.amenities : []) addFeature(String(feature.label || ''), safeUnitIcon(feature.icon,'house'), 'Amenities', 2);
    for (const utility of Array.isArray(unitOptions.utilities) ? unitOptions.utilities : []) addFeature(String(utility.label || ''), safeUnitIcon(utility.icon,'bolt'), 'Utilities', 2);
  } else {
  if (v.property?.internetAvailable) addFeature('Wi-Fi or internet', 'wifi', 'Utilities', 2);
  if (Number(v.property?.parkingSpaces) > 0) addFeature(`${v.property.parkingSpaces} parking space${Number(v.property.parkingSpaces) === 1 ? '' : 's'}`, 'parking', 'Parking', 1);
  if (v.room?.furnished === true) addFeature('Furnished', 'furnished', 'Bedroom', 2);
  if (v.room?.ensuite === true) addFeature('Private ensuite', 'shower', 'Bathroom', 2);
  if (v.billsIncluded === true) addFeature('Utilities included', 'bills', 'Utilities', 2);
  if (v.property?.securityAvailable) addFeature('Security', 'shield', 'Building', 3);
  for (const feature of Array.isArray(v.property?.customFeatures) ? v.property.customFeatures : []) {
    const label = String(feature?.label || '').trim();
    const requestedIcon = String(feature?.icon || '').toLowerCase().replace(/[^a-z-]/g, '');
    const symbol = document.getElementById(`icon-${requestedIcon}`) ? requestedIcon : 'house';
    addFeature(label, symbol, 'More features', 1);
  }
  if (v.property?.waterAvailable) addFeature('Water available', 'water', 'Utilities', 5);
  if (v.property?.electricityAvailable) addFeature('Electricity available', 'bolt', 'Utilities', 5);
  }
  featureRows.sort((a, b) => a.priority - b.priority);
  const featureMarkup = item => `<li>${icon(item.symbol)}<span>${escapeHtml(item.label)}</span></li>`;
  const rules = hasUnitOptions ? (Array.isArray(unitOptions.rules) ? unitOptions.rules : []).map(rule => { const label=String(rule.label || '').trim(); return label ? (rule.allowed ? `${label} allowed` : `No ${label.charAt(0).toLowerCase()}${label.slice(1)}`) : ''; }).filter(Boolean) : [v.property?.smokingAllowed ? 'Smoking allowed' : 'No smoking allowed',v.property?.petsConsidered ? 'Pets considered' : 'Pets not confirmed'];
  const description = String(v.room?.description || '').trim();
  const propertyDescription = String(v.property?.householdSummary || '').trim();
  const shortDescription = description.length > 320 ? description.slice(0, 320).trimEnd() + '…' : description;
  const facts = [v.room?.roomType, v.property?.propertyType].filter(Boolean)
    .filter((part, index, parts) => parts.findIndex(other => other.toLowerCase() === part.toLowerCase()) === index);
  if (v.room?.furnished === true) facts.push('Furnished');
  if (v.room?.ensuite === true) facts.push('Private bathroom');
  if (Number(v.room?.maxOccupants) > 1) facts.push(`Up to ${v.room.maxOccupants} occupants`);
  const bedroomCount = Number(v.property?.bedrooms);
  const bathroomCount = Number(v.property?.bathrooms);
  const roomCount = String(v.room?.roomType || '').match(/^(\d+)\s*bedroom/i);
  const countFacts = [
    roomCount ? {count: Number(roomCount[1]), icon: 'bed', label: 'bedrooms'} : String(v.room?.roomType || '').toLowerCase() === 'house' && bedroomCount > 0 ? {count: bedroomCount, icon: 'bed', label: 'bedrooms'} : null,
    String(v.room?.roomType || '').toLowerCase() === 'house' && bathroomCount > 0 ? {count: bathroomCount, icon: 'shower', label: 'bathrooms'} : null
  ].filter(Boolean);
  const slides = media.length ? media.map((item, index) =>
    `<div class="detail-gallery-slide quiet-gallery-slide" data-detail-slide="${index}"><img src="${escapeHtml(item.url)}" alt="${escapeHtml(title)} photo ${index + 1}" loading="${index ? 'lazy' : 'eager'}" decoding="async"${index ? '' : ' fetchpriority="high"'}></div>`).join('')
    : '<div class="detail-gallery-slide quiet-gallery-slide"><div class="detail-photo-placeholder" role="img" aria-label="No listing photo available"></div></div>';
  const siblingMarkup = siblings.map(item => {
    const image = item.room?.media?.find(entry => entry?.url)?.url;
    return `<a class="quiet-room" href="#detail/${encodeURIComponent(item.id)}">${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" decoding="async">` : '<span class="quiet-room-placeholder" aria-hidden="true"></span>'}<span><strong>${escapeHtml(item.room?.name || 'Unit')}</strong><small>${escapeHtml(item.room?.roomType || 'Unit')} · ${escapeHtml(priceFor(item))}</small></span>${icon('chevron')}</a>`;
  }).join('');
  const avatar = v.owner?.avatarUrl ? `<img src="${escapeHtml(v.owner.avatarUrl)}" alt="" loading="lazy">` : `<span aria-hidden="true">${escapeHtml(String(v.owner?.displayName || 'V').charAt(0).toUpperCase())}</span>`;
  const availableDate = v.availableFrom ? new Date(`${String(v.availableFrom).slice(0, 10)}T12:00:00`) : null;
  const date = availableDate && !Number.isNaN(availableDate.getTime())
    ? new Intl.DateTimeFormat(marketForCountry(v.property?.country).locale, {day:'numeric', month:'short', year:'numeric'}).format(availableDate) : '';
  const deposit = Number(v.deposit) > 0 ? displayAmount(v.deposit, v.rentCurrency || marketForCountry(v.property?.country).currency) : null;
  const depositTerms = String(unitOptions.depositTerms || '').trim();
  const depositInfo = deposit && depositTerms ? '<button type="button" class="quiet-deposit-info" aria-label="Deposit terms and conditions">i</button>' : '';
  const recurringRows = ['water','garbage'].map(kind => {
    const entry = unitOptions.recurringFees?.[kind];
    if (!entry || typeof entry !== 'object') return '';
    const amount = Number(entry.amount);
    const fee = entry.amount !== '' && Number.isFinite(amount) && amount >= 0 ? displayAmount(amount, v.rentCurrency || marketForCountry(v.property?.country).currency) : null;
    const days = Array.isArray(entry.days) ? entry.days.filter(day => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].includes(day)) : [];
    if (!fee && !days.length) return '';
    const label = kind === 'water' ? 'Water' : 'Garbage collection';
    const text = [fee ? `${fee.label} ${fee.value.toLocaleString(fee.locale)} / ${entry.period === 'weekly' ? 'week' : 'month'}` : '', days.length ? `${kind === 'water' ? 'Available' : 'Collected'} ${days.join(', ')}` : ''].filter(Boolean).join(' · ');
    return `<div><dt>${label}</dt><dd>${escapeHtml(text)}</dd></div>`;
  }).join('');
  const comparePrice = Number(v.comparePrice) > Number(v.rentAmount ?? v.monthlyRent) ? formatListingPrice({...v,rentAmount:Number(v.comparePrice)}) : '';

  document.querySelector('.listing-lightbox')?.remove();
  layout(`<article class="quiet-detail" data-quiet-id="${escapeHtml(id)}">
    <section class="quiet-gallery" aria-label="Listing photos">
      <div class="quiet-gallery-track" data-quiet-gallery>${slides}</div>
      ${media.length > 1 ? `<div class="quiet-gallery-controls"><button class="gallery-arrow gallery-arrow-prev quiet-gallery-arrow" type="button" data-quiet-gallery-step="-1" aria-label="Previous listing photo"><svg class="control-icon" aria-hidden="true"><use href="#icon-chevron"></use></svg></button><button class="gallery-arrow gallery-arrow-next quiet-gallery-arrow" type="button" data-quiet-gallery-step="1" aria-label="Next listing photo"><svg class="control-icon" aria-hidden="true"><use href="#icon-chevron"></use></svg></button></div>` : ''}
      <div class="quiet-hero-actions"><button type="button" class="quiet-icon-button quiet-back" aria-label="Go back"><svg class="control-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg></button><span><button type="button" class="quiet-icon-button quiet-share" aria-label="Share listing"><svg class="control-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7"/></svg></button><button type="button" class="quiet-icon-button quiet-save" aria-label="${saved.has(id) ? 'Remove from saved' : 'Save listing'}" aria-pressed="${saved.has(id)}">${icon('saved')}</button></span></div>
      ${media.length ? `<button type="button" class="quiet-photo-count" aria-label="Open all ${media.length} photos">1 / ${media.length}</button>` : ''}
    </section>
    <div class="quiet-content">
      <div class="quiet-intro"><p class="quiet-location">${icon('location-pin')}${escapeHtml(location || v.property?.country || 'Location available on map')}</p><h1>${escapeHtml(title)}</h1>${countFacts.length ? `<div class="quiet-count-facts">${countFacts.map(item => `<span>${item.count}× ${icon(item.icon)}<span class="sr-only">${item.label}</span></span>`).join('')}</div>` : ''}${facts.length ? `<p class="quiet-facts">${facts.map(escapeHtml).join(' · ')}</p>` : ''}</div>
      ${description ? `<section class="quiet-section quiet-description"><h2>About this place</h2><p class="quiet-description-preview">${escapeHtml(shortDescription)}</p>${description.length > 320 ? `<details class="quiet-more"><summary><span class="quiet-closed">Show more</span><span class="quiet-open">Show less</span></summary><p>${escapeHtml(description)}</p></details>` : ''}</section>` : ''}
      ${propertyDescription ? `<section class="quiet-section"><h2>About the property</h2><p class="quiet-paragraph">${escapeHtml(propertyDescription)}</p></section>` : ''}
      ${siblings.length ? `<section class="quiet-section"><h2>Other available units here</h2><div class="quiet-rooms">${siblingMarkup}</div></section>` : ''}
      ${featureRows.length ? `<section class="quiet-section quiet-features"><h2>Amenities & features</h2><ul class="quiet-feature-preview">${featureRows.slice(0, 4).map(featureMarkup).join('')}</ul>${featureRows.length > 4 ? `<details class="quiet-more"><summary><span class="quiet-closed">Show all ${featureRows.length} features</span><span class="quiet-open">Show less</span></summary>${[...new Set(featureRows.map(item => item.group))].map(group => `<h3>${escapeHtml(group)}</h3><ul>${featureRows.filter(item => item.group === group).map(featureMarkup).join('')}</ul>`).join('')}</details>` : ''}</section>` : ''}
      ${rules.length ? `<section class="quiet-section quiet-rules"><h2>Rules & safety</h2><details><summary>Show rules</summary><p>${rules.map(escapeHtml).join(' · ')}</p></details></section>` : ''}
      <section class="quiet-section"><h2>Rental details</h2><dl class="quiet-terms"><div><dt>Rent</dt><dd>${escapeHtml(price)}</dd></div>${deposit ? `<div><dt>Deposit ${depositInfo}</dt><dd>${escapeHtml(deposit.label)} ${deposit.value.toLocaleString(deposit.locale)}</dd></div>` : ''}${recurringRows}${date ? `<div><dt>Available from</dt><dd>${escapeHtml(date)}</dd></div>` : ''}${Number(v.minimumStayWeeks) > 0 ? `<div><dt>Minimum stay</dt><dd>${Number(v.minimumStayWeeks)} weeks</dd></div>` : ''}${!hasUnitOptions && v.billsIncluded != null ? `<div><dt>Utilities</dt><dd>${v.billsIncluded ? 'Included' : 'Check with lister'}</dd></div>` : ''}</dl></section>
      <section class="quiet-section quiet-location-section"><h2>Location</h2><p>${escapeHtml(location || v.property?.country || 'Approximate location')}</p>${v.property?.landmark ? `<p class="quiet-secondary">Near ${escapeHtml(v.property.landmark)}</p>` : ''}<div id="detailLocationMap" aria-label="Approximate listing location"></div><p class="quiet-secondary">Map pin is approximate to protect the lister’s privacy.</p></section>
      <section class="quiet-section"><h2>Listed by</h2><button type="button" class="quiet-lister"><span class="quiet-avatar">${avatar}</span><span><strong>${escapeHtml(v.owner?.displayName || 'Vacancy member')}</strong>${v.owner?.bio ? `<small>${escapeHtml(v.owner.bio)}</small>` : ''}</span>${icon('chevron')}</button></section>
      <section class="quiet-section quiet-moderation-entry"><button type="button" class="quiet-moderation-link">Report or block</button></section>
    </div>
  </article><aside class="quiet-action-bar" aria-label="Listing action"><div class="quiet-action-copy"><div class="quiet-action-prices"><strong>${escapeHtml(price)}</strong>${comparePrice ? `<s aria-label="Previous price ${escapeHtml(comparePrice)}">${escapeHtml(comparePrice)}</s>` : ''}</div>${deposit ? `<small class="quiet-action-deposit">Deposit ${escapeHtml(deposit.label)} ${deposit.value.toLocaleString(deposit.locale)} ${depositInfo}</small>` : ''}${date ? `<small class="quiet-action-date">Available ${escapeHtml(date)}</small>` : ''}</div><button type="button" class="quiet-message">Is this available?</button></aside>`);
  if (depositInfo) document.querySelectorAll('.quiet-deposit-info').forEach(button => button.onclick = () => {
    const dialog = document.createElement('dialog');
    dialog.className = 'quiet-deposit-dialog';
    dialog.innerHTML = `<h2>Deposit terms and conditions</h2><p>${escapeHtml(depositTerms)}</p><button type="button">Close</button>`;
    dialog.querySelector('button').onclick = () => dialog.close();
    dialog.addEventListener('close', () => dialog.remove());
    document.body.append(dialog);
    dialog.showModal();
  });
  document.querySelector('#app > .page-back')?.remove();
  const page = document.querySelector('.quiet-detail');
  const track = page.querySelector('[data-quiet-gallery]');
  const count = page.querySelector('.quiet-photo-count');
  const currentPhoto = () => Math.min(media.length - 1, Math.max(0, Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
  const arrows = [...page.querySelectorAll('[data-quiet-gallery-step]')];
  const syncGallery = () => {
    if (count) count.textContent = `${currentPhoto() + 1} / ${media.length}`;
    arrows.forEach(button => button.disabled = currentPhoto() + Number(button.dataset.quietGalleryStep) < 0 || currentPhoto() + Number(button.dataset.quietGalleryStep) >= media.length);
  };
  track.addEventListener('scroll', syncGallery, {passive: true});
  arrows.forEach(button => button.onclick = event => {
    event.stopPropagation();
    const next = Math.max(0, Math.min(media.length - 1, currentPhoto() + Number(button.dataset.quietGalleryStep)));
    track.scrollTo({left: next * track.clientWidth, behavior: 'smooth'});
  });
  syncGallery();
  if (media.length) {
    initListingLightbox(v);
    document.querySelector('.listing-lightbox')?.setAttribute('data-quiet-experiment', '');
    count.onclick = () => page.querySelectorAll('.quiet-gallery-slide img')[currentPhoto()]?.click();
  }
  page.querySelector('.quiet-avatar img')?.addEventListener('error', event => {
    event.currentTarget.replaceWith(document.createTextNode(String(v.owner?.displayName || 'V').charAt(0).toUpperCase()));
  }, {once: true});
  page.querySelector('.quiet-back').onclick = () => {
    if (window.__vacancyPreviousRoute && history.length > 1) history.back();
    else nav('home');
  };
  page.querySelector('.quiet-share').onclick = async () => {
    const shareUrl = `${window.location.origin}${publicListingPath(v)}`;
    try {
      if (navigator.share) await navigator.share({title, url: shareUrl});
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(shareUrl); toast('Listing link copied'); }
      else prompt('Copy listing link', shareUrl);
    } catch (error) { if (error.name !== 'AbortError') toast('Could not share this listing'); }
  };
  page.querySelector('.quiet-save').onclick = async event => {
    await toggleSave(id);
    if (!page.isConnected) return;
    event.currentTarget.setAttribute('aria-pressed', String(saved.has(id)));
    event.currentTarget.setAttribute('aria-label', saved.has(id) ? 'Remove from saved' : 'Save listing');
  };
  document.querySelector('.quiet-message').onclick = () => { sessionStorage.setItem('vacancyEnquiryPreset', JSON.stringify({id, text:'Hi, is this still available?'})); nav('enquire', id); };
  page.querySelector('.quiet-lister').onclick = () => nav('lister', v.owner?.id);
  page.querySelector('.quiet-moderation-link').onclick = () => {
    const dialog = document.createElement('dialog');
    dialog.className = 'quiet-moderation-dialog';
    dialog.innerHTML = `<button type="button" class="quiet-dialog-close" aria-label="Close">×</button><h2>Report or block</h2><div class="quiet-moderation-choices"><button type="button" class="quiet-report-choice">Report listing</button><button type="button" class="quiet-block-choice">Block lister</button></div><form class="quiet-report-form" hidden><label>Why are you reporting this listing?<select name="reason" required><option value="">Choose a reason</option><option value="Scam">Scam</option><option value="Inaccurate listing">Inaccurate listing</option><option value="Offensive content">Offensive content</option><option value="Other">Other</option></select></label><label>Additional details (optional)<textarea name="details" maxlength="1000" rows="3" placeholder="Tell us what happened"></textarea></label><button type="submit">Send report</button></form><div class="quiet-block-confirm" hidden><p>Hide this lister’s properties and stop messaging them? You can unblock them in You → Blocked accounts.</p><button type="button">Block lister</button></div>`;
    document.body.append(dialog);
    dialog.onclose = () => dialog.remove();
    dialog.querySelector('.quiet-dialog-close').onclick = () => dialog.close();
    dialog.querySelector('.quiet-report-choice').onclick = () => { dialog.querySelector('.quiet-moderation-choices').hidden = true; dialog.querySelector('.quiet-report-form').hidden = false; };
    dialog.querySelector('.quiet-block-choice').onclick = () => { dialog.querySelector('.quiet-moderation-choices').hidden = true; dialog.querySelector('.quiet-block-confirm').hidden = false; };
    dialog.querySelector('[name=reason]').onchange = event => { dialog.querySelector('[name=details]').required = event.target.value === 'Other'; };
    dialog.querySelector('.quiet-report-form').onsubmit = async event => {
      event.preventDefault();
      if (!currentUser || currentUser.is_anonymous) { dialog.close(); nav('auth'); toast('Sign in to report a listing'); return; }
      const form = event.currentTarget, data = new FormData(form), button = form.querySelector('[type=submit]');
      button.disabled = true;
      try { await VACANCY_BACKEND.reportVacancy(id, v.owner.id, data.get('reason'), data.get('details')); dialog.close(); toast('Report sent to Vacancy'); }
      catch (error) { toast(error.message); button.disabled = false; }
    };
    dialog.querySelector('.quiet-block-confirm button').onclick = async event => {
      if (!currentUser || currentUser.is_anonymous) { dialog.close(); nav('auth'); toast('Sign in to block a lister'); return; }
      if (v.owner.id === currentUser.id) { dialog.close(); toast('This is your listing'); return; }
      event.currentTarget.disabled = true;
      try { await VACANCY_BACKEND.blockUser(v.owner.id); await refreshVacancies(); dialog.close(); toast('Lister blocked'); nav('home'); }
      catch (error) { toast(error.message); event.currentTarget.disabled = false; }
    };
    dialog.showModal();
  };
  if (v.property?.publicLatitude != null && v.property?.publicLongitude != null && Number.isFinite(Number(v.property.publicLatitude)) && Number.isFinite(Number(v.property.publicLongitude))) initDetailLocationPreview(v);
  else page.querySelector('#detailLocationMap')?.remove();
  window.scrollTo({top: 0, left: 0, behavior: 'instant'});
}
