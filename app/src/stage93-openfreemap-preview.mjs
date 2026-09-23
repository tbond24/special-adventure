const requestedEngine = new URLSearchParams(location.search).get('map');

if (requestedEngine === 'openfreemap') {
  document.documentElement.dataset.mapEngine = 'openfreemap';
  await loadStylesheet('vendor/maplibre/maplibre-gl.css');
  await loadStylesheet('src/stage93-openfreemap-preview.css?v=93');
  const maplibregl = await import('../vendor/maplibre/maplibre-gl.mjs');
  installOpenFreeMapPreview(maplibregl);
}

function loadStylesheet(href) {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = resolve;
    link.onerror = () => reject(new Error(`Could not load ${href}`));
    document.head.append(link);
  });
}

function installOpenFreeMapPreview(maplibregl) {
  const LIGHT_STYLE = 'https://tiles.openfreemap.org/styles/positron';
  const DARK_STYLE = 'https://tiles.openfreemap.org/styles/dark';
  const LOW_ZOOM_MAX = 8;
  const baseInitExploreMap = initExploreMap;
  const baseShowUserLocationMarker = showUserLocationMarker;
  const baseUpdateMapRadius = updateMapRadius;
  let vectorMap = null;
  let pendingRows = [];
  let mapLoaded = false;
  let mapErrorShown = false;
  let styleGeneration = 0;
  const styleForTheme = () => document.documentElement.dataset.theme === 'dark' ? DARK_STYLE : LIGHT_STYLE;
  let activeStyle = styleForTheme();
  const pointFor = listing => {
    const lat = Number(listing?.property?.publicLatitude);
    const lon = Number(listing?.property?.publicLongitude);
    return Number.isFinite(lat) && Number.isFinite(lon) ? {lat, lon} : null;
  };
  const listingType = listing => {
    const value = `${listing?.property?.propertyType || ''} ${listing?.room?.roomType || ''}`.toLowerCase();
    if (/shop|retail|commercial|store|stall/.test(value)) return 'shop';
    if (/\b1\s*(bed|bedroom|bdrm)\b/.test(value)) return '1bed';
    if (/\b2\s*(bed|bedroom|bdrm)\b/.test(value)) return '2bed';
    if (/room|bedsitter|hostel/.test(value)) return 'room';
    if (/house|maisonette|villa/.test(value)) return 'house';
    if (/apartment|studio|flat/.test(value)) return 'apartment';
    return 'other';
  };
  const categoryIcon = type => ({shop:'shop',room:'house',house:'house',apartment:'building','1bed':'building','2bed':'building',other:'building'}[type] || 'building');

  function createFacade(map) {
    const facade = {
      raw: map,
      engine: 'openfreemap',
      on(type, handler) { map.on(type, handler); return facade; },
      remove() { map.remove(); },
      getZoom() { return map.getZoom(); },
      getCenter() { const center = map.getCenter(); return {lat:center.lat, lng:center.lng}; },
      setView(latLng, zoom) {
        const [lat, lon] = latLng;
        map.jumpTo({center:[Number(lon), Number(lat)], zoom:Number(zoom)});
        return facade;
      },
      fitBounds(bounds, options = {}) {
        const southwest = bounds?._southWest || bounds?.getSouthWest?.();
        const northeast = bounds?._northEast || bounds?.getNorthEast?.();
        if (southwest && northeast) map.fitBounds([[southwest.lng, southwest.lat], [northeast.lng, northeast.lat]], {padding:options.padding || 42, maxZoom:options.maxZoom, duration:0});
        return facade;
      },
      getBounds() {
        const bounds = map.getBounds();
        return {contains(latLng) { return bounds.contains([Number(latLng[1]), Number(latLng[0])]); }};
      },
      project(latLng) {
        const point = map.project([Number(latLng[1]), Number(latLng[0])]);
        return {x:point.x, y:point.y};
      },
      invalidateSize() { map.resize(); return facade; }
    };
    return facade;
  }

  function simplifyBaseStyle() {
    if (!vectorMap?.isStyleLoaded()) return;
    for (const layer of vectorMap.getStyle().layers || []) {
      const id = layer.id.toLowerCase();
      const sourceLayer = String(layer['source-layer'] || '').toLowerCase();
      const descriptor = `${id} ${sourceLayer}`;
      try {
        if (/poi|amenity|transit|airport|railway|ferry|aeroway|housenumber/.test(descriptor)) {
          vectorMap.setLayoutProperty(layer.id, 'visibility', 'none');
          continue;
        }
        if (layer.type === 'symbol' && /road|highway|motorway|street|transportation/.test(descriptor)) {
          if (layer.layout?.['text-field'] !== undefined) {
            vectorMap.setPaintProperty(layer.id, 'text-opacity', ['interpolate',['linear'],['zoom'],11,0,13,0,14,0.78,16,1]);
          }
          if (layer.layout?.['icon-image'] !== undefined) vectorMap.setPaintProperty(layer.id, 'icon-opacity', 0);
        }
      } catch (error) {
        console.debug('Vacancy map style layer skipped', layer.id, error);
      }
    }
  }

  function emptyFeatureCollection() { return {type:'FeatureCollection', features:[]}; }
  function ensureOverlaySources() {
    if (!vectorMap?.isStyleLoaded()) return;
    if (!vectorMap.getSource('vacancy-radius')) {
      vectorMap.addSource('vacancy-radius', {type:'geojson', data:emptyFeatureCollection()});
      vectorMap.addLayer({id:'vacancy-radius-fill',type:'fill',source:'vacancy-radius',paint:{'fill-color':'#f6c945','fill-opacity':0.09}});
      vectorMap.addLayer({id:'vacancy-radius-line',type:'line',source:'vacancy-radius',paint:{'line-color':'#d7a400','line-width':1.2}});
    }
    if (!vectorMap.getSource('vacancy-user-location')) {
      vectorMap.addSource('vacancy-user-location', {type:'geojson', data:emptyFeatureCollection()});
      vectorMap.addLayer({id:'vacancy-user-location-halo',type:'circle',source:'vacancy-user-location',paint:{'circle-radius':9,'circle-color':'#1677ff','circle-stroke-color':'#fff','circle-stroke-width':3}});
    }
  }

  function circleFeature(lat, lon, radius) {
    const earthRadius = 6371008.8;
    const angular = radius / earthRadius;
    const latitude = lat * Math.PI / 180;
    const longitude = lon * Math.PI / 180;
    const coordinates = [];
    for (let index = 0; index <= 64; index += 1) {
      const bearing = index / 64 * Math.PI * 2;
      const nextLat = Math.asin(Math.sin(latitude) * Math.cos(angular) + Math.cos(latitude) * Math.sin(angular) * Math.cos(bearing));
      const nextLon = longitude + Math.atan2(Math.sin(bearing) * Math.sin(angular) * Math.cos(latitude), Math.cos(angular) - Math.sin(latitude) * Math.sin(nextLat));
      coordinates.push([nextLon * 180 / Math.PI, nextLat * 180 / Math.PI]);
    }
    return {type:'Feature', properties:{}, geometry:{type:'Polygon', coordinates:[coordinates]}};
  }

  function setSourceData(id, data) {
    const source = vectorMap?.getSource(id);
    if (source?.setData) source.setData(data);
  }

  updateMapRadius = function() {
    if (!vectorMap || !mapLoaded) return;
    ensureOverlaySources();
    const features = searchCenter ? [circleFeature(Number(searchCenter.lat), Number(searchCenter.lon), radiusKm() * 1000)] : [];
    setSourceData('vacancy-radius', {type:'FeatureCollection', features});
    exploreRadiusCircle = {remove() { setSourceData('vacancy-radius', emptyFeatureCollection()); }};
  };

  showUserLocationMarker = function() {
    if (!vectorMap) return baseShowUserLocationMarker();
    const mapNode = document.querySelector('#exploreMap');
    mapNode?.querySelector('.user-location-status')?.remove();
    if (!mapLoaded) return;
    ensureOverlaySources();
    const features = searchCenter ? [{type:'Feature',properties:{label:searchCenterKind === 'location' ? 'Your location' : 'Search centre'},geometry:{type:'Point',coordinates:[Number(searchCenter.lon),Number(searchCenter.lat)]}}] : [];
    setSourceData('vacancy-user-location', {type:'FeatureCollection', features});
    exploreUserMarker = {remove() { setSourceData('vacancy-user-location', emptyFeatureCollection()); }};
  };

  function clearMarkers() {
    for (const marker of exploreMarkers.values()) marker.remove();
    exploreMarkers.clear();
  }

  function regionalGroups(rows) {
    const groups = new Map();
    const cellSize = vectorMap.getZoom() <= 4 ? 112 : 92;
    rows.forEach(listing => {
      const point = pointFor(listing);
      if (!point) return;
      const projected = vectorMap.project([point.lon, point.lat]);
      const key = `${Math.floor(projected.x / cellSize)}:${Math.floor(projected.y / cellSize)}`;
      const group = groups.get(key) || {rows:[],lat:0,lon:0};
      group.rows.push(listing); group.lat += point.lat; group.lon += point.lon;
      groups.set(key, group);
    });
    return [...groups.values()].map(group => ({...group,lat:group.lat/group.rows.length,lon:group.lon/group.rows.length}));
  }

  function iconMarkup(type) {
    return `<svg class="control-icon" aria-hidden="true"><use href="#icon-${categoryIcon(type)}"></use></svg>`;
  }

  function addListingMarker(listing) {
    const point = pointFor(listing);
    if (!point) return;
    const type = listingType(listing);
    const element = document.createElement('button');
    element.type = 'button';
    element.className = `vector-listing-marker category-${type}`;
    element.dataset.vacancyId = listing.id;
    element.innerHTML = `${iconMarkup(type)}<span>${escapeHtml(markerPrice(listing))}</span>`;
    element.setAttribute('aria-label', `Select ${listing.room.name}, ${markerPrice(listing)}, ${listing.property.suburb}`);
    element.onclick = event => { event.stopPropagation(); selectExplore(listing.id, true); };
    const marker = new maplibregl.Marker({element,anchor:'bottom'}).setLngLat([point.lon, point.lat]).addTo(vectorMap);
    exploreMarkers.set(listing.id, marker);
  }

  function addRegionMarker(group, index) {
    const count = group.rows.length;
    const label = `${count} published Vacancy ${count === 1 ? 'listing' : 'listings'} in this map region`;
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'vector-region-marker';
    element.innerHTML = `<span>${count}</span>`;
    element.setAttribute('aria-label', label);
    element.onclick = event => {
      event.stopPropagation();
      const points = group.rows.map(pointFor).filter(Boolean);
      if (points.length === 1) exploreMap.setView([points[0].lat, points[0].lon], Math.max(11, exploreMap.getZoom() + 2));
      else {
        const bounds = points.reduce((value, point) => value.extend([point.lon, point.lat]), new maplibregl.LngLatBounds());
        vectorMap.fitBounds(bounds, {padding:42,maxZoom:11,duration:0});
      }
    };
    const marker = new maplibregl.Marker({element,anchor:'center'}).setLngLat([group.lon,group.lat]).addTo(vectorMap);
    exploreMarkers.set(`region:${index}`, marker);
  }

  function renderMarkers() {
    if (!vectorMap || !mapLoaded) return;
    clearMarkers();
    if (vectorMap.getZoom() <= LOW_ZOOM_MAX) regionalGroups(pendingRows).forEach(addRegionMarker);
    else pendingRows.forEach(addListingMarker);
    updateMapRadius();
    showUserLocationMarker();
    paintSelection();
  }

  updateExploreMarkers = function(rows) {
    pendingRows = [...rows];
    document.querySelectorAll('.listing-card[data-open-card]').forEach(card => {
      card.dataset.cardId = card.dataset.openCard;
    });
    renderMarkers();
  };

  function paintSelection() {
    document.querySelectorAll('.vector-listing-marker').forEach(element => element.classList.toggle('selected', element.dataset.vacancyId === exploreSelectedId));
  }

  selectExplore = function(id, fromMap = false) {
    exploreSelectedId = id;
    if (fromMap && typeof setMobileMapSheetState === 'function' && innerWidth <= 820) setMobileMapSheetState('browse', {user:true});
    document.querySelectorAll('[data-card-id]').forEach(card => card.classList.toggle('selected', card.dataset.cardId === id));
    paintSelection();
    if (fromMap) {
      const card = document.querySelector(`[data-card-id="${CSS.escape(id)}"]`);
      suppressRailSync = true;
      card?.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});
      setTimeout(() => { suppressRailSync = false; selectExplore(id, false); }, 360);
    }
  };

  function showMapFailure(error) {
    if (mapErrorShown) return;
    mapErrorShown = true;
    console.error('OpenFreeMap preview failed', error);
    const node = document.querySelector('#exploreMap');
    if (!node) return;
    const message = document.createElement('div');
    message.className = 'vector-map-error';
    message.innerHTML = '<strong>Map preview unavailable</strong><span>The live Vacancy map remains unchanged.</span><a href="./#home">Open the current map</a>';
    node.append(message);
  }

  initExploreMap = function() {
    const node = document.querySelector('#exploreMap');
    if (!node) return;
    if (exploreMap) { exploreMap.remove(); exploreMap = null; exploreMarkers.clear(); }
    mapLoaded = false; mapErrorShown = false; pendingRows = [];
    const start = searchCenter ? [Number(searchCenter.lon), Number(searchCenter.lat)] : [Number(market().center[1]), Number(market().center[0])];
    vectorMap = new maplibregl.Map({
      container:node,
      style:activeStyle,
      center:start,
      zoom:searchCenter ? 12 : marketCode === 'US' ? 4 : 11,
      attributionControl:false,
      dragRotate:false,
      pitchWithRotate:false,
      touchPitch:false,
      maxPitch:0,
      renderWorldCopies:false,
      cooperativeGestures:false
    });
    vectorMap.addControl(new maplibregl.AttributionControl({compact:true}), 'bottom-right');
    exploreMap = createFacade(vectorMap);
    vectorMap.on('load', () => {
      mapLoaded = true;
      simplifyBaseStyle();
      ensureOverlaySources();
      renderMarkers();
      document.documentElement.dataset.mapPreviewReady = 'true';
      window.__vacancyStage93.ready = true;
    });
    vectorMap.on('style.load', () => {
      if (!mapLoaded) return;
      simplifyBaseStyle();
      ensureOverlaySources();
      renderMarkers();
    });
    vectorMap.on('error', event => {
      const message = String(event?.error?.message || '');
      if (!mapLoaded && /style|source|fetch|network|webgl/i.test(message)) showMapFailure(event.error);
    });
    vectorMap.on('movestart', () => {
      if (!suppressMapMove) document.querySelector('#searchArea')?.setAttribute('hidden','');
    });
    vectorMap.on('moveend', () => { suppressMapMove = false; });
    setTimeout(() => { if (!mapLoaded) showMapFailure(new Error('The vector map did not finish loading.')); }, 12000);
  };

  let observedTheme = document.documentElement.dataset.theme;
  new MutationObserver(() => {
    const theme = document.documentElement.dataset.theme;
    if (!vectorMap || theme === observedTheme) return;
    observedTheme = theme;
    const generation = ++styleGeneration;
    activeStyle = styleForTheme();
    window.__vacancyStage93.activeStyle = activeStyle;
    vectorMap.setStyle(activeStyle, {diff:false});
    vectorMap.once('style.load', () => { if (generation === styleGeneration) renderMarkers(); });
  }).observe(document.documentElement, {attributes:true,attributeFilter:['data-theme']});

  window.__vacancyStage93 = {
    engine:'openfreemap',
    ready:false,
    liveMapUntouched:true,
    styles:{light:LIGHT_STYLE,dark:DARK_STYLE},
    activeStyle,
    baseInitExploreMap,
    baseShowUserLocationMarker,
    baseUpdateMapRadius,
    rawMap:() => vectorMap
  };

  queueMicrotask(() => {
    const leafletAlreadyRendered = document.querySelector('#exploreMap.leaflet-container');
    if (leafletAlreadyRendered && typeof booting !== 'undefined' && booting === false && parseHash().name === 'home') renderHome();
  });
}
