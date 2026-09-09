let vacancies=[], currentUser=null, saved=new Set(), route={name:'home',id:null}, booting=true;
const MARKET_PREF_KEY='vacancy-market-v1';
const CURRENCY_PREF_KEY='vacancy-currency-v1';
const MARKETS={
  KE:{code:'KE',flag:'🇰🇪',label:'Kenya',center:[-1.286389,36.817223],currency:'KES',currencyLabel:'KSh',rentPeriod:'month',distanceUnit:'km',locale:'en-KE',locationLabels:{region:'County',city:'Town / city',locality:'Estate / area',postal:'Postcode'}},
  AU:{code:'AU',flag:'🇦🇺',label:'Australia',center:[-33.8688,151.2093],currency:'AUD',currencyLabel:'A$',rentPeriod:'week',distanceUnit:'km',locale:'en-AU',locationLabels:{region:'State',city:'City',locality:'Suburb',postal:'Postcode'}},
  US:{code:'US',flag:'🇺🇸',label:'United States',center:[39.8283,-98.5795],currency:'USD',currencyLabel:'$',rentPeriod:'month',distanceUnit:'mi',locale:'en-US',locationLabels:{region:'State',city:'City',locality:'Neighbourhood',postal:'ZIP code'}},
  GB:{code:'GB',flag:'🇬🇧',label:'United Kingdom',center:[51.5072,-0.1276],currency:'GBP',currencyLabel:'£',rentPeriod:'month',distanceUnit:'mi',locale:'en-GB',locationLabels:{region:'County / region',city:'Town / city',locality:'Area',postal:'Postcode'}},
  UG:{code:'UG',flag:'🇺🇬',label:'Uganda',center:[0.3476,32.5825],currency:'UGX',currencyLabel:'USh',rentPeriod:'month',distanceUnit:'km',locale:'en-UG',locationLabels:{region:'District',city:'Town / city',locality:'Area',postal:'Postal code'}},
  TZ:{code:'TZ',flag:'🇹🇿',label:'Tanzania',center:[-6.7924,39.2083],currency:'TZS',currencyLabel:'TSh',rentPeriod:'month',distanceUnit:'km',locale:'en-TZ',locationLabels:{region:'Region',city:'Town / city',locality:'Area',postal:'Postcode'}}
 };
const MARKET_UI={
 KE:{searchHint:'Kasarani, Ruiru, near KU…',unitTypes:['Bedsitter','Studio','Single room','Shared room','1 Bedroom','2 Bedroom','3 Bedroom'],priorityFilters:['water','security','parking']},
 AU:{searchHint:'Suburb, postcode or landmark…',unitTypes:['Studio','Private room','Shared room','1 Bedroom','2 Bedroom','3 Bedroom'],priorityFilters:['furnished','parking','pets']},
 US:{searchHint:'Neighbourhood, ZIP or landmark…',unitTypes:['Studio','Private room','Shared room','1 Bedroom','2 Bedroom','3 Bedroom'],priorityFilters:['parking','pets','furnished']},
 GB:{searchHint:'Town, postcode or area…',unitTypes:['Studio','Room','Shared room','1 Bedroom','2 Bedroom','3 Bedroom'],priorityFilters:['furnished','pets','internet']},
 UG:{searchHint:'Kampala area, district or landmark…',unitTypes:['Single room','Studio','1 Bedroom','2 Bedroom','3 Bedroom'],priorityFilters:['water','security','parking']},
 TZ:{searchHint:'Dar area, region or landmark…',unitTypes:['Single room','Studio','1 Bedroom','2 Bedroom','3 Bedroom'],priorityFilters:['water','security','parking']}
};
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
function currencyMeta(code=displayCurrency){return Object.values(MARKETS).find(x=>x.currency===code)||market()}
async function setDisplayCurrency(code){if(!Object.values(MARKETS).some(m=>m.currency===code))return;const previous=displayCurrency;if(code!==market().currency&&!fxRates){try{const response=await fetch('/api/exchange-rates'),data=await response.json();if(!response.ok)throw new Error(data.error);fxRates=data.rates}catch(error){toast(error.message||'Currency conversion is temporarily unavailable');displayCurrency=previous;bindHeader();return}}displayCurrency=code;localStorage.setItem(CURRENCY_PREF_KEY,code);render()}
function marketForCountry(country=''){const c=String(country).toLowerCase();if(c.includes('kenya'))return MARKETS.KE;if(c.includes('australia'))return MARKETS.AU;if(c.includes('united states')||c==='usa'||c==='us')return MARKETS.US;if(c.includes('united kingdom')||c==='uk')return MARKETS.GB;if(c.includes('uganda'))return MARKETS.UG;if(c.includes('tanzania'))return MARKETS.TZ;return market()}
function convertAmount(amount,from,to=displayCurrency){const value=Number(amount);if(from===to)return value;if(!fxRates?.[from]||!fxRates?.[to])return null;return value/fxRates[from]*fxRates[to]}
function displayAmount(amount,from){const converted=convertAmount(amount,from),meta=currencyMeta(converted==null?from:displayCurrency),rounded=Math.round(converted==null?Number(amount):converted);return{value:rounded,code:meta.currency,label:meta.currencyLabel,locale:meta.locale,converted:converted!=null&&from!==displayCurrency}}
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
let exploreMap=null,exploreMarkers=new Map(),exploreRadiusCircle=null,exploreSelectedId=null,suppressMapMove=false,suppressRailSync=false,railTimer=null;
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
  meta.textContent=`${v.property.suburb} · ${formatListingPrice(v)} · Available ${dateLabel(v.availableFrom)}`;
  content.append(title,meta);
  return content;
}
function initExploreMap(){
  const node=document.querySelector('#exploreMap'); if(!node||typeof L==='undefined')return;
  if(exploreMap){exploreMap.remove();exploreMap=null;exploreMarkers.clear()}
  const start=searchCenter?[searchCenter.lat,searchCenter.lon]:market().center;
  exploreMap=L.map(node,{zoomControl:false}).setView(start,searchCenter?12:marketCode==='US'?4:11);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(exploreMap);
  exploreMap.on('movestart',()=>{if(!suppressMapMove){const b=document.querySelector('#searchArea');if(b)b.hidden=true}});
  exploreMap.on('moveend',()=>{if(!suppressMapMove){const b=document.querySelector('#searchArea');if(b)b.hidden=false}else suppressMapMove=false});
  document.querySelector('#searchArea').onclick=()=>{const c=exploreMap.getCenter();searchCenter={lat:c.lat,lon:c.lng};searchCenterKind='map';mapSearchQuery=document.querySelector('#q')?.value.trim().toLowerCase()||'';document.querySelector('#searchArea').hidden=true;syncRadiusUI();if(typeof showUserLocationMarker==='function')showUserLocationMarker();applySearch()};
}
function updateMapRadius(){if(!exploreMap)return;if(exploreRadiusCircle){exploreRadiusCircle.remove();exploreRadiusCircle=null}if(searchCenter){exploreRadiusCircle=L.circle([searchCenter.lat,searchCenter.lon],{radius:radiusKm()*1000,color:'#d7a400',weight:1,fillColor:'#f6c945',fillOpacity:.08}).addTo(exploreMap)}}
function bindExploreMarkerElement(marker,id){
  const el=marker.getElement();
  if(!el)return;
  const listing=vacancies.find(v=>v.id===id);
  el.dataset.vacancyId=id;
  el.setAttribute('role','button');
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
  const points=[];
  for(const v of rows){
    const lat=v.property.publicLatitude,lon=v.property.publicLongitude;
    if(lat==null||lon==null)continue;
    points.push([lat,lon]);
    const marker=L.marker([lat,lon],{icon:pinIcon(v,v.id===exploreSelectedId),keyboard:true,title:`${v.room.name}, ${markerPrice(v)}`}).addTo(exploreMap);
    marker.bindTooltip(markerTooltip(v),{direction:'top',offset:[0,-32],className:'vacancy-map-tooltip',opacity:1});
    marker.on('click',()=>selectExplore(v.id,true));
    bindExploreMarkerElement(marker,v.id);
    exploreMarkers.set(v.id,marker);
  }
  updateMapRadius();
  if(!searchCenter&&points.length>1){
    const bounds=L.latLngBounds(points);
    exploreMap.fitBounds(bounds,{padding:[48,48],maxZoom:13,animate:false});
  }
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
 const node=document.querySelector(`#${mapId}`);if(!node||typeof L==='undefined')return;const form=node.closest('form'),lat=form.querySelector(`[name="${latName}"]`),lon=form.querySelector(`[name="${lonName}"]`);const reverseGeocode=options.reverseGeocode||mapId==='newPropertyMap';if(reverseGeocode&&!form.querySelector('[data-address-status]')){node.nextElementSibling?.classList.contains('map-help')&&node.nextElementSibling.remove();node.insertAdjacentHTML('afterend','<div data-address-status class="map-status sr-only" role="status" aria-live="polite">Choose a point to look up its address.</div><div data-address-suggestion class="address-suggestion" hidden></div>')}const hasInitial=initialLat!==''&&initialLon!=='';const start=hasInitial?[Number(initialLat),Number(initialLon)]:market().center;const map=L.map(node,{zoomControl:false}).setView(start,hasInitial?14:11);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);let marker=null,lookupNumber=0;const suggestion=form.querySelector('[data-address-suggestion]'),status=form.querySelector('[data-address-status]');
 const showSuggestion=data=>{if(!suggestion)return;suggestion.hidden=false;suggestion.innerHTML=`<div><strong>Address found</strong><div>${escapeHtml(data.formattedAddress||'Location details found')}</div></div><div class="row"><button type="button" class="primary" data-use-address>Use this location</button><button type="button" class="ghost" data-dismiss-address>Keep my entries</button></div>`;suggestion.querySelector('[data-use-address]').onclick=()=>{const values={region:data.region,city:data.city,locality:data.locality,landmark:data.landmark,postal:data.postal,address:data.address};for(const [name,value] of Object.entries(values)){const field=form.elements[name];if(field&&value)field.value=value}suggestion.hidden=true;if(status)status.textContent='Location added. You can edit every field.';form.dispatchEvent(new CustomEvent('vacancy:location-used',{detail:{address:data.formattedAddress||data.address||''}}))};suggestion.querySelector('[data-dismiss-address]').onclick=()=>{suggestion.hidden=true;if(status)status.textContent='Your current address entries were kept.'}};
 const lookup=async(a,b)=>{if(!reverseGeocode)return;const mine=++lookupNumber;if(status)status.textContent='Looking up this location…';if(suggestion)suggestion.hidden=true;try{const response=await fetch(`/api/reverse-geocode?lat=${encodeURIComponent(a)}&lon=${encodeURIComponent(b)}`),data=await response.json();if(mine!==lookupNumber)return;if(!response.ok)throw new Error(data.error||'Address lookup failed');showSuggestion(data);if(status)status.textContent='Review the suggested address before using it.'}catch(error){if(mine!==lookupNumber)return;if(status)status.textContent=error.message||'Address lookup failed. Enter the address manually.'}};
 const set=(a,b,doLookup=true)=>{lat.value=Number(a).toFixed(3);lon.value=Number(b).toFixed(3);if(marker)marker.setLatLng([a,b]);else marker=L.marker([a,b],{draggable:true}).addTo(map);marker.off('dragend');marker.on('dragend',e=>{const c=e.target.getLatLng();set(c.lat,c.lng,true)});map.setView([a,b],14);if(doLookup)lookup(Number(a).toFixed(6),Number(b).toFixed(6))};node._vacancySetLocation=set;if(hasInitial)set(Number(initialLat),Number(initialLon),false);map.on('click',e=>set(e.latlng.lat,e.latlng.lng,true));setTimeout(()=>map.invalidateSize(),0)
}

function toast(message){const node=document.querySelector('#toast');node.textContent=message;node.classList.add('show');setTimeout(()=>node.classList.remove('show'),1800)}
function nav(name,id=null){location.hash=id?`${name}/${id}`:name}
function parseHash(){const hash=location.hash.replace('#','');if(!hash)return{name:'home',id:null};const [name,id]=hash.split('/');return{name,id:id||null}}
function layout(content){const page=parseHash().name,back=page==='home'?'':`<button class="page-back ghost" type="button" aria-label="Go back">← <span>Back</span></button>`;document.querySelector('#app').innerHTML=`${back}${content}<footer class="site-footer"><a class="footer-brand" href="#home" aria-label="Vacancy home">vacancy<span>.</span></a><nav aria-label="Footer"><a href="#privacy">Privacy</a><a href="#terms">Terms</a><a href="#storage">Storage</a><a href="#safety">Safety</a></nav><span>© ${new Date().getFullYear()} Vacancy</span></footer>`;document.querySelector('.page-back')?.addEventListener('click',()=>{if(history.length>1)history.back();else nav('home')});bindHeader()}
function escapeHtml(input=''){return String(input).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt',"'":'&#39;','"':'&quot;'}[c]))}
function dateLabel(value){if(!value)return'recently';return new Intl.DateTimeFormat(market().locale,{day:'numeric',month:'short'}).format(new Date(value))}
function bindHeader(){document.querySelectorAll('[data-nav]').forEach(b=>{b.disabled=booting;b.onclick=()=>{if(!booting)nav(b.dataset.nav)};b.classList.toggle('active',b.dataset.nav===route.name||(route.name==='auth'&&b.dataset.nav==='account'))});const ms=document.querySelector('#marketSelect');if(ms){ms.disabled=booting;ms.innerHTML=Object.values(MARKETS).map(m=>`<option value="${m.currency}" ${m.currency===displayCurrency?'selected':''}>${m.currency}</option>`).join('');ms.onchange=()=>setDisplayCurrency(ms.value)}const auth=document.querySelector('#authButton');if(auth){auth.disabled=booting;auth.textContent=currentUser?'Account':'Sign in';auth.onclick=()=>{if(!booting)nav(currentUser?'account':'auth')}}}
