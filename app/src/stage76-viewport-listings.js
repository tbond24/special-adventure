(() => {
  let viewportFilteringReady = false;
  let viewportCategory = 'all';
  let viewportTimer = null;

  function listingType(v) {
    const value = `${v?.property?.propertyType || ''} ${v?.room?.roomType || ''}`.toLowerCase();
    if (/shop|retail|commercial|store|stall/.test(value)) return 'shop';
    if (/\b1\s*(bed|bedroom|bdrm)\b/.test(value)) return '1bed';
    if (/\b2\s*(bed|bedroom|bdrm)\b/.test(value)) return '2bed';
    if (/room|bedsitter|hostel/.test(value)) return 'room';
    if (/house|maisonette|villa/.test(value)) return 'house';
    if (/apartment|studio|flat/.test(value)) return 'apartment';
    return 'other';
  }

  function matchesViewport(v) {
    if (!viewportFilteringReady || !exploreMap) return true;
    const lat = Number(v.property?.publicLatitude);
    const lon = Number(v.property?.publicLongitude);
    return Number.isFinite(lat) && Number.isFinite(lon) && exploreMap.getBounds().contains([lat, lon]);
  }

  function matchingRows() {
    const q = document.querySelector('#q')?.value.trim().toLowerCase() || '';
    const textQuery = q && q !== mapSearchQuery ? q : '';
    const max = Number(document.querySelector('#maxRent')?.value || Infinity);
    const rentPeriod = document.querySelector('#rentPeriod')?.value || market().rentPeriod;
    const moveInput = document.querySelector('#moveBy');
    const moveBy = moveInput?.dataset.touched ? moveInput.value : '';
    const stayValue = Number(document.querySelector('#stayWeeks')?.value || Infinity);
    const stayPeriod = document.querySelector('#stayPeriod')?.value || 'week';
    const stay = stayValue * ({week: 1, month: 4.345, year: 52.14}[stayPeriod] || 1);
    const checked = id => Boolean(document.querySelector(`#${id}`)?.checked);
    return vacancies.filter(v => {
      const type = listingType(v);
      const rent = (v.rentAmount ?? v.monthlyRent) * ({week: 1, month: 4.345, year: 52.14}[rentPeriod] || 4.345) / ({week: 1, month: 4.345, year: 52.14}[v.rentPeriod || market().rentPeriod] || 4.345);
      return matchesViewport(v)
        && (viewportCategory === 'all' || type === viewportCategory)
        && (!textQuery || `${v.property.suburb} ${v.property.city} ${v.property.state} ${v.property.landmark} ${v.property.postcode || ''}`.toLowerCase().includes(textQuery))
        && (v.rentCurrency !== market().currency || rent <= max)
        && (!moveBy || v.availableFrom <= moveBy)
        && (!Number.isFinite(stay) || !v.minimumStayWeeks || v.minimumStayWeeks <= stay)
        && (!checked('furnished') || v.room.furnished)
        && (!checked('ensuite') || v.room.ensuite)
        && (!checked('parking') || v.property.parkingSpaces > 0)
        && (!checked('water') || v.property.waterAvailable)
        && (!checked('security') || v.property.securityAvailable)
        && (!checked('internet') || v.property.internetAvailable)
        && (!checked('twoOccupants') || (v.room.maxOccupants || 1) >= 2)
        && (!checked('pets') || v.property.petsConsidered);
    });
  }

  applySearch = function() {
    if (!document.querySelector('#cards')) return;
    const rows = matchingRows();
    const cards = document.querySelector('#cards');
    const count = document.querySelector('#resultCount');
    if (count) count.innerHTML = `<strong>${rows.length}</strong> ${rows.length === 1 ? 'vacancy' : 'vacancies'} in this map area`;
    window.__vacancyViewportFiltering = viewportFilteringReady;
    if (rows.length) {
      cards.innerHTML = rows.map(v => card(v).replace('<article class="card listing-card"', `<article class="card listing-card explore-card" data-card-id="${v.id}"`)).join('');
      updateExploreMarkers(rows);
      if (!rows.some(v => v.id === exploreSelectedId)) exploreSelectedId = rows[0].id;
      selectExplore(exploreSelectedId, false);
    } else {
      cards.innerHTML = '<div class="empty wide">No current vacancies are visible in this map area.<br><span>Move or zoom out on the map to see more.</span></div>';
      updateExploreMarkers([]);
      exploreSelectedId = null;
    }
    bindCards();
    applyDiscoveryView();
  };

  function installTypeFilter(shell) {
    document.querySelector('#discoveryFilters .category-filter')?.remove();
    document.querySelector('#discoveryFilters .radius-panel')?.remove();
    if (typeof activeVacancyCategory !== 'undefined') activeVacancyCategory = 'all';
    const control = document.createElement('div');
    control.className = 'map-type-filter';
    control.innerHTML = `<button class="map-type-current" type="button" aria-expanded="false" aria-controls="mapTypeChoices"><svg class="control-icon" aria-hidden="true"><use href="#icon-building"></use></svg><span>All types</span></button>
      <div id="mapTypeChoices" class="map-type-choices" hidden>
        ${[
          ['all', 'building', 'All'], ['shop', 'shop', 'Shops'], ['room', 'house', 'Rooms'],
          ['1bed', 'building', '1 bedroom'], ['2bed', 'building', '2 bedroom'],
          ['house', 'house', 'Houses'], ['apartment', 'building', 'Apartments']
        ].map(([value, icon, label]) => `<button type="button" data-map-type="${value}"><svg class="control-icon" aria-hidden="true"><use href="#icon-${icon}"></use></svg><span>${label}</span></button>`).join('')}
      </div>`;
    shell.append(control);
    const current = control.querySelector('.map-type-current');
    const choices = control.querySelector('.map-type-choices');
    current.onclick = () => {
      choices.hidden = !choices.hidden;
      current.setAttribute('aria-expanded', String(!choices.hidden));
    };
    choices.onclick = event => {
      const button = event.target.closest('[data-map-type]');
      if (!button) return;
      viewportCategory = button.dataset.mapType;
      current.innerHTML = button.innerHTML;
      current.querySelector('span').textContent = button.textContent.trim() === 'All' ? 'All types' : button.textContent.trim();
      choices.querySelectorAll('button').forEach(item => item.classList.toggle('active', item === button));
      choices.hidden = true;
      current.setAttribute('aria-expanded', 'false');
      applySearch();
    };
  }

  function installExpandableSearch(shell) {
    const panel = shell.querySelector('.map-search-panel');
    const input = panel?.querySelector('#q');
    const button = panel?.querySelector('#searchBtn');
    if (!panel || !input || !button) return;
    button.classList.remove('search-inside-action');
    panel.append(button);
    panel.classList.add('map-search-compact');
    button.setAttribute('aria-label', 'Open map search');
    button.onclick = () => {
      if (!panel.classList.contains('search-expanded')) {
        panel.classList.add('search-expanded');
        button.setAttribute('aria-label', 'Search this location');
        requestAnimationFrame(() => input.focus());
        return;
      }
      if (input.value.trim()) searchMapLocation();
      else {
        panel.classList.remove('search-expanded');
        button.setAttribute('aria-label', 'Open map search');
      }
    };
    document.addEventListener('pointerdown', event => {
      if (!panel.contains(event.target) && input.value.trim() === '') {
        panel.classList.remove('search-expanded');
        button.setAttribute('aria-label', 'Open map search');
      }
    });
  }

  function installViewportFiltering() {
    if (!exploreMap) return;
    document.querySelector('#searchArea')?.remove();
    viewportFilteringReady = true;
    exploreMap.on('moveend', () => {
      clearTimeout(viewportTimer);
      viewportTimer = setTimeout(applySearch, 120);
    });
    applySearch();
  }

  const renderHomeBefore76 = renderHome;
  renderHome = function() {
    viewportFilteringReady = false;
    window.__vacancyViewportFiltering = false;
    renderHomeBefore76();
    const shell = document.querySelector('.map-first-shell');
    if (!shell) return;
    installTypeFilter(shell);
    installExpandableSearch(shell);
    installViewportFiltering();
  };

  const renderDetailBefore76 = renderDetail;
  renderDetail = function(id) {
    renderDetailBefore76(id);
    const mapCard = document.querySelector('.detail-map-card');
    if (mapCard) {
      mapCard.querySelector(':scope > span')?.remove();
      const info = document.createElement('button');
      info.type = 'button';
      info.className = 'detail-location-info';
      info.setAttribute('aria-label', 'About this map location');
      info.innerHTML = '<svg class="control-icon" aria-hidden="true"><use href="#icon-info"></use></svg>';
      info.onclick = () => toast('The map shows an approximate location to protect the lister’s privacy.');
      mapCard.append(info);
    }
    const report = document.querySelector('#listingSafetyToggle');
    const sections = document.querySelector('.listing-detail-sections');
    if (report && sections) {
      report.className = 'detail-report-row';
      report.innerHTML = '<svg class="control-icon" aria-hidden="true"><use href="#icon-flag"></use></svg><span>Report listing</span>';
      report.setAttribute('aria-label', 'Report listing');
      sections.insertAdjacentElement('afterend', report);
    }
  };
})();
