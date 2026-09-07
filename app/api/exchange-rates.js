let cached=null,cachedAt=0;
const SUPPORTED=['KES','AUD','USD','GBP','UGX','TZS'];

module.exports=async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  if(cached&&Date.now()-cachedAt<12*60*60*1000){res.setHeader('Cache-Control','public, s-maxage=43200, stale-while-revalidate=86400');return res.status(200).json(cached)}
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),7000);
  try{
    const response=await fetch(`https://api.frankfurter.dev/v2/rates?base=USD&quotes=${SUPPORTED.join(',')}`,{signal:controller.signal,headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error(`Provider returned ${response.status}`);
    const rows=await response.json(),rates={USD:1};
    for(const row of rows)if(SUPPORTED.includes(row.quote)&&Number.isFinite(Number(row.rate)))rates[row.quote]=Number(row.rate);
    if(SUPPORTED.some(code=>!rates[code]))throw new Error('Incomplete currency coverage');
    cached={base:'USD',date:rows[0]?.date||'',rates};cachedAt=Date.now();
    res.setHeader('Cache-Control','public, s-maxage=43200, stale-while-revalidate=86400');return res.status(200).json(cached);
  }catch{return res.status(502).json({error:'Currency conversion is temporarily unavailable. Prices remain in their listed currency.'})}
  finally{clearTimeout(timeout)}
}
