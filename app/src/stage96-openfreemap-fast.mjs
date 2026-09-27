const VACANCY_MAP_LAYERS = new Set([
  'background','park','water','landuse_residential','landcover_wood','waterway','building',
  'highway_minor','highway_major_casing','highway_major_inner','highway_motorway_casing','highway_motorway_inner',
  'boundary_3','boundary_2','water_name_point_label',
  'label_town','label_state','label_city','label_city_capital','label_country_3','label_country_2','label_country_1'
]);

const requestedEngine = new URLSearchParams(location.search).get('map');

if (requestedEngine === 'openfreemap-fast') {
  document.documentElement.dataset.mapEngine = 'openfreemap-fast';
  const preferredStyle = document.documentElement.dataset.theme === 'dark'
    ? 'vendor/openfreemap/dark.json'
    : 'vendor/openfreemap/positron.json';
  const [, , maplibregl, initialStyle] = await Promise.all([
    loadStylesheet('vendor/maplibre/maplibre-gl.css'),
    loadStylesheet('src/stage93-openfreemap-preview.css?v=94'),
    import('../vendor/maplibre/maplibre-gl.mjs'),
    prepareOpenFreeMapStyle(preferredStyle)
  ]);
  maplibregl.setWorkerCount(1);
  installOpenFreeMapPreview(maplibregl, new Map([[preferredStyle, initialStyle]]));
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



async function prepareOpenFreeMapStyle(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Style request failed with ${response.status}`);
    const style = await response.json();
    style.name = `Vacancy ${style.name || 'OpenFreeMap'}`;
    style.layers = (style.layers || []).filter(layer => VACANCY_MAP_LAYERS.has(layer.id));
    style.layers.forEach(layer => {
      if (layer.type !== 'symbol') return;
      layer.layout = {...(layer.layout || {})};
      layer.paint = {...(layer.paint || {})};
      Object.keys(layer.layout).filter(key => key.startsWith('icon-')).forEach(key => delete layer.layout[key]);
      Object.keys(layer.paint).filter(key => key.startsWith('icon-')).forEach(key => delete layer.paint[key]);
      if (/highway-name/.test(layer.id)) layer.minzoom = Math.max(14, Number(layer.minzoom || 0));
    });
    const usedSources = new Set(style.layers.map(layer => layer.source).filter(Boolean));
    style.sources = Object.fromEntries(Object.entries(style.sources || {}).filter(([id]) => usedSources.has(id)));
    delete style.sprite;
    return style;
  } catch (error) {
    console.warn('Vacancy compact map style unavailable; using provider style.', error);
    return url;
  }
}

function clonePreparedStyle(style) {
  return typeof style === 'string' ? style : structuredClone(style);
}

function installOpenFreeMapPreview(maplibregl, styleCache = new Map()) {
  const LIGHT_STYLE = 'vendor/openfreemap/positron.json';
  const DARK_STYLE = 'vendor/openfreemap/dark.json';
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
  const preparedStyle = async url => {
    if (!styleCache.has(url)) styleCache.set(url, prepareOpenFreeMapStyle(url));
    const style = await styleCache.get(url);
    styleCache.set(url, style);
    return clonePreparedStyle(style);
  };
  const initialStyle = () => clonePreparedStyle(styleCache.get(activeStyle) || activeStyle);
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
      engine: 'openfreemap-fast',
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
    setSourceData('vacancy-radius', emptyFeatureCollection());
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

  let listingInteractionsReady = false;
  let paintedSelectionId = null;

  function clearMarkers() {
    setSourceData('vacancy-listings', emptyFeatureCollection());
    exploreMarkers.clear();
  }

  function listingFeatures(rows) {
    return {
      type:'FeatureCollection',
      features:rows.map(listing => {
        const point = pointFor(listing);
        if (!point) return null;
        const type = listingType(listing);
        return {
          type:'Feature',
          id:String(listing.id),
          properties:{
            id:String(listing.id),
            type,
            price:markerPrice(listing),
            label:`${listing?.room?.name || 'Vacancy'}, ${markerPrice(listing)}, ${listing?.property?.suburb || ''}`
          },
          geometry:{type:'Point',coordinates:[point.lon,point.lat]}
        };
      }).filter(Boolean)
    };
  }

  function ensureListingLayers() {
    if (!vectorMap?.isStyleLoaded() || vectorMap.getSource('vacancy-listings')) return;
    vectorMap.addSource('vacancy-listings', {
      type:'geojson',
      data:emptyFeatureCollection(),
      cluster:true,
      clusterMaxZoom:LOW_ZOOM_MAX,
      clusterRadius:52,
      promoteId:'id'
    });
    vectorMap.addLayer({
      id:'vacancy-clusters',type:'circle',source:'vacancy-listings',filter:['has','point_count'],
      paint:{'circle-color':'#f05a3c','circle-radius':['step',['get','point_count'],18,10,22,40,27],'circle-stroke-color':'#fff','circle-stroke-width':2}
    });
    vectorMap.addLayer({
      id:'vacancy-cluster-count',type:'symbol',source:'vacancy-listings',filter:['has','point_count'],
      layout:{'text-field':['get','point_count_abbreviated'],'text-size':12,'text-font':['Noto Sans Regular']},
      paint:{'text-color':'#fff','text-halo-color':'rgba(0,0,0,0.14)','text-halo-width':1}
    });
    vectorMap.addLayer({
      id:'vacancy-listing-points',type:'circle',source:'vacancy-listings',filter:['!',['has','point_count']],
      paint:{
        'circle-color':['match',['get','type'],'shop','#7c3aed','room','#0f8a74','house','#e05a33','apartment','#2563eb','1bed','#2563eb','2bed','#1d4ed8','#64748b'],
        'circle-radius':['case',['boolean',['feature-state','selected'],false],11,9],
        'circle-stroke-color':'#fff','circle-stroke-width':['case',['boolean',['feature-state','selected'],false],4,2]
      }
    });
    vectorMap.addLayer({
      id:'vacancy-listing-price',type:'symbol',source:'vacancy-listings',filter:['!',['has','point_count']],minzoom:9,
      layout:{'text-field':['get','price'],'text-size':11,'text-offset':[0,1.55],'text-anchor':'top','text-font':['Noto Sans Regular'],'text-allow-overlap':false},
      paint:{'text-color':document.documentElement.dataset.theme === 'dark' ? '#fff' : '#172033','text-halo-color':document.documentElement.dataset.theme === 'dark' ? '#16212c' : '#fff','text-halo-width':2}
    });
    if (listingInteractionsReady) return;
    listingInteractionsReady = true;
    const listingClick = event => {
      const id = String(event.features?.[0]?.properties?.id || '');
      if (id) selectExplore(id, true);
    };
    vectorMap.on('click','vacancy-listing-points',listingClick);
    vectorMap.on('click','vacancy-listing-price',listingClick);
    vectorMap.on('click','vacancy-clusters',async event => {
      const feature = event.features?.[0];
      const source = vectorMap.getSource('vacancy-listings');
      if (!feature || !source) return;
      const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id);
      vectorMap.easeTo({center:feature.geometry.coordinates,zoom,duration:220});
    });
    ['vacancy-listing-points','vacancy-listing-price','vacancy-clusters'].forEach(id => {
      vectorMap.on('mouseenter',id,()=>{vectorMap.getCanvas().style.cursor='pointer';});
      vectorMap.on('mouseleave',id,()=>{vectorMap.getCanvas().style.cursor='';});
    });
  }

  function renderMarkers() {
    if (!vectorMap || !mapLoaded) return;
    ensureListingLayers();
    setSourceData('vacancy-listings', listingFeatures(pendingRows));
    paintedSelectionId = null;
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
    if (!vectorMap?.getSource('vacancy-listings')) return;
    if (paintedSelectionId && paintedSelectionId !== String(exploreSelectedId || '')) {
      try { vectorMap.setFeatureState({source:'vacancy-listings',id:paintedSelectionId},{selected:false}); } catch {}
    }
    paintedSelectionId = exploreSelectedId ? String(exploreSelectedId) : null;
    if (paintedSelectionId) {
      try { vectorMap.setFeatureState({source:'vacancy-listings',id:paintedSelectionId},{selected:true}); } catch {}
    }
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
    window.__vacancyStage96.ready = false;
    const start = searchCenter ? [Number(searchCenter.lon), Number(searchCenter.lat)] : [Number(market().center[1]), Number(market().center[0])];
    vectorMap = new maplibregl.Map({
      container:node,
      style:initialStyle(),
      center:start,
      zoom:searchCenter ? 12 : marketCode === 'US' ? 4 : 11,
      attributionControl:false,
      dragRotate:false,
      pitchWithRotate:false,
      touchPitch:false,
      maxPitch:0,
      renderWorldCopies:false,
      cooperativeGestures:false,
      crossSourceCollisions:false,
      fadeDuration:0,
      refreshExpiredTiles:false,
      pixelRatio:Math.min(window.devicePixelRatio || 1, 1.5)
    });
    vectorMap.addControl(new maplibregl.AttributionControl({compact:true}), 'bottom-right');
    vectorMap.once('idle', () => node.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'));
    exploreMap = createFacade(vectorMap);
    vectorMap.on('load', () => {
      mapLoaded = true;
      simplifyBaseStyle();
      ensureOverlaySources();
      renderMarkers();
      vectorMap.once('idle', renderMarkers);
      document.documentElement.dataset.mapPreviewReady = 'true';
      window.__vacancyStage96.ready = true;
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

  function applyFastTheme(theme) {
    if (!vectorMap?.isStyleLoaded()) return;
    const dark = theme === 'dark';
    for (const layer of vectorMap.getStyle().layers || []) {
      const id = layer.id.toLowerCase();
      try {
        if (layer.type === 'background') vectorMap.setPaintProperty(layer.id,'background-color',dark ? '#101923' : '#eef1ec');
        else if (layer.type === 'fill' && /water/.test(id)) vectorMap.setPaintProperty(layer.id,'fill-color',dark ? '#152d3d' : '#bad9e8');
        else if (layer.type === 'fill' && /park|wood/.test(id)) vectorMap.setPaintProperty(layer.id,'fill-color',dark ? '#17362e' : '#cfe5d3');
        else if (layer.type === 'fill' && /building/.test(id)) vectorMap.setPaintProperty(layer.id,'fill-color',dark ? '#26333e' : '#deddd6');
        else if (layer.type === 'fill' && /landuse/.test(id)) vectorMap.setPaintProperty(layer.id,'fill-color',dark ? '#182630' : '#e6e8e2');
        else if (layer.type === 'line' && /highway|motorway/.test(id)) vectorMap.setPaintProperty(layer.id,'line-color',dark ? '#536474' : '#ffffff');
        else if (layer.type === 'line' && /boundary/.test(id)) vectorMap.setPaintProperty(layer.id,'line-color',dark ? '#566574' : '#a2acb5');
        else if (layer.type === 'symbol' && layer.paint?.['text-color'] !== undefined) {
          vectorMap.setPaintProperty(layer.id,'text-color',dark ? '#d8e0e8' : '#45515f');
          if (layer.paint?.['text-halo-color'] !== undefined) vectorMap.setPaintProperty(layer.id,'text-halo-color',dark ? '#101923' : '#f7f8f5');
        }
      } catch {}
    }
    if (vectorMap.getLayer('vacancy-listing-price')) {
      vectorMap.setPaintProperty('vacancy-listing-price','text-color',dark ? '#fff' : '#172033');
      vectorMap.setPaintProperty('vacancy-listing-price','text-halo-color',dark ? '#16212c' : '#fff');
    }
  }

  let observedTheme = document.documentElement.dataset.theme;
  new MutationObserver(() => {
    const theme = document.documentElement.dataset.theme;
    if (!vectorMap || theme === observedTheme) return;
    observedTheme = theme;
    activeStyle = styleForTheme();
    window.__vacancyStage96.activeStyle = activeStyle;
    applyFastTheme(theme);
  }).observe(document.documentElement, {attributes:true,attributeFilter:['data-theme']});
  window.__vacancyStage96 = {
    engine:'openfreemap-fast',
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
