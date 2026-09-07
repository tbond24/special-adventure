const cache=new Map();
let lastProviderRequest=0;

function clean(value){return typeof value==='string'?value.trim():''}
function first(address,names){for(const name of names){const value=clean(address?.[name]);if(value)return value}return''}

module.exports=async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const lat=Number(req.query.lat),lon=Number(req.query.lon);
  if(!Number.isFinite(lat)||lat < -90||lat > 90||!Number.isFinite(lon)||lon < -180||lon > 180)return res.status(400).json({error:'Choose a valid map location'});
  const key=`${lat.toFixed(5)},${lon.toFixed(5)}`,cached=cache.get(key);
  if(cached){res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');return res.status(200).json(cached)}
  const wait=Math.max(0,1050-(Date.now()-lastProviderRequest));
  if(wait)await new Promise(resolve=>setTimeout(resolve,wait));
  lastProviderRequest=Date.now();
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),7000);
  try{
    const url=new URL('https://nominatim.openstreetmap.org/reverse');
    url.search=new URLSearchParams({format:'jsonv2',lat:String(lat),lon:String(lon),addressdetails:'1',zoom:'18'}).toString();
    const response=await fetch(url,{signal:controller.signal,headers:{'User-Agent':'Vacancy/1.0 (https://getvacancy.site)','Accept-Language':'en'}});
    if(!response.ok)throw new Error(`Provider returned ${response.status}`);
    const raw=await response.json(),address=raw.address||{},road=first(address,['road','pedestrian','residential','footway']),number=first(address,['house_number']),landmark=first(address,['amenity','building','shop','tourism','railway']);
    const result={formattedAddress:clean(raw.display_name),address:[number,road].filter(Boolean).join(' ')||landmark,landmark,locality:first(address,['suburb','neighbourhood','quarter','city_district','borough','hamlet']),city:first(address,['city','town','village','municipality']),region:first(address,['state','county','state_district','region']),postal:first(address,['postcode']),country:first(address,['country']),countryCode:clean(address.country_code).toUpperCase()};
    cache.set(key,result);if(cache.size>500)cache.delete(cache.keys().next().value);
    res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');return res.status(200).json(result);
  }catch(error){return res.status(error.name==='AbortError'?504:502).json({error:'Address lookup is temporarily unavailable. You can still enter the address manually.'})}
  finally{clearTimeout(timeout)}
}
