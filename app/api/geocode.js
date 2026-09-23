const cache=new Map();
let lastProviderRequest=0;

const PLACE_ADDRESS_TYPES=new Set(['city','town','village','municipality','suburb','neighbourhood','quarter','borough','county','state','province','region','postcode','country']);

function normalized(value){
  return String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}

function relevantPlace(place,query){
  const words=normalized(`${place?.name||''} ${place?.display_name||''} ${Object.values(place?.address||{}).join(' ')}`).split(' ').filter(Boolean);
  return normalized(query).split(' ').filter(Boolean).every(token=>words.some(word=>word===token||word.startsWith(token)));
}

function isSearchablePlace(place){
  const type=String(place?.addresstype||place?.type||'').toLowerCase();
  return PLACE_ADDRESS_TYPES.has(type)||place?.class==='place'||(place?.class==='boundary'&&place?.type==='administrative');
}

function compactLabel(place,fallback){
  const address=place?.address||{};
  const named=place?.name||address.suburb||address.neighbourhood||address.city_district||address.city||address.town||address.village||address.municipality;
  const locality=address.city||address.town||address.village||address.municipality||address.county;
  const parts=[named,locality,address.country,address.postcode]
    .map(value=>String(value||'').trim())
    .filter((value,index,items)=>value&&items.findIndex(item=>item.toLowerCase()===value.toLowerCase())===index);
  if(parts.length)return parts.join(', ');
  return String(place?.display_name||fallback).split(',').map(value=>value.trim()).filter(Boolean).slice(0,4).join(', ');
}

function compactSuggestions(places,query){
  const seen=new Set();
  return places
    .filter(place=>isSearchablePlace(place)&&relevantPlace(place,query))
    .map(place=>({lat:Number(place.lat),lon:Number(place.lon),label:compactLabel(place,query)}))
    .filter(place=>{
      if(!Number.isFinite(place.lat)||!Number.isFinite(place.lon))return false;
      const key=normalized(place.label);
      if(!key||seen.has(key))return false;
      seen.add(key);
      return true;
    })
    .slice(0,4);
}

module.exports=async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const query=String(req.query.q||'').trim();
  const suggestions=req.query.suggest==='1';
  if(query.length<2||query.length>160)return res.status(400).json({error:'Enter at least 2 characters to search'});
  const key=(suggestions?'suggest:':'place:')+query.toLocaleLowerCase('en'),cached=cache.get(key);
  if(cached){res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');return res.status(200).json(cached)}
  const wait=Math.max(0,1050-(Date.now()-lastProviderRequest));
  if(wait)await new Promise(resolve=>setTimeout(resolve,wait));
  lastProviderRequest=Date.now();
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),7000);
  try{
    const url=new URL('https://nominatim.openstreetmap.org/search');
    url.search=new URLSearchParams({format:'jsonv2',q:query,limit:suggestions?'10':'1',addressdetails:'1'}).toString();
    const response=await fetch(url,{signal:controller.signal,headers:{'User-Agent':'Vacancy/1.0 (https://getvacancy.site)','Accept-Language':'en'}});
    if(!response.ok)throw new Error(`Provider returned ${response.status}`);
    const places=await response.json();
    if(suggestions){
      const result={suggestions:compactSuggestions(places,query)};
      cache.set(key,result);if(cache.size>500)cache.delete(cache.keys().next().value);
      res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');return res.status(200).json(result);
    }
    const [place]=places;
    if(!place)return res.status(404).json({error:'We could not find that place. Try a town, suburb or postcode.'});
    const lat=Number(place.lat),lon=Number(place.lon);
    if(!Number.isFinite(lat)||!Number.isFinite(lon))throw new Error('Provider returned an invalid location');
    const result={lat,lon,label:compactLabel(place,query)};
    cache.set(key,result);if(cache.size>500)cache.delete(cache.keys().next().value);
    res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');return res.status(200).json(result);
  }catch(error){return res.status(error.name==='AbortError'?504:502).json({error:'Map search is temporarily unavailable. You can still move the map and search this area.'})}
  finally{clearTimeout(timeout)}
}