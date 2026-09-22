(() => {
  const CURRENCY_MODE_KEY = 'vacancy-currency-mode-v1';
  let suggestionRequest = null;
  let suggestionTimer = null;
  function selectSuggestion(place, input, list) {
    input.value = place.label;
    mapSearchQuery = place.label.toLowerCase();
    searchCenter = {lat: Number(place.lat), lon: Number(place.lon)};
    searchCenterKind = 'search';
    list.hidden = true;
    if (exploreMap) {
      suppressMapMove = true;
      exploreMap.setView([searchCenter.lat, searchCenter.lon], 13, {animate: false});
    }
    syncRadiusUI();
    applySearch();
    input.focus();
  }
  function installLocationSuggestions(panel, input) {
    const list = document.createElement('div');
    list.id = 'mapLocationSuggestions';
    list.className = 'map-location-suggestions';
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    panel.append(list);
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', list.id);
    let active = -1;
    const paintActive = () => list.querySelectorAll('[role="option"]').forEach((item, index) => {
      item.classList.toggle('active', index === active);
      item.setAttribute('aria-selected', String(index === active));
    });
    const load = async () => {
      const query = input.value.trim();
      if (query.length < 2) { list.hidden = true; return; }
      suggestionRequest?.abort();
      suggestionRequest = new AbortController();
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}&suggest=1`, {signal: suggestionRequest.signal});
        const data = await response.json();
        if (!response.ok || input.value.trim() !== query) return;
        const rows = Array.isArray(data.suggestions) ? data.suggestions.slice(0, 5) : [];
        list.innerHTML = rows.map((place, index) => `<button type="button" role="option" aria-selected="false" data-suggestion="${index}"><span>${escapeHtml(place.label)}</span></button>`).join('') + (rows.length ? '<small>Search by OpenStreetMap</small>' : '');
        list._places = rows;
        active = -1;
        list.hidden = rows.length === 0;
      } catch (error) {
        if (error.name !== 'AbortError') list.hidden = true;
      }
    };
    input.addEventListener('input', () => {
      list.hidden = true;
      clearTimeout(suggestionTimer);
      suggestionTimer = setTimeout(load, 400);
    });
    input.addEventListener('keydown', event => {
      const options = [...list.querySelectorAll('[role="option"]')];
      if (list.hidden || !options.length) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        active = event.key === 'ArrowDown' ? (active + 1) % options.length : (active - 1 + options.length) % options.length;
        paintActive();
      } else if (event.key === 'Enter' && active >= 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
        selectSuggestion(list._places[active], input, list);
      } else if (event.key === 'Escape') list.hidden = true;
    }, true);
    list.addEventListener('pointerdown', event => event.preventDefault());
    list.addEventListener('click', event => {
      const option = event.target.closest('[data-suggestion]');
      if (option) selectSuggestion(list._places[Number(option.dataset.suggestion)], input, list);
    });
    return list;
  }
  function makeFilterSwitches(filters) {
    filters.querySelectorAll('.filter-check').forEach(label => {
      const input = label.querySelector('input[type="checkbox"]');
      if (!input || label.classList.contains('filter-switch')) return;
      const text = [...label.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join(' ').trim();
      [...label.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).forEach(node => node.remove());
      const name = document.createElement('span');
      name.className = 'filter-switch-label';
      name.textContent = text;
      const track = document.createElement('span');
      track.className = 'filter-toggle-track';
      track.setAttribute('aria-hidden', 'true');
      label.classList.add('filter-switch');
      label.prepend(name);
      input.after(track);
    });
  }
  function installCurrencyControl(filters) {
    if (!filters) return;
    let select = document.querySelector('#marketSelect');
    if (!select) {
      select = document.createElement('select');
      select.id = 'marketSelect';
      select.setAttribute('aria-label', 'Display currency');
    }
    const existingPreference = localStorage.getItem(CURRENCY_PREF_KEY);
    if (!localStorage.getItem(CURRENCY_MODE_KEY)) localStorage.setItem(CURRENCY_MODE_KEY, existingPreference ? 'manual' : 'auto');
    const mode = localStorage.getItem(CURRENCY_MODE_KEY);
    const row = document.createElement('label');
    row.className = 'gear-currency-row';
    row.innerHTML = '<span>Currency</span>';
    select.classList.remove('market-switch');
    select.classList.add('gear-currency-select');
    const currencies = [...new Map(Object.values(MARKETS).map(item => [item.currency, item])).values()];
    select.innerHTML = `<option value="auto">Auto · ${escapeHtml(displayCurrency)}</option>${currencies.map(item => `<option value="${item.currency}">${item.currency}</option>`).join('')}`;
    select.value = mode === 'manual' ? displayCurrency : 'auto';
    select.onchange = async () => {
      if (select.value === 'auto') {
        localStorage.setItem(CURRENCY_MODE_KEY, 'auto');
        await setDisplayCurrency(market().currency);
      } else {
        localStorage.setItem(CURRENCY_MODE_KEY, 'manual');
        await setDisplayCurrency(select.value);
      }
    };
    row.append(select);
    filters.prepend(row);
  }
  async function syncCurrencyForLocation(lat, lon) {
    if ((localStorage.getItem(CURRENCY_MODE_KEY) || 'auto') === 'manual') return;
    try {
      const response = await fetch(`/api/reverse-geocode?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`);
      const data = await response.json();
      if (!response.ok) return;
      const next = marketForCountry(data.countryCode || data.country).currency;
      localStorage.setItem(CURRENCY_MODE_KEY, 'auto');
      if (next !== displayCurrency) await setDisplayCurrency(next);
    } catch {}
  }
  const useMyLocationBefore88 = useMyLocation;
  useMyLocation = function() {
    const prior = searchCenter;
    useMyLocationBefore88();
    const started = Date.now();
    const watch = setInterval(() => {
      if (searchCenterKind === 'location' && searchCenter && searchCenter !== prior) {
        clearInterval(watch);
        syncCurrencyForLocation(searchCenter.lat, searchCenter.lon);
      } else if (Date.now() - started > 10000) clearInterval(watch);
    }, 120);
  };
  const renderHomeBefore88 = renderHome;
  renderHome = function() {
    renderHomeBefore88();
    const panel = document.querySelector('.map-search-panel');
    const input = panel?.querySelector('#q');
    const button = panel?.querySelector('#searchBtn');
    if (panel && input && button) {
      button.type = 'button';
      const suggestions = installLocationSuggestions(panel, input);
      const activateSearch = button.onclick;
      button.onclick = event => {
        const shouldSubmit = panel.classList.contains('search-expanded') && Boolean(input.value.trim());
        if (!shouldSubmit) return activateSearch.call(button, event);
        suggestions.hidden = true;
        return searchMapLocation();
      };
    }
    const filters = document.querySelector('#discoveryFilters');
    if (filters) {
      makeFilterSwitches(filters);
      installCurrencyControl(filters);
    }
  };
  const renderDetailBefore88 = renderDetail;
  renderDetail = function(id) {
    renderDetailBefore88(id);
    const summary = document.querySelector('.detail-summary');
    const panel = summary?.querySelector(':scope > .panel');
    const mapCard = document.querySelector('.detail-map-card');
    const sections = document.querySelector('.listing-detail-sections');
    if (!summary || !panel || !mapCard || !sections) return;
    const stripContactCopy = () => panel.querySelectorAll('.contact-route-note').forEach(node => node.remove());
    stripContactCopy();
    const contactObserver = new MutationObserver(stripContactCopy);
    contactObserver.observe(panel, {childList: true, subtree: true});
    setTimeout(() => contactObserver.disconnect(), 5000);
    const info = mapCard.querySelector('.detail-location-info');
    const locationSection = document.createElement('section');
    locationSection.id = 'listingLocationSection';
    locationSection.className = 'detail-location-section';
    locationSection.innerHTML = '<div class="detail-location-heading"><h2>Location</h2></div>';
    if (info) locationSection.querySelector('.detail-location-heading').append(info);
    locationSection.append(mapCard);
    sections.insertAdjacentElement('afterend', locationSection);
    const location = panel.querySelector(':scope > .muted');
    if (location) {
      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'detail-location-link';
      link.innerHTML = `<svg class="service-icon" aria-hidden="true"><use href="#icon-location-pin"></use></svg><span>${escapeHtml(location.textContent.trim())}</span>`;
      link.onclick = () => locationSection.scrollIntoView({behavior: 'smooth', block: 'start'});
      location.replaceWith(link);
    }
    setTimeout(() => window.dispatchEvent(new Event('resize')), 0);
  };
})();
