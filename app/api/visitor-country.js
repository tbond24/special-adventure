module.exports=function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const country=String(req.headers['x-vercel-ip-country']||'').toUpperCase();
  const lat=Number(req.headers['x-vercel-ip-latitude']);
  const lon=Number(req.headers['x-vercel-ip-longitude']);
  res.setHeader('Cache-Control','private, no-store');
  return res.status(200).json({
    country:/^[A-Z]{2}$/.test(country)?country:null,
    latitude:Number.isFinite(lat)&&lat>=-90&&lat<=90?lat:null,
    longitude:Number.isFinite(lon)&&lon>=-180&&lon<=180?lon:null
  });
};
