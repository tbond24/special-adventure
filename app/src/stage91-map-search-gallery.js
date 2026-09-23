(() => {
  const LOW_ZOOM_MAX = 8;
  const baseUpdateExploreMarkers = updateExploreMarkers;
  const baseCardMedia = cardMedia;
  const baseBindCards = bindCards;
  const baseRenderSaved = renderSaved;
  const baseRenderMessages = renderMessages;
  const baseRenderDetail = renderDetail;
  const baseLayout = layout;

  layout = function(content) {
    const result = baseLayout(content);
    document.querySelector('#app')?.classList.remove('account-collection-page');
    return result;
  };

  function validPoint(v) {
    const lat = Number(v?.property?.publicLatitude);
    const lon = Number(v?.property?.publicLongitude);
    return Number.isFinite(lat) && Number.isFinite(lon) ? {lat, lon} : null;
  }

  function regionalGroups(rows) {
    const zoom = exploreMap.getZoom();
    const cellSize = zoom <= 4 ? 112 : 92;
    const groups = new Map();
    rows.forEach(v => {
      const point = validPoint(v);
      if (!point) return;
      const projected = exploreMap.project([point.lat, point.lon], zoom);
      const key = `${Math.floor(projected.x / cellSize)}:${Math.floor(projected.y / cellSize)}`;
      const group = groups.get(key) || {rows: [], lat: 0, lon: 0};
      group.rows.push(v);
      group.lat += point.lat;
      group.lon += point.lon;
      groups.set(key, group);
    });
    return [...groups.values()].map(group => ({
      ...group,
      lat: group.lat / group.rows.length,
      lon: group.lon / group.rows.length
    }));
  }

  function regionalIcon(count) {
    const label = `${count} ${count === 1 ? 'listing' : 'listings'}`;
    return L.divIcon({
      className: 'vacancy-region-marker',
      html: `<span class="map-region-count" aria-hidden="true">${count}</span>`,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      tooltipAnchor: [0, -24]
    });
  }

  updateExploreMarkers = function(rows) {
    if (!exploreMap || exploreMap.getZoom() > LOW_ZOOM_MAX) return baseUpdateExploreMarkers(rows);
    for (const marker of exploreMarkers.values()) marker.remove();
    exploreMarkers.clear();
    regionalGroups(rows).forEach((group, index) => {
      const count = group.rows.length;
      const label = `${count} published Vacancy ${count === 1 ? 'listing' : 'listings'} in this map region`;
      const marker = L.marker([group.lat, group.lon], {
        icon: regionalIcon(count),
        keyboard: true,
        title: label,
        riseOnHover: true
      }).addTo(exploreMap);
      marker.bindTooltip(label, {direction: 'top', className: 'vacancy-map-tooltip', opacity: 1});
      const openRegion = () => {
        const points = group.rows.map(validPoint).filter(Boolean).map(point => [point.lat, point.lon]);
        if (points.length === 1) exploreMap.setView(points[0], Math.max(11, exploreMap.getZoom() + 2), {animate: false});
        else exploreMap.fitBounds(L.latLngBounds(points), {padding: [42, 42], maxZoom: 11, animate: false});
      };
      marker.on('click', openRegion);
      const element = marker.getElement();
      if (element) {
        element.setAttribute('role', 'button');
        element.setAttribute('aria-label', label);
        element.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openRegion();
          }
        });
      }
      exploreMarkers.set(`region:${index}`, marker);
    });
    updateMapRadius();
  };

  cardMedia = function(v) {
    const markup = baseCardMedia(v);
    const count = (v.room?.media || []).filter(item => item?.url).length;
    if (count < 2) return markup;
    const controls = `<button class="gallery-arrow gallery-arrow-prev" type="button" data-gallery-step="-1" aria-label="Previous listing image"><svg class="control-icon" aria-hidden="true"><use href="#icon-chevron"></use></svg></button><button class="gallery-arrow gallery-arrow-next" type="button" data-gallery-step="1" aria-label="Next listing image"><svg class="control-icon" aria-hidden="true"><use href="#icon-chevron"></use></svg></button>`;
    return markup.replace('</div><div class="gallery-counter"', `</div>${controls}<div class="gallery-counter"`);
  };

  function bindGalleryArrows() {
    document.querySelectorAll('.listing-visual').forEach(visual => {
      const gallery = visual.querySelector('[data-gallery]');
      const arrows = [...visual.querySelectorAll('[data-gallery-step]')];
      if (!gallery || !arrows.length || visual.dataset.stage91Gallery) return;
      visual.dataset.stage91Gallery = 'true';
      const currentIndex = () => Math.max(0, Math.min(gallery.children.length - 1, Math.round(gallery.scrollLeft / Math.max(1, gallery.clientWidth))));
      const sync = () => {
        const index = currentIndex();
        arrows.forEach(button => {
          const next = index + Number(button.dataset.galleryStep);
          button.disabled = next < 0 || next >= gallery.children.length;
        });
      };
      arrows.forEach(button => button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const next = Math.max(0, Math.min(gallery.children.length - 1, currentIndex() + Number(button.dataset.galleryStep)));
        gallery.scrollTo({left: next * gallery.clientWidth, behavior: 'smooth'});
      }));
      gallery.addEventListener('scroll', sync, {passive: true});
      sync();
    });
  }

  bindCards = function() {
    baseBindCards();
    bindGalleryArrows();
  };

  function anchorCollectionFooter() {
    document.querySelector('#app')?.classList.add('account-collection-page');
  }

  renderSaved = function() {
    const result = baseRenderSaved();
    if (parseHash().name === 'saved') anchorCollectionFooter();
    return result;
  };

  renderMessages = async function() {
    const result = await baseRenderMessages();
    if (parseHash().name === 'messages') anchorCollectionFooter();
    return result;
  };

  function bindDetailGalleryArrows() {
    const gallery = document.querySelector('.detail-gallery');
    const track = gallery?.querySelector('[data-detail-gallery]');
    const slides = track ? [...track.querySelectorAll('.detail-gallery-slide')] : [];
    if (!gallery || slides.length < 2 || gallery.dataset.stage92Arrows) return;
    gallery.dataset.stage92Arrows = 'true';
    const controls = document.createElement('div');
    controls.className = 'detail-gallery-controls';
    controls.innerHTML = `<button class="gallery-arrow gallery-arrow-prev detail-gallery-arrow" type="button" data-detail-gallery-step="-1" aria-label="Previous listing photo"><svg class="control-icon" aria-hidden="true"><use href="#icon-chevron"></use></svg></button><button class="gallery-arrow gallery-arrow-next detail-gallery-arrow" type="button" data-detail-gallery-step="1" aria-label="Next listing photo"><svg class="control-icon" aria-hidden="true"><use href="#icon-chevron"></use></svg></button>`;
    gallery.append(controls);
    const buttons = [...controls.querySelectorAll('[data-detail-gallery-step]')];
    const currentIndex = () => Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
    const sync = () => {
      const index = currentIndex();
      buttons.forEach(button => { button.disabled = index + Number(button.dataset.detailGalleryStep) < 0 || index + Number(button.dataset.detailGalleryStep) >= slides.length; });
    };
    const position = () => buttons.forEach(button => { button.style.top = `${track.offsetTop + track.clientHeight / 2}px`; });
    buttons.forEach(button => button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const next = Math.max(0, Math.min(slides.length - 1, currentIndex() + Number(button.dataset.detailGalleryStep)));
      track.scrollTo({left: next * track.clientWidth, behavior: 'smooth'});
    }));
    track.addEventListener('scroll', sync, {passive: true});
    if (typeof ResizeObserver === 'function') new ResizeObserver(position).observe(track);
    position();
    sync();
  }

  renderDetail = function(id) {
    const result = baseRenderDetail(id);
    bindDetailGalleryArrows();
    return result;
  };

  window.__vacancyStage91 = {LOW_ZOOM_MAX, regionalGroups, bindDetailGalleryArrows};
})();
