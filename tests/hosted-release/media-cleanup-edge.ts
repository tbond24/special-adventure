// Render only after matching every object against this run's captured manifests.
// Fixed allowlist, fixed project, expiring nonce; never an arbitrary Storage proxy.
const ROOT='https://raauicmfyjpcuhfzknak.supabase.co';
const DIGEST='__NONCE_HASH__',EXPIRES='__EXPIRES__';
const OBJECTS: Array<{bucket_id:string,name:string}>=__OBJECTS__;
const reply=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async req=>{
 if(Deno.env.get('SUPABASE_URL')!==ROOT||Date.now()>=Date.parse(EXPIRES)||!/^[a-f0-9]{64}$/.test(DIGEST))return reply(410,{error:'Closed'});
 if(req.method!=='POST'||req.headers.has('origin'))return reply(403,{error:'Denied'});
 const nonce=req.headers.get('x-qa-window')||'';
 if(!/^[a-f0-9]{64}$/.test(nonce))return reply(401,{error:'Denied'});
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(nonce))),x=>x.toString(16).padStart(2,'0')).join('');
 if(hash!==DIGEST)return reply(401,{error:'Denied'});
 if(!OBJECTS.length||OBJECTS.length>10||OBJECTS.some(x=>x.bucket_id!=='listing-draft-media'||x.name.includes('..')||!/^[-a-f0-9]{36}\//.test(x.name)))return reply(403,{error:'Manifest rejected'});
 try{
  const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const r=await fetch(ROOT+'/storage/v1/object/listing-draft-media',{method:'DELETE',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({prefixes:OBJECTS.map(x=>x.name)})});
  const data=await r.json();if(!r.ok||!Array.isArray(data))return reply(502,{error:'Cleanup failed'});
  return reply(200,{deletedCount:data.length,expectedCount:OBJECTS.length});
 }catch{return reply(500,{error:'Cleanup failed'});}
});
