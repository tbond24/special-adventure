let vacancies=[], currentUser=null, saved=new Set(), route={name:'home',id:null}, booting=true;
const MARKET_PREF_KEY='vacancy-market-v1';
const CURRENCY_PREF_KEY='vacancy-currency-v1';
const MARKETS={
  KE:{code:'KE',flag:'🇰🇪',label:'Kenya',center:[-1.286389,36.817223],currency:'KES',currencyLabel:'KSh',rentPeriod:'month',distanceUnit:'km',locale:'en-KE',locationLabels:{region:'County',city:'Town / city',locality:'Estate / area',postal:'Postcode'}},
  AU:{code:'AU',flag:'🇦🇺',label:'Australia',center:[-33.8688,151.2093],currency:'AUD',currencyLabel:'A$',rentPeriod:'week',distanceUnit:'km',locale:'en-AU',locationLabels:{region:'State',city:'City',locality:'Suburb',postal:'Postcode'}},
  US:{code:'US',flag:'🇺🇸',label:'United States',center:[39.8283,-98.5795],currency:'USD',currencyLabel:'$',rentPeriod:'month',distanceUnit:'mi',locale:'en-US',locationLabels:{region:'State',city:'City',locality:'Neighbourhood',postal:'ZIP code'}},
  GB:{code:'GB',flag:'🇬🇧',label:'United Kingdom',center:[51.5072,-0.1276],currency:'GBP',currencyLabel:'£',rentPeriod:'month',distanceUnit:'mi',locale:'en-GB',locationLabels:{region:'County / region',city:'Town / city',locality:'Area',postal:'Postcode'}},
  UG:{code:'UG',flag:'🇺🇬',label:'Uganda',center:[0.3476,32.5825],currency:'UGX',currencyLabel:'USh',rentPeriod:'month',distanceUnit:'km',locale:'en-UG',locationLabels:{region:'District',city:'Town / city',locality:'Area',postal:'Postal code'}},
  TZ:{code:'TZ',flag:'🇹🇿',label:'Tanzania',center:[-6.7924,39.2083],currency:'TZS',currencyLabel:'TSh',rentPeriod:'month',distanceUnit:'km',locale:'en-TZ',locationLabels:{region:'Region',city:'Town / city',locality:'Area',postal:'Postcode'}},
  CA:{code:'CA',flag:'🇨🇦',label:'Canada',center:[43.6532,-79.3832],currency:'CAD',currencyLabel:'C$',rentPeriod:'month',distanceUnit:'km',locale:'en-CA',locationLabels:{region:'Province',city:'City',locality:'Neighbourhood',postal:'Postal code'}},
  NZ:{code:'NZ',flag:'🇳🇿',label:'New Zealand',center:[-36.8509,174.7645],currency:'NZD',currencyLabel:'NZ$',rentPeriod:'week',distanceUnit:'km',locale:'en-NZ',locationLabels:{region:'Region',city:'City',locality:'Suburb',postal:'Postcode'}},
  ZA:{code:'ZA',flag:'🇿🇦',label:'South Africa',center:[-26.2041,28.0473],currency:'ZAR',currencyLabel:'R',rentPeriod:'month',distanceUnit:'km',locale:'en-ZA',locationLabels:{region:'Province',city:'City',locality:'Suburb',postal:'Postal code'}},
  NG:{code:'NG',flag:'🇳🇬',label:'Nigeria',center:[6.5244,3.3792],currency:'NGN',currencyLabel:'₦',rentPeriod:'year',distanceUnit:'km',locale:'en-NG',locationLabels:{region:'State',city:'City',locality:'Area',postal:'Postal code'}},
  GH:{code:'GH',flag:'🇬🇭',label:'Ghana',center:[5.6037,-0.187],currency:'GHS',currencyLabel:'GH₵',rentPeriod:'year',distanceUnit:'km',locale:'en-GH',locationLabels:{region:'Region',city:'City',locality:'Area',postal:'Postal code'}},
  IN:{code:'IN',flag:'🇮🇳',label:'India',center:[19.076,72.8777],currency:'INR',currencyLabel:'₹',rentPeriod:'month',distanceUnit:'km',locale:'en-IN',locationLabels:{region:'State',city:'City',locality:'Locality',postal:'PIN code'}},
  AE:{code:'AE',flag:'🇦🇪',label:'United Arab Emirates',center:[25.2048,55.2708],currency:'AED',currencyLabel:'AED',rentPeriod:'year',distanceUnit:'km',locale:'en-AE',locationLabels:{region:'Emirate',city:'City',locality:'Area',postal:'Postal code'}},
  SG:{code:'SG',flag:'🇸🇬',label:'Singapore',center:[1.3521,103.8198],currency:'SGD',currencyLabel:'S$',rentPeriod:'month',distanceUnit:'km',locale:'en-SG',locationLabels:{region:'Region',city:'City',locality:'Area',postal:'Postal code'}},
  DE:{code:'DE',flag:'🇩🇪',label:'Germany',center:[52.52,13.405],currency:'EUR',currencyLabel:'€',rentPeriod:'month',distanceUnit:'km',locale:'de-DE',locationLabels:{region:'State',city:'City',locality:'District',postal:'Postcode'}},
  FR:{code:'FR',flag:'🇫🇷',label:'France',center:[48.8566,2.3522],currency:'EUR',currencyLabel:'€',rentPeriod:'month',distanceUnit:'km',locale:'fr-FR',locationLabels:{region:'Region',city:'City',locality:'Area',postal:'Postcode'}},
  JP:{code:'JP',flag:'🇯🇵',label:'Japan',center:[35.6762,139.6503],currency:'JPY',currencyLabel:'¥',rentPeriod:'month',distanceUnit:'km',locale:'ja-JP',locationLabels:{region:'Prefecture',city:'City',locality:'Area',postal:'Postal code'}},
  BR:{code:'BR',flag:'🇧🇷',label:'Brazil',center:[-23.5505,-46.6333],currency:'BRL',currencyLabel:'R$',rentPeriod:'month',distanceUnit:'km',locale:'pt-BR',locationLabels:{region:'State',city:'City',locality:'Neighbourhood',postal:'CEP'}}
 };
const MARKET_UI={
 KE:{searchHint:'Kasarani, Ruiru, near KU…',unitTypes:['Bedsitter','Studio','Single room','Shared room','1 Bedroom','2 Bedroom','3 Bedroom'],priorityFilters:['water','security','parking']},
 AU:{searchHint:'Suburb, postcode or landmark…',unitTypes:['Studio','Private room','Shared room','1 Bedroom','2 Bedroom','3 Bedroom'],priorityFilters:['furnished','parking','pets']},
 US:{searchHint:'Neighbourhood, ZIP or landmark…',unitTypes:['Studio','Private room','Shared room','1 Bedroom','2 Bedroom','3 Bedroom'],priorityFilters:['parking','pets','furnished']},
 GB:{searchHint:'Town, postcode or area…',unitTypes:['Studio','Room','Shared room','1 Bedroom','2 Bedroom','3 Bedroom'],priorityFilters:['furnished','pets','internet']},
 UG:{searchHint:'Kampala area, district or landmark…',unitTypes:['Single room','Studio','1 Bedroom','2 Bedroom','3 Bedroom'],priorityFilters:['water','security','parking']},
 TZ:{searchHint:'Dar area, region or landmark…',unitTypes:['Single room','Studio','1 Bedroom','2 Bedroom','3 Bedroom'],priorityFilters:['water','security','parking']}
};
for(const code of Object.keys(MARKETS))if(!MARKET_UI[code])MARKET_UI[code]={searchHint:'City, area, postcode or landmark…',unitTypes:['Studio','Private room','Shared room','1 Bedroom','2 Bedroom','3 Bedroom','House','Shop'],priorityFilters:['parking','security','internet']};
const FILTER_DEFS={furnished:'Furnished',ensuite:'Ensuite',parking:'Parking',water:'Water',security:'Security',internet:'Internet',twoOccupants:'2+ occupants',pets:'Pets considered'};
function marketUI(){return MARKET_UI[marketCode]||MARKET_UI.KE}
function filterMarkup(){const preferred=marketUI().priorityFilters,rest=Object.keys(FILTER_DEFS).filter(x=>!preferred.includes(x));const one=id=>`<label class="filter-check"><input id="${id}" type="checkbox"> ${FILTER_DEFS[id]}</label>`;return `<div class="filters primary-filters">${preferred.map(one).join('')}<details class="more-filters"><summary>More filters</summary><div class="filters">${rest.map(one).join('')}</div></details></div>`}
function detectMarket(){
  const savedCode=localStorage.getItem(MARKET_PREF_KEY); if(savedCode&&MARKETS[savedCode])return savedCode;
  const locale=(navigator.language||'').toUpperCase();
  const region=(locale.match(/[-_]([A-Z]{2})$/)||[])[1];
  return MARKETS[region]?region:'KE';
}
let marketCode=detectMarket();
function market(){return MARKETS[marketCode]||MARKETS.KE}
let displayCurrency=localStorage.getItem(CURRENCY_PREF_KEY)||market().currency,fxRates=null;
function currencyMeta(code=displayCurrency){return Object.values(MARKETS).find(x=>x.currency===code)||{currency:code,currencyLabel:code,locale:market().locale}}
async function setDisplayCurrency(code){if(!Object.values(MARKETS).some(m=>m.currency===code))return;const previous=displayCurrency;if(code!==market().currency&&!fxRates){try{const response=await fetch('/api/exchange-rates'),data=await response.json();if(!response.ok)throw new Error(data.error);fxRates=data.rates}catch(error){toast(error.message||'Currency conversion is temporarily unavailable');displayCurrency=previous;refreshDisplayCurrency();return}}displayCurrency=code;localStorage.setItem(CURRENCY_PREF_KEY,code);refreshDisplayCurrency()}
function marketForCountry(country=''){const c=String(country).trim().toLowerCase(),aliases={usa:'US',us:'US',uk:'GB',uae:'AE'};if(aliases[c])return MARKETS[aliases[c]];return Object.values(MARKETS).find(item=>item.label.toLowerCase()===c||item.code.toLowerCase()===c)||market()}
function convertAmount(amount,from,to=displayCurrency){const value=Number(amount);if(from===to)return value;if(!fxRates?.[from]||!fxRates?.[to])return null;return value/fxRates[from]*fxRates[to]}
function displayAmount(amount,from){const converted=convertAmount(amount,from),meta=currencyMeta(converted==null?from:displayCurrency),rounded=Math.round((converted==null?Number(amount):converted)*100)/100;return{value:rounded,code:meta.currency,label:meta.currencyLabel,locale:meta.locale,converted:converted!=null&&from!==displayCurrency}}
function formatListingPrice(v){const original=v.rentCurrency||marketForCountry(v.property?.country).currency,shown=displayAmount(v.rentAmount??v.monthlyRent,original);return `${shown.converted?'≈ ':''}${shown.label} ${shown.value.toLocaleString(shown.locale)}/${v.rentPeriod||marketForCountry(v.property?.country).rentPeriod}`}
const SEARCH_RADIUS_KEY='vacancy-radius-v1';
const DISTANCE_PREF_KEY='vacancy-distance-unit-v1';
let searchCenter=null;
let searchCenterKind='map',mapSearchQuery='';
let radiusValue=Number(localStorage.getItem(SEARCH_RADIUS_KEY)||10);
function distanceUnit(){const preferred=localStorage.getItem(DISTANCE_PREF_KEY);return preferred==='km'||preferred==='mi'?preferred:market().distanceUnit}
function radiusKm(){return distanceUnit()==='mi'?radiusValue*1.609344:radiusValue}
function haversineKm(lat1,lon1,lat2,lon2){const R=6371,toRad=x=>x*Math.PI/180,dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1);const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(a))}
function distanceTo(v){const lat=v.property?.publicLatitude,lon=v.property?.publicLongitude;if(searchCenter==null||lat==null||lon==null)return null;return haversineKm(searchCenter.lat,searchCenter.lon,lat,lon)}
function syncRadiusUI(){const label=document.querySelector('#radiusLabel'),status=document.querySelector('#radiusStatus'),clear=document.querySelector('#clearLocation'),radius=document.querySelector('#radius');if(label)label.textContent=`${radiusValue} ${distanceUnit()}`;if(status)status.textContent=searchCenter?`Filtering within ${radiusValue} ${distanceUnit()} of your chosen centre.`:'Choose a point on the map to use radius.';if(clear)clear.disabled=!searchCenter;if(radius)radius.disabled=!searchCenter;updateMapRadius()}
function useMyLocation(){if(!navigator.geolocation){toast('Location is not supported in this browser');return}navigator.geolocation.getCurrentPosition(pos=>{searchCenter={lat:pos.coords.latitude,lon:pos.coords.longitude};syncRadiusUI();if(exploreMap){suppressMapMove=true;exploreMap.setView([searchCenter.lat,searchCenter.lon],13)}toast('Searching around your location');applySearch()},()=>toast('Location permission was not granted'),{enableHighAccuracy:false,timeout:8000,maximumAge:300000})}
let exploreMap=null,exploreMarkers=new Map(),exploreRadiusCircle=null,exploreSelectedId=null,suppressMapMove=false,suppressRailSync=false,railTimer=null,exploreMapViewRestored=false;
// The unlabelled legacy vacancy-find-map-view key is deliberately left intact.
// It cannot tell an intentional choice from a cached automatic/neutral view.
const MAP_LAUNCH_KEY='vacancy-find-map-launch-v2';
let exploreLaunch=null,exploreLaunchEvents=null,applyingExploreLaunch=false;
function mapLaunchScope(){return location.pathname+location.search}
function readExploreView(value){
  const point=validMapPoint(value?.lat,value?.lon);
  return point&&Number.isFinite(value?.zoom)&&value.zoom>=0&&value.zoom<=22?{lat:point[0],lon:point[1],zoom:value.zoom}:null;
}
function createExploreLaunch(){
  const state={provenance:'pending',view:null,search:null,started:false,intent:0,scope:mapLaunchScope()};
  // A new visit gets a new launch. Reload and browser history may restore only
  // an explicitly chosen map, never an old automatic result or failed lookup.
  const navigation=performance.getEntriesByType('navigation')[0]?.type;
  if(navigation==='reload'||navigation==='back_forward')try{
    const saved=history.state?.vacancyMapLaunch||JSON.parse(sessionStorage.getItem(MAP_LAUNCH_KEY)||'null');
    const view=readExploreView(saved?.view);
    if(saved?.version===2&&saved.scope===state.scope&&saved.provenance==='manual'&&view){
      state.provenance='manual';state.view=view;
      const center=saved.search?.center,point=center&&validMapPoint(center.lat,center.lon);
      state.search={center:point?{lat:point[0],lon:point[1]}:null,kind:['search','location','map'].includes(saved.search?.kind)?saved.search.kind:'map',query:typeof saved.search?.query==='string'?saved.search.query:'',mapQuery:typeof saved.search?.mapQuery==='string'?saved.search.mapQuery:''};
      searchCenter=state.search.center;searchCenterKind=state.search.kind;mapSearchQuery=state.search.mapQuery;
    }
  }catch{}
  return state;
}
function saveExploreLaunch(captureSearch=true){
  if(!exploreLaunch||!exploreMap)return;
  const center=exploreMap.getCenter();
  // Leaflet permits equivalent wrapped world copies after an intentional pan.
  exploreLaunch.view={lat:center.lat,lon:Math.abs(center.lng)<=180?center.lng:((center.lng+180)%360+360)%360-180,zoom:exploreMap.getZoom()};
  if(captureSearch&&exploreLaunch.provenance==='manual')exploreLaunch.search={center:searchCenter?{...searchCenter}:null,kind:searchCenterKind,query:document.querySelector('#q')?.value||'',mapQuery:mapSearchQuery};
  const {provenance,view,search,scope}=exploreLaunch;
  const record={version:2,provenance,view,search,scope};
  try{sessionStorage.setItem(MAP_LAUNCH_KEY,JSON.stringify(record))}catch{}
  // Keep the same bounded record with its history entry: a later fresh visit
  // may replace the session record without erasing a chosen map on Back.
  if(parseHash().name==='home')try{history.replaceState({...history.state,vacancyMapLaunch:record},'')}catch{}
}
function invalidateExploreMapChoice(){
  if(exploreLaunch)exploreLaunch.intent++;
  if(document.querySelector('#useLocation')?.dataset.state==='loading'&&typeof setLocationActionState==='function')setLocationActionState('idle');
}
function cancelExploreLaunch(event){
  if(!exploreLaunch)return;
  // Enter's submit handler starts its own request before this listener runs.
  if(event?.type!=='keydown'||event.key!=='Enter')invalidateExploreMapChoice();
  // Interacting is enough to cancel an automatic jump, but not enough to
  // claim that the visitor chose the current (possibly neutral) viewport.
  if(exploreLaunch.provenance==='pending')exploreLaunch.provenance='fallback';
  saveExploreLaunch();
}
function beginExploreMapChoice(){cancelExploreLaunch();return exploreLaunch?.intent}
function isCurrentExploreMapChoice(intent){return parseHash().name==='home'&&(!exploreLaunch||exploreLaunch.intent===intent)}
function chooseExploreMap(intent){
  if(!exploreLaunch)return;
  if(intent===undefined)invalidateExploreMapChoice();
  else if(!isCurrentExploreMapChoice(intent))return;
  exploreLaunch.provenance='manual';
  saveExploreLaunch();
}
function suspendExploreLaunch(){
  invalidateExploreMapChoice();
  if(exploreLaunch?.provenance==='pending'){
    exploreLaunch.provenance='fallback';
    saveExploreLaunch(false);
  }
}
for(const event of ['hashchange','popstate'])addEventListener(event,()=>{if(parseHash().name!=='home')suspendExploreLaunch()});
// Coarse launch anchoring is independent of explicit search/radius state.
function validMapPoint(lat,lon){
  if(![lat,lon].every(value=>(typeof value==='number'||typeof value==='string')&&String(value).trim()!==''))return null;
  lat=Number(lat);lon=Number(lon);
  return Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180?[lat,lon]:null;
}
function fitExploreWorld(map){
  // Centre Africa at 0°N, 20°E. The extra eastern longitude keeps both raw
  // dateline endpoints in bounds, so viewport filtering cannot lose listings.
  // Fit the Mercator world to the viewport rather than clipping it on phones.
  map.fitBounds([[-85.05112878,-180],[85.05112878,220]],{padding:[16,16],animate:false});
}
function nearestLaunchPoint(anchor,rows){
  let nearest=null,distance=Infinity;
  for(const row of rows){
    if(row.status&&!['active','published'].includes(row.status))continue;
    const point=validMapPoint(row.property?.publicLatitude,row.property?.publicLongitude);
    if(!point)continue;
    const km=haversineKm(...anchor,...point);
    if(km<distance){distance=km;nearest=point}
  }
  return nearest;
}
function markerPrice(v){
  const original=v.rentCurrency||marketForCountry(v.property?.country).currency;
  const shown=displayAmount(v.rentAmount??v.monthlyRent,original),value=shown.value;
  const compact=value>=1000000?`${(value/1000000).toFixed(value%1000000?1:0)}m`:value>=1000?`${(value/1000).toFixed(value%1000?1:0)}k`:String(value);
  return `${shown.converted?'≈':''}${shown.label}${compact}`;
}
function pinIcon(v,selected=false){
  const price=escapeHtml(markerPrice(v));
  return L.divIcon({className:'vacancy-marker',html:`<div class="map-pin ${selected?'selected':''}" data-marker-price="${price}">${price}</div>`,iconSize:[88,36],iconAnchor:[44,36]});
}
function markerTooltip(v){
  const content=document.createElement('div');
  content.className='marker-summary';
  const title=document.createElement('strong'),meta=document.createElement('span');
  title.textContent=v.room.name;
  meta.textContent=`${v.property.suburb} · ${formatListingPrice(v)}${v.availableFrom ? ` · Available ${dateLabel(v.availableFrom)}` : ''}`;
  content.append(title,meta);
  return content;
}
function startExploreLaunch(){
  const state=exploreLaunch;
  if(state.provenance!=='pending'||state.started)return;
  state.started=true;
  let timeout;
  const lookup=fetch('/api/visitor-country').then(response=>response.ok?response.json():null).catch(()=>null);
  Promise.race([lookup,new Promise(resolve=>{timeout=setTimeout(()=>resolve(null),4000)})]).then(geo=>{
    clearTimeout(timeout);
    if(exploreLaunch!==state||state.provenance!=='pending')return;
    const map=exploreMap;
    if(searchCenter){chooseExploreMap();return}
    if(!map?.getContainer().isConnected||parseHash().name!=='home'){suspendExploreLaunch();return}
    const anchor=validMapPoint(geo?.latitude,geo?.longitude);
    const nearest=anchor&&nearestLaunchPoint(anchor,vacancies);
    state.provenance=anchor?'auto':'fallback';
    applyingExploreLaunch=true;suppressMapMove=true;
    try{
      if(anchor&&nearest){
        // Keep both real endpoints visible, including across the dateline.
        // Existing viewport filtering uses ordinary, unwrapped longitudes.
        map.fitBounds(L.latLngBounds([anchor,nearest]),{padding:[48,48],maxZoom:11,animate:false});
      }else if(anchor)map.setView(anchor,6,{animate:false});
      else fitExploreWorld(map);
    }finally{applyingExploreLaunch=false;suppressMapMove=false}
    saveExploreLaunch();applySearch();
  });
}
function initExploreMap(){
  const node=document.querySelector('#exploreMap');if(!node||typeof L==='undefined')return;
  exploreLaunch ||= createExploreLaunch();
  // Replacing DOM for currency/account/inventory rendering does not end the
  // launch. Its one bounded lookup targets the current map when it completes.
  exploreLaunchEvents?.abort();
  if(exploreMap){saveExploreLaunch(false);exploreMap.remove();exploreMap=null;exploreMarkers.clear()}
  const chosen=searchCenter&&validMapPoint(searchCenter.lat,searchCenter.lon);
  if(chosen&&exploreLaunch.provenance==='pending')exploreLaunch.provenance='manual';
  const previous=exploreLaunch.view;
  exploreMapViewRestored=Boolean(previous&&exploreLaunch.provenance!=='pending');
  const map=exploreMap=L.map(node,{zoomControl:false});
  if(previous)map.setView([previous.lat,previous.lon],previous.zoom);
  else if(chosen)map.setView(chosen,12);
  else fitExploreWorld(map);
  vacancyTileLayer(map);
  const input=document.querySelector('#q');
  if(input&&exploreLaunch.search?.query)input.value=exploreLaunch.search.query;
  map.on('movestart',()=>{
    if(!applyingExploreLaunch&&!suppressMapMove){chooseExploreMap();const b=document.querySelector('#searchArea');if(b)b.hidden=true}
  });
  map.on('moveend',()=>{
    saveExploreLaunch();
    if(!suppressMapMove){const b=document.querySelector('#searchArea');if(b)b.hidden=false}else suppressMapMove=false;
  });
  const events=exploreLaunchEvents=new AbortController();
  for(const event of ['pointerdown','wheel','touchstart','keydown'])node.addEventListener(event,cancelExploreLaunch,{passive:true,signal:events.signal});
  for(const selector of ['#useLocation','#searchBtn','#q']){
    const control=document.querySelector(selector);
    for(const event of ['pointerdown','keydown','input'])control?.addEventListener(event,cancelExploreLaunch,{signal:events.signal});
  }
  const area=document.querySelector('#searchArea');
  if(area)area.onclick=()=>{cancelExploreLaunch();const c=map.getCenter();searchCenter={lat:c.lat,lon:c.lng};searchCenterKind='map';mapSearchQuery=document.querySelector('#q')?.value.trim().toLowerCase()||'';chooseExploreMap();area.hidden=true;syncRadiusUI();if(typeof showUserLocationMarker==='function')showUserLocationMarker();applySearch()};
  saveExploreLaunch();startExploreLaunch();
}
function updateMapRadius(){if(exploreRadiusCircle){exploreRadiusCircle.remove();exploreRadiusCircle=null}}
function bindExploreMarkerElement(marker,id){
  const el=marker.getElement();
  if(!el)return;
  const listing=vacancies.find(v=>v.id===id);
  el.dataset.vacancyId=id;
  el.setAttribute('role','button');
  el.setAttribute('aria-pressed',String(id===exploreSelectedId));
  el.setAttribute('aria-label',listing?`Select ${listing.room.name}, ${markerPrice(listing)}, ${listing.property.suburb}`:'Select vacancy');
  el.addEventListener('click',()=>selectExplore(id,true));
  el.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){
      e.preventDefault();
      selectExplore(id,true);
    }
  });
}
function updateExploreMarkers(rows){
  if(!exploreMap)return;
  for(const marker of exploreMarkers.values())marker.remove();
  exploreMarkers.clear();
  for(const v of rows){
    const point=validMapPoint(v.property?.publicLatitude,v.property?.publicLongitude);
    if(!point)continue;
    const [lat,lon]=point;
    const marker=L.marker([lat,lon],{icon:pinIcon(v,v.id===exploreSelectedId),keyboard:true,title:`${v.room.name}, ${markerPrice(v)}`}).addTo(exploreMap);
    marker.bindTooltip(markerTooltip(v),{direction:'top',offset:[0,-32],className:'vacancy-map-tooltip',opacity:1});
    marker.on('click',()=>selectExplore(v.id,true));
    bindExploreMarkerElement(marker,v.id);
    exploreMarkers.set(v.id,marker);
  }
  updateMapRadius();

}
function selectExplore(id,fromMap=false){
  exploreSelectedId=id;
  if(fromMap&&typeof setMobileMapSheetState==='function'&&innerWidth<=820)setMobileMapSheetState('browse',{user:true});
  document.querySelectorAll('[data-card-id]').forEach(c=>c.classList.toggle('selected',c.dataset.cardId===id));
  for(const [mid,m] of exploreMarkers){
    const listing=vacancies.find(v=>v.id===mid);
    if(listing)m.setIcon(pinIcon(listing,mid===id));
    bindExploreMarkerElement(m,mid);
  }
  if(fromMap){
    const card=document.querySelector(`[data-card-id="${id}"]`);
    if(card){
      const rail=card.parentElement;
      rail.querySelectorAll('.map-focused').forEach(item=>item.classList.remove('map-focused'));
      rail.prepend(card);
      card.style.setProperty('--map-focus-color',getComputedStyle(exploreMarkers.get(id)?.getElement()?.querySelector('.map-pin')||card).backgroundColor);
      card.classList.add('map-focused');
      clearTimeout(selectExplore.focusTimer);
      selectExplore.focusTimer=setTimeout(()=>card.classList.remove('map-focused'),3000);
    }
    suppressRailSync=true;
    card?.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});
    setTimeout(()=>{
      suppressRailSync=false;
      selectExplore(id,false);
    },360);
  }
}
function bindCardRail(){const rail=document.querySelector('#cards');if(!rail)return;rail.addEventListener('scroll',()=>{if(suppressRailSync)return;clearTimeout(railTimer);railTimer=setTimeout(()=>{if(suppressRailSync)return;const cards=[...rail.querySelectorAll('[data-card-id]')];if(!cards.length)return;const centre=rail.getBoundingClientRect().left+rail.clientWidth/2;cards.sort((a,b)=>Math.abs((a.getBoundingClientRect().left+a.offsetWidth/2)-centre)-Math.abs((b.getBoundingClientRect().left+b.offsetWidth/2)-centre));selectExplore(cards[0].dataset.cardId,false)},80)},{passive:true})}
function initListingMapPicker(mapId,latName,lonName,initialLat='',initialLon='',options={}){
 const node=document.querySelector(`#${mapId}`);if(!node||typeof L==='undefined')return;const form=node.closest('form'),lat=form.querySelector(`[name="${latName}"]`),lon=form.querySelector(`[name="${lonName}"]`);const reverseGeocode=options.reverseGeocode||mapId==='newPropertyMap';if(reverseGeocode&&!form.querySelector('[data-address-status]')){node.nextElementSibling?.classList.contains('map-help')&&node.nextElementSibling.remove();node.insertAdjacentHTML('afterend','<div data-address-status class="map-status sr-only" role="status" aria-live="polite">Choose a point to look up its address.</div><div data-address-suggestion class="address-suggestion" hidden></div>')}const hasInitial=initialLat!==''&&initialLon!=='';const start=hasInitial?[Number(initialLat),Number(initialLon)]:market().center;const map=L.map(node,{zoomControl:false}).setView(start,hasInitial?14:11);vacancyTileLayer(map);let marker=null,lookupNumber=0;const suggestion=form.querySelector('[data-address-suggestion]'),status=form.querySelector('[data-address-status]');
 const showSuggestion=data=>{let countryField=form.elements.country;if(!countryField){countryField=document.createElement('input');countryField.type='hidden';countryField.name='country';form.append(countryField)}countryField.value=data.country||'';const values={region:data.region,city:data.city,locality:data.locality,landmark:data.landmark,postal:data.postal,address:data.address||data.formattedAddress};for(const [name,value] of Object.entries(values)){const field=form.elements[name];if(field)field.value=value||''}form.dataset.locationLabel=[data.locality,data.city,data.region,data.country].find(Boolean)||'';if(suggestion)suggestion.hidden=true;if(status)status.textContent='Address filled from the map. You can edit it.';form.dispatchEvent(new CustomEvent('vacancy:location-used',{detail:{address:data.formattedAddress||data.address||''}}))};
 const lookup=async(a,b)=>{if(!reverseGeocode)return;const mine=++lookupNumber;delete form.dataset.locationLabel;for(const name of ['country','region','city','locality','landmark','postal','address'])if(form.elements[name])form.elements[name].value='';if(status)status.textContent='Looking up this location…';if(suggestion)suggestion.hidden=true;try{const response=await fetch(`/api/reverse-geocode?lat=${encodeURIComponent(a)}&lon=${encodeURIComponent(b)}`),data=await response.json();if(mine!==lookupNumber||!form.isConnected||form.dataset.draftLocationFrozen||form.dataset.draftExited)return;if(!response.ok)throw new Error(data.error||'Address lookup failed');showSuggestion(data);if(status)status.textContent='Review the suggested address before using it.'}catch(error){if(mine!==lookupNumber||!form.isConnected||form.dataset.draftLocationFrozen||form.dataset.draftExited)return;if(status)status.textContent=error.message||'Address lookup failed. Enter the address manually.'}};
 const set=(a,b,doLookup=true)=>{lat.value=Number(a).toFixed(3);lon.value=Number(b).toFixed(3);if(marker)marker.setLatLng([a,b]);else marker=L.marker([a,b],{draggable:true}).addTo(map);marker.off('dragend');marker.on('dragend',e=>{const c=e.target.getLatLng();set(c.lat,c.lng,true)});map.setView([a,b],14);if(doLookup)node._vacancyAddressLookup=lookup(Number(a).toFixed(6),Number(b).toFixed(6))};node._vacancySetLocation=set;node._vacancyClearLocation=()=>{lookupNumber++;delete form.dataset.locationLabel;if(marker){map.removeLayer(marker);marker=null}lat.value='';lon.value='';if(suggestion)suggestion.hidden=true};node._vacancyInvalidateSize=()=>map.invalidateSize();if(hasInitial)set(Number(initialLat),Number(initialLon),false);map.on('click',e=>set(e.latlng.lat,e.latlng.lng,true));setTimeout(()=>map.invalidateSize(),0)
}

function toast(message){const node=document.querySelector('#toast');node.textContent=message;node.classList.add('show');setTimeout(()=>node.classList.remove('show'),1800)}
function listingSlug(v){return [v.room?.roomType||v.room?.name||'listing',v.property?.suburb||v.property?.city,v.property?.suburb&&v.property?.city!==v.property?.suburb?v.property.city:''].filter(Boolean).join(' ').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,64).replace(/-$/,'')||'listing'}
function publicListingPath(v){return `/listings/${encodeURIComponent(v.id)}/${listingSlug(v)}`}
function openListingCard(id){const v=vacancies.find(item=>item.id===id);if(!v)return;history.pushState(null,'',publicListingPath(v));render();window.scrollTo(0,0)}
function nav(name,id=null){if(location.pathname.startsWith('/listings/')){if(name==='enquire'){history.pushState(null,'',`/#${id?`${name}/${id}`:name}`);render();window.scrollTo({top:0,left:0,behavior:'instant'});return}location.assign(`/#${id?`${name}/${id}`:name}`);return}location.hash=id?`${name}/${id}`:name}
function parseHash(){const hash=location.hash.replace('#','');if(!hash){const listing=location.pathname.match(/^\/listings\/([0-9a-f-]{36})(?:\/[^/?#]+)?\/?$/i);return listing?{name:'detail',id:listing[1]}:{name:'home',id:null}}const [name,id]=hash.split('/');return{name,id:id||null}}
function layout(content){if(parseHash().name!=='home')suspendExploreLaunch();const page=parseHash().name,back=page==='home'?'':`<button class="page-back ghost" type="button" aria-label="Go back">← <span>Back</span></button>`,footer=page==='home'?`<footer class="site-footer"><a class="footer-brand" href="#home" aria-label="Vacancy home"><img class="brand-logo" src="assets/vacancy-logo.png" alt=""></a><nav aria-label="Footer"><a href="#privacy">Privacy</a><a href="#terms">Terms</a><a href="#storage">Storage</a><a href="#safety">Safety</a></nav><span>© ${new Date().getFullYear()} Vacancy</span></footer>`:'';document.querySelector('#app').innerHTML=`${back}${content}${footer}`;document.querySelector('.page-back')?.addEventListener('click',()=>{if(history.length>1)history.back();else nav('home')});bindHeader()}
function escapeHtml(input=''){return String(input).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt',"'":'&#39;','"':'&quot;'}[c]))}
function dateLabel(value){if(!value)return'recently';return new Intl.DateTimeFormat(market().locale,{day:'numeric',month:'short'}).format(new Date(value))}
function bindHeader(){const section={detail:'home','detail-quiet':'home',lister:'home',enquire:'messages',edit:'list',auth:'account',admin:'account'}[route.name]||route.name;document.querySelectorAll('[data-nav]').forEach(b=>{b.disabled=booting;b.onclick=()=>{if(!booting)nav(b.dataset.nav)};const active=b.dataset.nav===section;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});const ms=document.querySelector('#marketSelect');if(ms){ms.disabled=booting;const currencies=[...new Map(Object.values(MARKETS).map(item=>[item.currency,item])).values()];ms.innerHTML=currencies.map(m=>`<option value="${m.currency}" ${m.currency===displayCurrency?'selected':''}>${m.currency}</option>`).join('');ms.onchange=()=>setDisplayCurrency(ms.value)}const auth=document.querySelector('#authButton');if(auth){auth.disabled=booting;auth.textContent=currentUser?'Account':'Sign in';auth.onclick=()=>{if(!booting)nav(currentUser?'account':'auth')}}}
