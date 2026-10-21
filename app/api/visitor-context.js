// Coarse edge geography only. No IP address, coordinates or location permission.
module.exports=function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const country=String(req.headers['x-vercel-ip-country']||'').toUpperCase();let city='';
 try{city=decodeURIComponent(String(req.headers['x-vercel-ip-city']||''))}catch{}
 city=city.replace(/[\x00-\x1f\x7f]/g,'').trim().slice(0,80);
 return res.status(200).json({country:/^[A-Z]{2}$/.test(country)?country:null,city:city||null,approximate:true});
};
