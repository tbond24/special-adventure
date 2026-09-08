const DISCOVERY_VIEW_KEY='vacancy-discovery-view-v1';
let discoveryView=localStorage.getItem(DISCOVERY_VIEW_KEY)==='list'?'list':'cards';
let exploreUserMarker=null;
let mobileMapSheetState='browse',mobileMapSheetTouched=false;

function setMobileMapSheetState(state,{user=false}={}){
  if(!['peek','browse','expanded'].includes(state))return;
  const sheet=document.querySelector('#mobileMapSheet');if(!sheet)return;
  mobileMapSheetState=state;if(user)mobileMapSheetTouched=true;
  sheet.dataset.sheetState=state;
  const handle=document.querySelector('#sheetHandle'),minimize=document.querySelector('#sheetMinimize');
  if(handle){handle.setAttribute('aria-label',state==='expanded'?'Show fewer listings':'Show more listings');handle.setAttribute('aria-expanded',String(state==='expanded'))}
  if(minimize)minimize.hidden=state==='peek';
  setTimeout(()=>exploreMap?.invalidateSize(),220);
}

function syncMobileMapSheetForResults(count){if(innerWidth>820||mobileMapSheetTouched)return;setMobileMapSheetState(count?'browse':'peek')}

function bindMobileMapSheet(){
  const sheet=document.querySelector('#mobileMapSheet'),handle=document.querySelector('#sheetHandle'),minimize=document.querySelector('#sheetMinimize');if(!sheet||!handle)return;
  setMobileMapSheetState(vacancies.length?'browse':'peek');
  let suppressClick=false;
  handle.onclick=()=>{if(suppressClick){suppressClick=false;return}setMobileMapSheetState(mobileMapSheetState==='expanded'?'browse':'expanded',{user:true})};
  minimize.onclick=()=>setMobileMapSheetState('peek',{user:true});
  let startY=0,tracking=false;
  handle.addEventListener('pointerdown',event=>{tracking=true;startY=event.clientY;handle.setPointerCapture?.(event.pointerId)});
  handle.addEventListener('pointerup',event=>{if(!tracking)return;tracking=false;const delta=event.clientY-startY;if(Math.abs(delta)<36)return;suppressClick=true;const order=['peek','browse','expanded'],index=order.indexOf(mobileMapSheetState),next=delta<0?Math.min(2,index+1):Math.max(0,index-1);setMobileMapSheetState(order[next],{user:true})});
}

function setLocationActionState(state){
  const button=document.querySelector('#useLocation');
  if(!button)return;
  const labels={idle:'Use my location',loading:'Finding your location',active:'Using my location'};
  button.disabled=state==='loading';
  button.dataset.state=state;
  button.setAttribute('aria-label',labels[state]);
  const text=button.querySelector('.control-label');
  if(text)text.textContent=state==='loading'?'Finding you…':state==='active'?'Using my location':'Use my location';
}

function applyDiscoveryView(){
  const host=document.querySelector('#cards');
  if(!host)return;
  host.classList.toggle('list-view',discoveryView==='list');
  host.classList.toggle('card-view',discoveryView==='cards');
  const button=document.querySelector('#viewToggle');
  if(button){
    const target=discoveryView==='cards'?'list':'cards';
    button.dataset.discoveryView=target;
    button.setAttribute('aria-label',target==='list'?'List view':'Card view');
    button.setAttribute('title',target==='list'?'Show list view':'Show card view');
    button.querySelector('use')?.setAttribute('href',discoveryView==='cards'?'#icon-card-grid':'#icon-list-view');
  }
}

function showUserLocationMarker(){
  const mapNode=document.querySelector('#exploreMap');
  if(!searchCenter){mapNode?.querySelector('.user-location-status')?.remove();return}
  let status=mapNode?.querySelector('.user-location-status');
  const label=searchCenterKind==='location'?'Your location':'Search centre';
  if(mapNode&&!status){status=document.createElement('div');status.className='user-location-status';mapNode.appendChild(status)}
  if(status)status.textContent=`● ${label}`;
  if(!exploreMap||!searchCenter||typeof L==='undefined')return;
  if(exploreUserMarker)exploreUserMarker.remove();
  exploreUserMarker=L.circleMarker([searchCenter.lat,searchCenter.lon],{
    radius:9,color:'#fff',weight:3,fillColor:'#1677ff',fillOpacity:1,className:'user-location-marker'
  }).addTo(exploreMap).bindTooltip(label,{direction:'top',offset:[0,-8]});
  const marker=exploreUserMarker.getElement();
  if(marker)marker.setAttribute('aria-label',label);
}

async function searchMapLocation(){
  const input=document.querySelector('#q'),button=document.querySelector('#searchBtn'),query=input.value.trim();
  if(query.length<2){toast('Enter a town, suburb or postcode');input.focus();return}
  button.disabled=true;button.setAttribute('aria-busy','true');
  try{
    const local=vacancies.find(v=>`${v.property.suburb} ${v.property.city} ${v.property.state} ${v.property.landmark} ${v.property.postcode||''}`.toLowerCase().includes(query.toLowerCase())&&v.property.publicLatitude!=null&&v.property.publicLongitude!=null);
    const place=local?{lat:local.property.publicLatitude,lon:local.property.publicLongitude,label:`${local.property.suburb}, ${local.property.city}`}:(await (async()=>{const response=await fetch(`/api/geocode?q=${encodeURIComponent(query)}`),data=await response.json();if(!response.ok)throw new Error(data.error||'Map search failed');return data})());
    searchCenter={lat:Number(place.lat),lon:Number(place.lon)};searchCenterKind='search';mapSearchQuery=query.toLowerCase();
    if(exploreMap){suppressMapMove=true;exploreMap.setView([searchCenter.lat,searchCenter.lon],13)}
    showUserLocationMarker();syncRadiusUI();setLocationActionState('idle');applySearch();toast(`Searching around ${place.label.split(',').slice(0,2).join(',')}`);
  }catch(error){toast(error.message||'Map search is temporarily unavailable')}
  finally{button.disabled=false;button.removeAttribute('aria-busy')}
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
  setLocationActionState('loading');
  navigator.geolocation.getCurrentPosition(pos=>{
    searchCenter={lat:pos.coords.latitude,lon:pos.coords.longitude};searchCenterKind='location';mapSearchQuery='';
    syncRadiusUI();
    if(exploreMap){suppressMapMove=true;exploreMap.setView([searchCenter.lat,searchCenter.lon],13)}
    showUserLocationMarker();
    setLocationActionState('active');
    toast('Showing vacancies near you');
    applySearch();
  },()=>{
    setLocationActionState('idle');
    toast('Location permission was not granted');
  },{enableHighAccuracy:false,timeout:8000,maximumAge:300000});
};

const applySearchBeforeMapFirst=applySearch;
applySearch=function(){
  applySearchBeforeMapFirst();
  applyDiscoveryView();
  syncMobileMapSheetForResults(document.querySelectorAll('.explore-card').length);
};

renderHome=function(){
  VACANCY_BACKEND.trackEvent('home_viewed',null,'#home');
  layout(`<section class="map-first-shell">
    <div id="exploreMap" class="explore-map" aria-label="Vacancy map"></div>
    <div class="map-search-panel" aria-label="Find vacancies">
      <label class="map-search-field"><span class="sr-only">Where</span><input id="q" list="locationSuggestions" placeholder="Search area" aria-label="Search location"><datalist id="locationSuggestions">${[...new Set(vacancies.flatMap(v=>[v.property?.suburb,v.property?.city,v.property?.state,v.property?.landmark]).filter(Boolean))].map(value=>`<option value="${escapeHtml(value)}"></option>`).join('')}</datalist></label>
      <button id="useLocation" class="ghost location-action" aria-label="Use my location"><svg class="control-icon" aria-hidden="true"><use href="#icon-location-arrow"></use></svg><span class="control-label">Use my location</span></button>
      <button id="filtersToggle" class="ghost tools-action" aria-label="Map tools" aria-expanded="false" aria-controls="discoveryFilters"><svg class="control-icon" aria-hidden="true"><use href="#icon-tools"></use></svg><span class="control-label">Tools</span></button>
      <button id="searchBtn" class="primary search-action" aria-label="Search map"><svg class="control-icon" aria-hidden="true"><use href="#icon-find"></use></svg><span class="control-label">Search</span></button>
    </div>
    <button id="searchArea" class="pill search-area-btn" hidden>Search this area</button>
    <div id="discoveryFilters" class="discovery-filters" hidden>
      <div class="radius-panel">
        <div><label>Search radius <strong id="radiusLabel"></strong><input id="radius" type="range" min="1" max="100" step="1" value="${radiusValue}" aria-label="Search radius"></label><div id="radiusStatus" class="radius-status">Choose a point on the map to use radius.</div></div>
        <button id="clearLocation" class="ghost" disabled>Clear location</button>
      </div>
      <div class="searchbar compact-searchbar">
        <label><span>Max rent</span><span class="compound-input"><input id="maxRent" type="number" min="0" placeholder="Any"><select id="rentPeriod" aria-label="Rent period"><option value="week">Weekly</option><option value="month" selected>Monthly</option><option value="year">Annually</option></select></span></label>
        <label><span>Move in</span><input id="moveBy" type="date" value="${new Date().toISOString().slice(0,10)}" aria-label="Move in by"></label>
        <label><span>Planned stay</span><span class="compound-input"><input id="stayWeeks" type="number" min="1" placeholder="Any" aria-label="Planned stay"><select id="stayPeriod" aria-label="Planned stay period"><option value="week">Weeks</option><option value="month">Months</option><option value="year">Years</option></select></span></label>
      </div>
      ${filterMarkup()}
    </div>
  </section>
  <section class="discovery-results" id="mobileMapSheet" data-sheet-state="browse" aria-label="Vacancy listings">
    <div class="map-sheet-handle-row">
      <button id="mapInfo" class="map-sheet-info" aria-label="Information and policies"><svg class="control-icon" aria-hidden="true"><use href="#icon-info"></use></svg></button>
      <button id="sheetHandle" class="map-sheet-handle" aria-label="Show more listings" aria-expanded="false" aria-controls="cards"><span aria-hidden="true"></span></button>
      <button id="sheetMinimize" class="map-sheet-minimize" aria-label="Minimize listings"><svg class="control-icon" aria-hidden="true"><use href="#icon-chevron"></use></svg></button>
    </div>
    <div class="listing-toolbar" aria-label="Listing controls"><div id="resultCount" class="result-total"></div>
      <button id="resultsFiltersToggle" class="ghost results-filter-action"><svg class="control-icon" aria-hidden="true"><use href="#icon-tools"></use></svg> Filters</button>
      <div class="view-switch" role="group" aria-label="Listing view">
        <button id="viewToggle" class="ghost" data-discovery-view="list" aria-label="List view" title="Show list view"><svg class="control-icon" aria-hidden="true"><use href="#icon-card-grid"></use></svg></button>
      </div>
    </div>
    <section id="cards" class="card-rail card-view"></section>
  </section><div id="mapInfoBackdrop" class="sheet-backdrop" hidden></div><section id="mapInfoSheet" class="action-sheet map-info-sheet" role="dialog" aria-modal="true" aria-labelledby="mapInfoTitle" hidden><div class="sheet-handle"></div><h2 id="mapInfoTitle">Vacancy information</h2><a href="#privacy">Privacy</a><a href="#terms">Terms of use</a><a href="#storage">Device storage and cookies</a><a href="#safety">Safety centre</a><button id="closeMapInfo" class="ghost">Done</button></section>`);
  ['maxRent','stayWeeks','rentPeriod','stayPeriod'].forEach(id=>document.querySelector(`#${id}`).addEventListener('input',applySearch));document.querySelector('#q').addEventListener('input',()=>{if(document.querySelector('#q').value.trim().toLowerCase()!==mapSearchQuery)mapSearchQuery='';applySearch()});document.querySelector('#q').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();searchMapLocation()}});document.querySelector('#moveBy').addEventListener('input',event=>{event.currentTarget.dataset.touched='true';applySearch()});
  ['furnished','ensuite','parking','water','security','internet','twoOccupants','pets'].forEach(id=>document.querySelector(`#${id}`).addEventListener('change',applySearch));
  const rentUnitLabel=document.querySelector('#rentUnitLabel');if(rentUnitLabel)rentUnitLabel.textContent=`(${displayCurrency}/${market().rentPeriod})`;
  const filters=document.querySelector('#discoveryFilters'),toggle=document.querySelector('#filtersToggle');
  const setFiltersOpen=open=>{filters.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.classList.toggle('active',open)};
  toggle.onclick=()=>setFiltersOpen(filters.hidden);
  setTimeout(()=>document.addEventListener('pointerdown',event=>{if(!filters.hidden&&!filters.contains(event.target)&&!toggle.contains(event.target)&&!document.querySelector('#resultsFiltersToggle')?.contains(event.target))setFiltersOpen(false)},{once:false}),0);
  document.querySelector('#resultsFiltersToggle').onclick=()=>{setFiltersOpen(true);document.querySelector('.map-first-shell').scrollIntoView({behavior:'smooth',block:'start'})};
  const radius=document.querySelector('#radius'),clear=document.querySelector('#clearLocation');
  syncRadiusUI();
  radius.oninput=()=>{radiusValue=Number(radius.value);localStorage.setItem(SEARCH_RADIUS_KEY,String(radiusValue));syncRadiusUI();applySearch()};
  document.querySelector('#useLocation').onclick=useMyLocation;
  clear.onclick=()=>{searchCenter=null;searchCenterKind='map';mapSearchQuery='';if(exploreUserMarker){exploreUserMarker.remove();exploreUserMarker=null}document.querySelector('.user-location-status')?.remove();syncRadiusUI();setLocationActionState('idle');applySearch()};
  document.querySelector('#searchBtn').onclick=searchMapLocation;
  document.querySelector('#viewToggle').onclick=button=>{discoveryView=button.currentTarget.dataset.discoveryView;localStorage.setItem(DISCOVERY_VIEW_KEY,discoveryView);applyDiscoveryView()};
  initExploreMap();
  bindMobileMapSheet();
  const info=document.querySelector('#mapInfoSheet'),infoBackdrop=document.querySelector('#mapInfoBackdrop'),closeInfo=()=>{info.hidden=true;infoBackdrop.hidden=true};document.querySelector('#mapInfo').onclick=()=>{info.hidden=false;infoBackdrop.hidden=false};document.querySelector('#closeMapInfo').onclick=closeInfo;infoBackdrop.onclick=closeInfo;
  applySearch();
  bindCardRail();
};
