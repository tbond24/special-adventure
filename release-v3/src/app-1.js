let vacancies=[], currentUser=null, saved=new Set(), route={name:'home',id:null};
const MARKET_PREF_KEY='vacancy-market-v1';
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
function setMarket(code){if(!MARKETS[code])return;marketCode=code;localStorage.setItem(MARKET_PREF_KEY,code);searchCenter=null;exploreSelectedId=null;render()}
function marketForCountry(country=''){const c=String(country).toLowerCase();if(c.includes('kenya'))return MARKETS.KE;if(c.includes('australia'))return MARKETS.AU;if(c.includes('united states')||c==='usa'||c==='us')return MARKETS.US;if(c.includes('united kingdom')||c==='uk')return MARKETS.GB;if(c.includes('uganda'))return MARKETS.UG;if(c.includes('tanzania'))return MARKETS.TZ;return market()}
function formatListingPrice(v){const m=Object.values(MARKETS).find(x=>x.currency===v.rentCurrency)||marketForCountry(v.property?.country);const symbol=m?.currencyLabel||v.rentCurrency;return `${symbol} ${Number(v.rentAmount??v.monthlyRent).toLocaleString(m?.locale||'en')}/${v.rentPeriod||m?.rentPeriod||'month'}`}
const SEARCH_RADIUS_KEY='vacancy-radius-v1';
let searchCenter=null;
let radiusValue=Number(localStorage.getItem(SEARCH_RADIUS_KEY)||10);
function radiusKm(){return market().distanceUnit==='mi'?radiusValue*1.609344:radiusValue}
function haversineKm(lat1,lon1,lat2,lon2){const R=6371,toRad=x=>x*Math.PI/180,dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1);const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(a))}
function distanceTo(v){const lat=v.property?.publicLatitude,lon=v.property?.publicLongitude;if(searchCenter==null||lat==null||lon==null)return null;return haversineKm(searchCenter.lat,searchCenter.lon,lat,lon)}
function useMyLocation(){if(!navigator.geolocation){toast('Location is not supported in this browser');return}navigator.geolocation.getCurrentPosition(pos=>{searchCenter={lat:pos.coords.latitude,lon:pos.coords.longitude};toast('Searching around your location');applySearch()},()=>toast('Location permission was not granted'),{enableHighAccuracy:false,timeout:8000,maximumAge:300000})}
let exploreMap=null,exploreMarkers=new Map(),exploreRadiusCircle=null,exploreSelectedId=null,suppressMapMove=false,railTimer=null;
function pinIcon(selected=false){return L.divIcon({className:'',html:`<div class="map-pin ${selected?'selected':''}"><div class="map-pin-count">•</div></div>`,iconSize:[28,28],iconAnchor:[14,28]})}
function initExploreMap(){
  const node=document.querySelector('#exploreMap'); if(!node||typeof L==='undefined')return;
  if(exploreMap){exploreMap.remove();exploreMap=null;exploreMarkers.clear()}
  const start=searchCenter?[searchCenter.lat,searchCenter.lon]:market().center;
  exploreMap=L.map(node,{zoomControl:true}).setView(start,searchCenter?12:marketCode==='US'?4:11);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(exploreMap);
  exploreMap.on('movestart',()=>{if(!suppressMapMove){const b=document.querySelector('#searchArea');if(b)b.hidden=true}});
  exploreMap.on('moveend',()=>{if(!suppressMapMove){const b=document.querySelector('#searchArea');if(b)b.hidden=false}else suppressMapMove=false});
  document.querySelector('#searchArea').onclick=()=>{const c=exploreMap.getCenter();searchCenter={lat:c.lat,lon:c.lng};document.querySelector('#searchArea').hidden=true;applySearch()};
}
function updateMapRadius(){if(!exploreMap)return;if(exploreRadiusCircle){exploreRadiusCircle.remove();exploreRadiusCircle=null}if(searchCenter){exploreRadiusCircle=L.circle([searchCenter.lat,searchCenter.lon],{radius:radiusKm()*1000,color:'#d7a400',weight:1,fillColor:'#f6c945',fillOpacity:.08}).addTo(exploreMap)}}
function updateExploreMarkers(rows){if(!exploreMap)return;for(const marker of exploreMarkers.values())marker.remove();exploreMarkers.clear();for(const v of rows){const lat=v.property.publicLatitude,lon=v.property.publicLongitude;if(lat==null||lon==null)continue;const marker=L.marker([lat,lon],{icon:pinIcon(v.id===exploreSelectedId)}).addTo(exploreMap);marker.on('click',()=>selectExplore(v.id,true));exploreMarkers.set(v.id,marker)}updateMapRadius()}
function selectExplore(id,fromMap=false){exploreSelectedId=id;document.querySelectorAll('[data-card-id]').forEach(c=>c.classList.toggle('selected',c.dataset.cardId===id));for(const [mid,m] of exploreMarkers)m.setIcon(pinIcon(mid===id));if(fromMap){const card=document.querySelector(`[data-card-id="${id}"]`);card?.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'})}}
function bindCardRail(){const rail=document.querySelector('#cards');if(!rail)return;rail.addEventListener('scroll',()=>{clearTimeout(railTimer);railTimer=setTimeout(()=>{const cards=[...rail.querySelectorAll('[data-card-id]')];if(!cards.length)return;const centre=rail.getBoundingClientRect().left+rail.clientWidth/2;cards.sort((a,b)=>Math.abs((a.getBoundingClientRect().left+a.offsetWidth/2)-centre)-Math.abs((b.getBoundingClientRect().left+b.offsetWidth/2)-centre));selectExplore(cards[0].dataset.cardId,false)},80)},{passive:true})}
function initListingMapPicker(mapId,latName,lonName,initialLat='',initialLon=''){
 const node=document.querySelector(`#${mapId}`);if(!node||typeof L==='undefined')return;const form=node.closest('form'),lat=form.querySelector(`[name="${latName}"]`),lon=form.querySelector(`[name="${lonName}"]`);const hasInitial=initialLat!==''&&initialLon!=='';const start=hasInitial?[Number(initialLat),Number(initialLon)]:market().center;const map=L.map(node,{zoomControl:true}).setView(start,hasInitial?14:11);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);let marker=null;const set=(a,b)=>{lat.value=Number(a).toFixed(6);lon.value=Number(b).toFixed(6);if(marker)marker.setLatLng([a,b]);else marker=L.marker([a,b],{draggable:true}).addTo(map);marker.off('dragend');marker.on('dragend',e=>{const c=e.target.getLatLng();set(c.lat,c.lng)})};if(hasInitial)set(Number(initialLat),Number(initialLon));map.on('click',e=>set(e.latlng.lat,e.latlng.lng));setTimeout(()=>map.invalidateSize(),0)
}

function toast(message){const node=document.querySelector('#toast');node.textContent=message;node.classList.add('show');setTimeout(()=>node.classList.remove('show'),1800)}
function nav(name,id=null){location.hash=id?`${name}/${id}`:name}
function parseHash(){const hash=location.hash.replace('#','');if(!hash)return{name:'home',id:null};const [name,id]=hash.split('/');return{name,id:id||null}}
function layout(content){document.querySelector('#app').innerHTML=content;bindHeader()}
function escapeHtml(input=''){return String(input).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function dateLabel(value){if(!value)return'recently';return new Intl.DateTimeFormat(market().locale,{day:'numeric',month:'short'}).format(new Date(value))}
function bindHeader(){document.querySelectorAll('[data-nav]').forEach(b=>{b.onclick=()=>nav(b.dataset.nav);b.classList.toggle('active',b.dataset.nav===route.name||(route.name==='auth'&&b.dataset.nav==='account'))});const ms=document.querySelector('#marketSelect');if(ms){ms.innerHTML=Object.values(MARKETS).map(m=>`<option value="${m.code}" ${m.code===marketCode?'selected':''}>${m.flag} ${m.currency}</option>`).join('');ms.onchange=()=>setMarket(ms.value)}const auth=document.querySelector('#authButton');if(auth){auth.disabled=false;auth.textContent=currentUser?'Account':'Sign in';auth.onclick=()=>nav(currentUser?'account':'auth')}}
