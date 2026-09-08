const cache=new Map();
let lastProviderRequest=0;

module.exports=async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const query=String(req.query.q||'').trim();
  if(query.length<2||query.length>160)return res.status(400).json({error:'Enter at least 2 characters to search'});
  const key=query.toLocaleLowerCase('en'),cached=cache.get(key);
  if(cached){res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');return res.status(200).json(cached)}
  const wait=Math.max(0,1050-(Date.now()-lastProviderRequest));
  if(wait)await new Promise(resolve=>setTimeout(resolve,wait));
  lastProviderRequest=Date.now();
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),7000);
  try{
    const url=new URL('https://nominatim.openstreetmap.org/search');
    url.search=new URLSearchParams({format:'jsonv2',q:query,limit:'1',addressdetails:'1'}).toString();
    const response=await fetch(url,{signal:controller.signal,headers:{'User-Agent':'Vacancy/1.0 (https://getvacancy.site)','Accept-Language':'en'}});
    if(!response.ok)throw new Error(`Provider returned ${response.status}`);
    const [place]=await response.json();
    if(!place)return res.status(404).json({error:'We could not find that place. Try a town, suburb or postcode.'});
    const lat=Number(place.lat),lon=Number(place.lon);
    if(!Number.isFinite(lat)||!Number.isFinite(lon))throw new Error('Provider returned an invalid location');
    const result={lat,lon,label:String(place.display_name||query)};
    cache.set(key,result);if(cache.size>500)cache.delete(cache.keys().next().value);
    res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');return res.status(200).json(result);
  }catch(error){return res.status(error.name==='AbortError'?504:502).json({error:'Map search is temporarily unavailable. You can still move the map and search this area.'})}
  finally{clearTimeout(timeout)}
}
