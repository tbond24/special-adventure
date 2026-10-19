// Temporary test-only actor broker. No arbitrary recipients, SQL or returned service authority.
const ROOT='https://raauicmfyjpcuhfzknak.supabase.co',RECIPIENT=__RECIPIENT_JSON__;
const DIGEST='__NONCE_HASH__',EXPIRES='__EXPIRES__',SCOPE='__RUN__';
const reply=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async req=>{
 if(Deno.env.get('SUPABASE_URL')!==ROOT||Date.now()>=Date.parse(EXPIRES))return reply(410,{error:'Closed'});
 if(req.method!=='POST'||req.headers.has('origin'))return reply(403,{error:'Denied'});
 const nonce=req.headers.get('x-qa-window')||'';
 if(!/^[a-f0-9]{64}$/.test(nonce))return reply(401,{error:'Denied'});
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(nonce))),x=>x.toString(16).padStart(2,'0')).join('');
 if(hash!==DIGEST)return reply(401,{error:'Denied'});
 try{
  const body=await req.json(),headers={apikey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,Authorization:'Bearer '+Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),'Content-Type':'application/json'};
  if(body.action==='create'){
   if(!/^[A-Za-z0-9_-]{40,100}$/.test(body.password))return reply(400,{error:'Invalid password'});
   const r=await fetch(ROOT+'/auth/v1/admin/users',{method:'POST',headers,body:JSON.stringify({email:RECIPIENT,password:body.password,email_confirm:true,app_metadata:{vacancy_managed_mail_scope:SCOPE}})});
   const u=await r.json();if(!r.ok||!u.id)return reply(502,{error:'Synthetic provisioning failed'});
   return reply(200,{id:u.id,email:RECIPIENT,key:Deno.env.get('SUPABASE_ANON_KEY')});
  }
  if(!['delete','recovery'].includes(body.action)||!/^[a-f0-9-]{36}$/.test(body.id))return reply(400,{error:'Unsupported'});
  const r=await fetch(ROOT+'/auth/v1/admin/users/'+body.id,{headers}),u=await r.json();
  if(!r.ok||u.app_metadata?.vacancy_managed_mail_scope!==SCOPE||u.email!==RECIPIENT)return reply(403,{error:'Fixture mismatch'});
  if(body.action==='recovery'){
   // Separate expired-token check only; no email is sent by generate_link.
   const generated=await fetch(ROOT+'/auth/v1/admin/generate_link',{method:'POST',headers,body:JSON.stringify({type:'recovery',email:RECIPIENT})});
   const link=await generated.json();return generated.ok&&link.hashed_token?reply(200,{token_hash:link.hashed_token}):reply(502,{error:'Recovery fixture failed'});
  }
  const removed=await fetch(ROOT+'/auth/v1/admin/users/'+body.id,{method:'DELETE',headers});
  return reply(removed.ok?200:502,{deleted:removed.ok});
 }catch{return reply(500,{error:'Test broker failed'});}
});
