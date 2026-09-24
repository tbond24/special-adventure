(() => {
  if (new URLSearchParams(location.search).get('map') !== 'vacancy-lite') return;

  const STREET_ZOOM = 9;
  const BOUNDARY_URL = 'vendor/world-atlas/countries-110m.json';
  const originalTileFactory = vacancyTileLayer;
  let streetLayer = null;
  let boundaryLayer = null;
  let boundaryDataPromise = null;
  let themeObserver = null;
  const attributedMaps = new WeakSet();

  document.documentElement.dataset.mapEngine = 'vacancy-lite';

  function decodeArc(topology, reference) {
    const reversed = reference < 0;
    const index = reversed ? ~reference : reference;
    const transform = topology.transform || {scale:[1,1],translate:[0,0]};
    let x = 0, y = 0;
    const points = topology.arcs[index].map(([dx, dy]) => {
      x += dx; y += dy;
      return [x * transform.scale[0] + transform.translate[0], y * transform.scale[1] + transform.translate[1]];
    });
    return reversed ? points.reverse() : points;
  }

  function joinArcs(topology, references) {
    const points = [];
    references.forEach(reference => {
      const arc = decodeArc(topology, reference);
      points.push(...(points.length ? arc.slice(1) : arc));
    });
    return points;
  }

  function topologyToCountries(topology) {
    const geometries = topology.objects?.countries?.geometries || [];
    return {
      type:'FeatureCollection',
      features:geometries.map(geometry => ({
        type:'Feature',
        id:geometry.id,
        properties:geometry.properties || {},
        geometry:geometry.type === 'Polygon'
          ? {type:'Polygon', coordinates:geometry.arcs.map(ring => joinArcs(topology, ring))}
          : {type:'MultiPolygon', coordinates:geometry.arcs.map(polygon => polygon.map(ring => joinArcs(topology, ring)))}
      }))
    };
  }

  function loadBoundaryData() {
    if (!boundaryDataPromise) {
      boundaryDataPromise = fetch(BOUNDARY_URL)
        .then(response => {
          if (!response.ok) throw new Error(`Boundary request failed with ${response.status}`);
          return response.json();
        })
        .then(topologyToCountries);
    }
    return boundaryDataPromise;
  }

  function boundaryStyle() {
    const dark = document.documentElement.dataset.theme === 'dark';
    return {
      color:dark ? '#64748b' : '#8b9aaa',
      weight:0.7,
      opacity:0.82,
      fillColor:dark ? '#1d2a35' : '#eef1ec',
      fillOpacity:1
    };
  }

  function addBoundaries(map) {
    if (boundaryLayer) {
      if (!map.hasLayer(boundaryLayer)) boundaryLayer.addTo(map);
      boundaryLayer.setStyle(boundaryStyle());
      return;
    }
    loadBoundaryData().then(data => {
      if (exploreMap !== map || map.getZoom() >= STREET_ZOOM) return;
      boundaryLayer = L.geoJSON(data, {style:boundaryStyle, interactive:false}).addTo(map);
      if (!attributedMaps.has(map)) {
        map.attributionControl.addAttribution('<a href="https://www.naturalearthdata.com/">Natural Earth</a>');
        attributedMaps.add(map);
      }
    }).catch(error => {
      console.warn('Vacancy Lite boundaries unavailable.', error);
      document.querySelector('#exploreMap')?.classList.add('vacancy-lite-boundary-error');
    });
  }

  function syncBasemap(map) {
    const node = map.getContainer();
    const showStreets = map.getZoom() >= STREET_ZOOM;
    node.dataset.liteBasemap = showStreets ? 'streets' : 'regions';
    node.setAttribute('aria-description', showStreets
      ? 'Street map with individual Vacancy listings.'
      : 'Regional map with country outlines and grouped Vacancy counts.');
    if (showStreets) {
      if (boundaryLayer && map.hasLayer(boundaryLayer)) map.removeLayer(boundaryLayer);
      if (streetLayer && !map.hasLayer(streetLayer)) streetLayer.addTo(map);
    } else {
      if (streetLayer && map.hasLayer(streetLayer)) map.removeLayer(streetLayer);
      addBoundaries(map);
    }
  }

  vacancyTileLayer = function(map) {
    streetLayer = L.tileLayer(VACANCY_MAP_TILES.url, VACANCY_MAP_TILES.options);
    return streetLayer;
  };

  const baseInitExploreMap = initExploreMap;
  initExploreMap = function() {
    boundaryLayer = null;
    streetLayer = null;
    baseInitExploreMap();
    if (!exploreMap) return;
    const map = exploreMap;
    const node = map.getContainer();
    node.classList.add('vacancy-lite-map');
    if (!searchCenter) map.setView(market().center, marketCode === 'US' ? 3 : 6, {animate:false});
    syncBasemap(map);
    map.on('zoomend', () => syncBasemap(map));
    themeObserver?.disconnect();
    themeObserver = new MutationObserver(() => {
      if (boundaryLayer) boundaryLayer.setStyle(boundaryStyle());
    });
    themeObserver.observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
  };

  window.__vacancyStage95 = {
    engine:'vacancy-lite',
    STREET_ZOOM,
    activeBasemap:() => document.querySelector('#exploreMap')?.dataset.liteBasemap || null,
    restoreTileFactory:() => { vacancyTileLayer = originalTileFactory; }
  };
})();
