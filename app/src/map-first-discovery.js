const DISCOVERY_VIEW_KEY='vacancy-discovery-view-v1';
let discoveryView=localStorage.getItem(DISCOVERY_VIEW_KEY)==='list'?'list':'cards';
let exploreUserMarker=null;

function applyDiscoveryView(){
  const host=document.querySelector('#cards');
  if(!host)return;
  host.classList.toggle('list-view',discoveryView==='list');
  host.classList.toggle('card-view',discoveryView==='cards');
  document.querySelectorAll('[data-discovery-view]').forEach(button=>{
    const active=button.dataset.discoveryView===discoveryView;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  });
}

function showUserLocationMarker(){
  const mapNode=document.querySelector('#exploreMap');
  if(!searchCenter){mapNode?.querySelector('.user-location-status')?.remove();return}
  let status=mapNode?.querySelector('.user-location-status');
  if(mapNode&&!status){status=document.createElement('div');status.className='user-location-status';status.textContent='● Your location';mapNode.appendChild(status)}
  if(!exploreMap||!searchCenter||typeof L==='undefined')return;
  if(exploreUserMarker)exploreUserMarker.remove();
  exploreUserMarker=L.circleMarker([searchCenter.lat,searchCenter.lon],{
    radius:9,color:'#fff',weight:3,fillColor:'#1677ff',fillOpacity:1,className:'user-location-marker'
  }).addTo(exploreMap).bindTooltip('Your location',{direction:'top',offset:[0,-8]});
  const marker=exploreUserMarker.getElement();
  if(marker)marker.setAttribute('aria-label','Your location');
}

const initExploreMapBeforeMapFirst=initExploreMap;
initExploreMap=function(){
  exploreUserMarker=null;
  initExploreMapBeforeMapFirst();
  showUserLocationMarker();
};

useMyLocation=function(){
  if(!navigator.geolocation){toast('Location is not supported in this browser');return}
  const button=document.querySelector('#useLocation');
  if(button){button.disabled=true;button.textContent='Finding you…'}
  navigator.geolocation.getCurrentPosition(pos=>{
    searchCenter={lat:pos.coords.latitude,lon:pos.coords.longitude};
    syncRadiusUI();
    if(exploreMap){suppressMapMove=true;exploreMap.setView([searchCenter.lat,searchCenter.lon],13)}
    showUserLocationMarker();
    if(button){button.disabled=false;button.textContent='✓ Using my location'}
    toast('Showing vacancies near you');
    applySearch();
  },()=>{
    if(button){button.disabled=false;button.textContent='⌖ Use my location'}
    toast('Location permission was not granted');
  },{enableHighAccuracy:false,timeout:8000,maximumAge:300000});
};

const applySearchBeforeMapFirst=applySearch;
applySearch=function(){
  applySearchBeforeMapFirst();
  applyDiscoveryView();
};

renderHome=function(){
  VACANCY_BACKEND.trackEvent('home_viewed',null,'#home');
  layout(`<section class="map-first-shell">
    <div id="exploreMap" class="explore-map" aria-label="Vacancy map"></div>
    <div class="map-search-panel" aria-label="Find vacancies">
      <label class="map-search-field"><span class="sr-only">Where</span><input id="q" placeholder="${marketUI().searchHint}" aria-label="Search location"></label>
      <button id="useLocation" class="ghost location-action">⌖ Use my location</button>
      <button id="filtersToggle" class="ghost" aria-expanded="false" aria-controls="discoveryFilters">Filters</button>
      <button id="searchBtn" class="primary">Search</button>
    </div>
    <button id="searchArea" class="pill search-area-btn" hidden>Search this area</button>
    <div id="discoveryFilters" class="discovery-filters" hidden>
      <div class="searchbar compact-searchbar">
        <label>Max rent <span id="rentUnitLabel" class="muted"></span><input id="maxRent" type="number" min="0" placeholder="Any"></label>
        <label>Move in by<input id="moveBy" type="date" aria-label="Move in by"></label>
        <label>Planned stay (weeks)<input id="stayWeeks" type="number" min="1" placeholder="Any" aria-label="Planned stay weeks"></label>
      </div>
      ${filterMarkup()}
      <div class="radius-panel">
        <div><label>Search radius <strong id="radiusLabel"></strong><input id="radius" type="range" min="1" max="100" step="1" value="${radiusValue}" aria-label="Search radius"></label><div id="radiusStatus" class="radius-status">Radius activates after choosing your location.</div></div>
        <button id="clearLocation" class="ghost" disabled>Clear location</button>
      </div>
    </div>
  </section>
  <section class="discovery-results">
    <div class="section-head results-head"><div><h1>Homes around you</h1><div id="resultCount" class="muted"></div></div>
      <div class="view-switch" role="group" aria-label="Listing view">
        <button class="ghost" data-discovery-view="cards" aria-label="Card view">▦ Cards</button>
        <button class="ghost" data-discovery-view="list" aria-label="List view">☰ List</button>
      </div>
    </div>
    <section id="cards" class="card-rail card-view"></section>
  </section>`);
  ['q','maxRent','moveBy','stayWeeks'].forEach(id=>document.querySelector(`#${id}`).addEventListener('input',applySearch));
  ['furnished','ensuite','parking','water','security','internet','twoOccupants','pets'].forEach(id=>document.querySelector(`#${id}`).addEventListener('change',applySearch));
  document.querySelector('#rentUnitLabel').textContent=`(${displayCurrency}/${market().rentPeriod})`;
  const filters=document.querySelector('#discoveryFilters'),toggle=document.querySelector('#filtersToggle');
  toggle.onclick=()=>{filters.hidden=!filters.hidden;toggle.setAttribute('aria-expanded',String(!filters.hidden));toggle.classList.toggle('active',!filters.hidden)};
  const radius=document.querySelector('#radius'),clear=document.querySelector('#clearLocation');
  syncRadiusUI();
  radius.oninput=()=>{radiusValue=Number(radius.value);localStorage.setItem(SEARCH_RADIUS_KEY,String(radiusValue));syncRadiusUI();applySearch()};
  document.querySelector('#useLocation').onclick=useMyLocation;
  clear.onclick=()=>{searchCenter=null;if(exploreUserMarker){exploreUserMarker.remove();exploreUserMarker=null}document.querySelector('.user-location-status')?.remove();syncRadiusUI();document.querySelector('#useLocation').textContent='⌖ Use my location';applySearch()};
  document.querySelector('#searchBtn').onclick=applySearch;
  document.querySelectorAll('[data-discovery-view]').forEach(button=>button.onclick=()=>{discoveryView=button.dataset.discoveryView;localStorage.setItem(DISCOVERY_VIEW_KEY,discoveryView);applyDiscoveryView()});
  initExploreMap();
  applySearch();
  bindCardRail();
};
