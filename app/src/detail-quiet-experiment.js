// Isolated listing-page experiment. The existing #detail route and renderer stay untouched.
function renderDetailQuiet(id) {
  const vacancy = vacancies.find(item => item.id === id);
  if (!vacancy) {
    layout('<div class="empty">Vacancy not found. <a href="#home">Return to Find</a></div>');
    document.querySelector('#app > .page-back')?.remove();
    return;
  }

  const v = vacancy;
  VACANCY_BACKEND.trackEvent('vacancy_opened', id, `#detail-quiet/${id}`);
  const title = String(v.room?.name || 'Vacancy');
  const media = (v.room?.media || []).filter(item => item?.url);
  const siblings = vacancies.filter(item => item.id !== id && item.property?.id === v.property?.id);
  const location = [v.property?.suburb, v.property?.city, v.property?.state]
    .filter(Boolean).filter((part, index, parts) => parts.indexOf(part) === index).join(', ');
  const priceFor = item => Number(item.rentAmount ?? item.monthlyRent) > 0 ? formatListingPrice(item) : 'Price on request';
  const price = priceFor(v);
  const icon = name => `<svg class="control-icon" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
  const featureRows = [];
  const addFeature = (label, symbol, group, priority) => {
    if (!label || featureRows.some(item => item.label.toLowerCase() === label.toLowerCase())) return;
    featureRows.push({label, symbol, group, priority});
  };
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
  featureRows.sort((a, b) => a.priority - b.priority);
  const featureMarkup = item => `<li>${icon(item.symbol)}<span>${escapeHtml(item.label)}</span></li>`;
  const description = String(v.room?.description || '').trim();
  const shortDescription = description.length > 320 ? description.slice(0, 320).trimEnd() + '…' : description;
  const facts = [v.room?.roomType, v.property?.propertyType].filter(Boolean)
    .filter((part, index, parts) => parts.findIndex(other => other.toLowerCase() === part.toLowerCase()) === index);
  if (v.room?.furnished === true) facts.push('Furnished');
  if (v.room?.ensuite === true) facts.push('Private bathroom');
  if (Number(v.room?.maxOccupants) > 1) facts.push(`Up to ${v.room.maxOccupants} occupants`);
  const slides = media.length ? media.map((item, index) =>
    `<div class="detail-gallery-slide quiet-gallery-slide" data-detail-slide="${index}"><img src="${escapeHtml(item.url)}" alt="${escapeHtml(title)} photo ${index + 1}" loading="${index ? 'lazy' : 'eager'}" decoding="async"${index ? '' : ' fetchpriority="high"'}></div>`).join('')
    : '<div class="detail-gallery-slide quiet-gallery-slide"><div class="detail-photo-placeholder" role="img" aria-label="No listing photo available"></div></div>';
  const siblingMarkup = siblings.map(item => {
    const image = item.room?.media?.find(entry => entry?.url)?.url;
    return `<a class="quiet-room" href="#detail-quiet/${encodeURIComponent(item.id)}">${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" decoding="async">` : '<span class="quiet-room-placeholder" aria-hidden="true"></span>'}<span><strong>${escapeHtml(item.room?.name || 'Unit')}</strong><small>${escapeHtml(item.room?.roomType || 'Unit')} · ${escapeHtml(priceFor(item))}</small></span>${icon('chevron')}</a>`;
  }).join('');
  const avatar = v.owner?.avatarUrl ? `<img src="${escapeHtml(v.owner.avatarUrl)}" alt="" loading="lazy">` : `<span aria-hidden="true">${escapeHtml(String(v.owner?.displayName || 'V').charAt(0).toUpperCase())}</span>`;
  const availableDate = v.availableFrom ? new Date(`${String(v.availableFrom).slice(0, 10)}T12:00:00`) : null;
  const date = availableDate && !Number.isNaN(availableDate.getTime())
    ? new Intl.DateTimeFormat(marketForCountry(v.property?.country).locale, {day:'numeric', month:'short', year:'numeric'}).format(availableDate) : '';
  const deposit = Number(v.deposit) > 0 ? displayAmount(v.deposit, v.rentCurrency || marketForCountry(v.property?.country).currency) : null;

  document.querySelector('.listing-lightbox')?.remove();
  layout(`<article class="quiet-detail" data-quiet-id="${escapeHtml(id)}">
    <section class="quiet-gallery" aria-label="Listing photos">
      <div class="quiet-gallery-track" data-quiet-gallery>${slides}</div>
      <div class="quiet-hero-actions"><button type="button" class="quiet-icon-button quiet-back" aria-label="Go back"><svg class="control-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg></button><span><button type="button" class="quiet-icon-button quiet-share" aria-label="Share listing"><svg class="control-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7"/></svg></button><button type="button" class="quiet-icon-button quiet-save" aria-label="${saved.has(id) ? 'Remove from saved' : 'Save listing'}" aria-pressed="${saved.has(id)}">${icon('saved')}</button></span></div>
      ${media.length ? `<button type="button" class="quiet-photo-count" aria-label="Open all ${media.length} photos">1 / ${media.length}</button>` : ''}
    </section>
    <div class="quiet-content">
      <div class="quiet-intro"><h1>${escapeHtml(title)}</h1><p class="quiet-location">${icon('location-pin')}${escapeHtml(location || v.property?.country || 'Location available on map')}</p>${facts.length ? `<p class="quiet-facts">${facts.map(escapeHtml).join(' · ')}</p>` : ''}<p class="quiet-highlights">${date ? `<span>Available ${escapeHtml(date)}</span>` : ''}${deposit ? `<span>Deposit ${escapeHtml(deposit.label)} ${deposit.value.toLocaleString(deposit.locale)}</span>` : ''}</p></div>
      ${description ? `<section class="quiet-section quiet-description"><h2>About this place</h2><p class="quiet-description-preview">${escapeHtml(shortDescription)}</p>${description.length > 320 ? `<details class="quiet-more"><summary><span class="quiet-closed">Show more</span><span class="quiet-open">Show less</span></summary><p>${escapeHtml(description)}</p></details>` : ''}</section>` : ''}
      ${v.property?.householdSummary ? `<section class="quiet-section"><h2>About the property</h2><p class="quiet-paragraph">${escapeHtml(v.property.householdSummary)}</p></section>` : ''}
      ${siblings.length ? `<section class="quiet-section"><h2>Other available units here</h2><div class="quiet-rooms">${siblingMarkup}</div></section>` : ''}
      ${featureRows.length ? `<section class="quiet-section quiet-features"><h2>Amenities & features</h2><ul class="quiet-feature-preview">${featureRows.slice(0, 7).map(featureMarkup).join('')}</ul>${featureRows.length > 7 ? `<details class="quiet-more"><summary><span class="quiet-closed">Show all ${featureRows.length} features</span><span class="quiet-open">Show less</span></summary>${[...new Set(featureRows.map(item => item.group))].map(group => `<h3>${escapeHtml(group)}</h3><ul>${featureRows.filter(item => item.group === group).map(featureMarkup).join('')}</ul>`).join('')}</details>` : ''}</section>` : ''}
      <section class="quiet-section"><h2>Rental details</h2><dl class="quiet-terms"><div><dt>Rent</dt><dd>${escapeHtml(price)}</dd></div>${deposit ? `<div><dt>Deposit</dt><dd>${escapeHtml(deposit.label)} ${deposit.value.toLocaleString(deposit.locale)}</dd></div>` : ''}${date ? `<div><dt>Available from</dt><dd>${escapeHtml(date)}</dd></div>` : ''}${Number(v.minimumStayWeeks) > 0 ? `<div><dt>Minimum stay</dt><dd>${Number(v.minimumStayWeeks)} weeks</dd></div>` : ''}${v.billsIncluded != null ? `<div><dt>Utilities</dt><dd>${v.billsIncluded ? 'Included' : 'Check with lister'}</dd></div>` : ''}</dl></section>
      <section class="quiet-section quiet-location-section"><h2>Location</h2><p>${escapeHtml(location || v.property?.country || 'Approximate location')}</p>${v.property?.landmark ? `<p class="quiet-secondary">Near ${escapeHtml(v.property.landmark)}</p>` : ''}<div id="detailLocationMap" aria-label="Approximate listing location"></div><p class="quiet-secondary">Map pin is approximate to protect the lister’s privacy.</p></section>
      <section class="quiet-section"><h2>Listed by</h2><button type="button" class="quiet-lister"><span class="quiet-avatar">${avatar}</span><span><strong>${escapeHtml(v.owner?.displayName || 'Vacancy member')}</strong>${v.owner?.bio ? `<small>${escapeHtml(v.owner.bio)}</small>` : ''}</span>${icon('chevron')}</button></section>
      <section class="quiet-section quiet-rules"><h2>Rules & safety</h2><p>${v.property?.smokingAllowed ? 'Smoking allowed' : 'No smoking allowed'} · ${v.property?.petsConsidered ? 'Pets considered' : 'Pets not confirmed'}</p><details><summary>Report or block</summary><button type="button" class="quiet-report">Report listing</button><button type="button" class="quiet-block">Block lister</button></details></section>
      <p class="quiet-compare"><a href="#detail/${encodeURIComponent(id)}">View current listing design</a></p>
    </div>
  </article><aside class="quiet-action-bar" aria-label="Listing action"><div><strong>${escapeHtml(price)}</strong>${date ? `<small>Available ${escapeHtml(date)}</small>` : ''}</div><button type="button" class="quiet-message">Message lister</button></aside>`);
  document.querySelector('#app > .page-back')?.remove();
  const page = document.querySelector('.quiet-detail');
  const track = page.querySelector('[data-quiet-gallery]');
  const count = page.querySelector('.quiet-photo-count');
  const currentPhoto = () => Math.min(media.length - 1, Math.max(0, Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
  track.addEventListener('scroll', () => { if (count) count.textContent = `${currentPhoto() + 1} / ${media.length}`; }, {passive: true});
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
    try {
      if (navigator.share) await navigator.share({title, url: window.location.href});
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(window.location.href); toast('Listing link copied'); }
      else prompt('Copy listing link', window.location.href);
    } catch (error) { if (error.name !== 'AbortError') toast('Could not share this listing'); }
  };
  page.querySelector('.quiet-save').onclick = async event => {
    await toggleSave(id);
    if (!page.isConnected) return;
    event.currentTarget.setAttribute('aria-pressed', String(saved.has(id)));
    event.currentTarget.setAttribute('aria-label', saved.has(id) ? 'Remove from saved' : 'Save listing');
  };
  document.querySelector('.quiet-message').onclick = () => nav('enquire', id);
  page.querySelector('.quiet-lister').onclick = () => nav('lister', v.owner?.id);
  page.querySelector('.quiet-report').onclick = async () => {
    if (!currentUser || currentUser.is_anonymous) { nav('auth'); toast('Sign in to report a vacancy'); return; }
    const reason = prompt('What is wrong with this listing?');
    if (!reason) return;
    try { await VACANCY_BACKEND.reportVacancy(id, v.owner.id, reason); toast('Report submitted'); }
    catch (error) { toast(error.message); }
  };
  page.querySelector('.quiet-block').onclick = async () => {
    if (!currentUser || currentUser.is_anonymous) { nav('auth'); toast('Sign in to block a lister'); return; }
    if (v.owner.id === currentUser.id) { toast('This is your listing'); return; }
    if (!confirm('Block this lister and stop further messaging?')) return;
    try { await VACANCY_BACKEND.blockUser(v.owner.id); toast('Lister blocked'); }
    catch (error) { toast(error.message); }
  };
  if (v.property?.publicLatitude != null && v.property?.publicLongitude != null && Number.isFinite(Number(v.property.publicLatitude)) && Number.isFinite(Number(v.property.publicLongitude))) initDetailLocationPreview(v);
  else page.querySelector('#detailLocationMap')?.remove();
  window.scrollTo({top: 0, left: 0, behavior: 'instant'});
}

// Add a comparison link only when the preview URL explicitly opts in.
if (new URLSearchParams(window.location.search).get('experiment') === 'quiet') {
  const renderCurrentDetail = renderDetail;
  renderDetail = function(id) {
    renderCurrentDetail(id);
    if (!vacancies.some(item => item.id === id)) return;
    const link = document.createElement('a');
    link.className = 'quiet-experiment-entry';
    link.href = `#detail-quiet/${encodeURIComponent(id)}`;
    link.textContent = 'Try the quiet listing layout';
    document.querySelector('#app > .site-footer')?.before(link);
  };
}
