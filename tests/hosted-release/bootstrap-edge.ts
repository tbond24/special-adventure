// Temporary bounded test authority; no logging, SQL execution, or returned service key.
const ROOT='https://raauicmfyjpcuhfzknak.supabase.co';
const DIGEST='__NONCE_HASH__',EXPIRES='__EXPIRES__',SCOPE='__RUN__';
const roles=['owner','operator','viewer','suspended','lister','renter','pilot1','pilot2','pilot3'];
const reply=(status:number,value:unknown)=>new Response(JSON.stringify(value),{
  status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async req=>{
  if(Deno.env.get('SUPABASE_URL')!==ROOT||!/^[a-f0-9]{64}$/.test(DIGEST)||Date.now()>=Date.parse(EXPIRES))return reply(410,{error:'Closed'});
  if(req.method!=='POST'||req.headers.has('origin'))return reply(403,{error:'Denied'});
  const nonce=req.headers.get('x-qa-window')||'';
  if(!/^[a-f0-9]{64}$/.test(nonce))return reply(401,{error:'Denied'});
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(nonce))),x=>x.toString(16).padStart(2,'0')).join('');
  if(digest!==DIGEST)return reply(401,{error:'Denied'});
  try{
    const body=await req.json(),role=body.role;
    const headers={apikey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,Authorization:'Bearer '+Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),'Content-Type':'application/json'};
    const fixture=async(phase:string)=>{
      const r=await fetch(ROOT+'/rest/v1/rpc/qa_hosted_ci_fixture',{method:'POST',headers,body:JSON.stringify({p_action:phase})});
      if(!r.ok)throw Error('Fixture command failed');return r.json();
    };
    await fixture('check');
    if(body.action==='fixture'){
      if(!['seed','admin-seed','audit-failure-on','audit-failure-off','media-cleanup','cleanup','admin-cleanup','check','close'].includes(body.phase))return reply(400,{error:'Unknown phase'});
      if(['media-cleanup','cleanup','admin-cleanup'].includes(body.phase)){
        const media=await fixture('media-manifest');
        // Private immutable draft assets cannot be removed by browser policy.
        for(const bucket of ['listing-draft-media',...(['cleanup','admin-cleanup'].includes(body.phase)?['room-media']:[])]){
          const names=media.filter((m:{bucket_id:string})=>m.bucket_id===bucket).map((m:{name:string})=>m.name);
          if(names.length){const r=await fetch(ROOT+'/storage/v1/object/'+bucket,{method:'DELETE',headers,body:JSON.stringify({prefixes:names})});if(!r.ok||(await r.json()).length!==names.length)throw Error('Physical cleanup failed');}
        }
        if(body.phase==='media-cleanup')return reply(200,media.filter((m:{bucket_id:string})=>m.bucket_id==='room-media'));
      }
      const result=await fixture(body.phase);
      if(['cleanup','admin-cleanup'].includes(body.phase)){
        for(const id of result.actors){const r=await fetch(ROOT+'/auth/v1/admin/users/'+id,{method:'DELETE',headers});if(!r.ok)throw Error('Auth cleanup failed');}
        const final=await fixture('check');if(final.actors.length||!final.restored)throw Error('Cleanup verification failed');
        return reply(200,{clean:true,preservation:final.preservation,sourceCount:final.sourceCount});
      }
      return reply(200,{...result,actors:undefined,actorCount:result.actors.length});
    }
    if(!roles.includes(role))return reply(400,{error:'Unknown actor'});
    if(body.action==='create'){
      if(typeof body.password!=='string'||!/^[A-Za-z0-9_-]{40,100}$/.test(body.password))return reply(400,{error:'Invalid password'});
      const res=await fetch(ROOT+'/auth/v1/admin/users',{method:'POST',headers,body:JSON.stringify({
        email:`${SCOPE}-${role}@example.test`,password:body.password,email_confirm:true,
        app_metadata:{vacancy_hosted_scope:SCOPE,vacancy_hosted_role:role,
          ...(['owner','operator','viewer','suspended'].includes(role)?{vacancy_qa_scope:SCOPE}:{})}})});
      const user=await res.json();
      if(!res.ok||!user.id)return reply(502,{error:'Provisioning failed',status:res.status});
      return reply(200,{id:user.id,email:user.email,key:Deno.env.get('SUPABASE_ANON_KEY')});
    }
    if(!/^[a-f0-9-]{36}$/.test(body.id))return reply(400,{error:'Invalid actor'});
    const res=await fetch(ROOT+'/auth/v1/admin/users/'+body.id,{headers}),user=await res.json();
    if(!res.ok||user.app_metadata?.vacancy_hosted_scope!==SCOPE||user.app_metadata?.vacancy_hosted_role!==role)return reply(403,{error:'Fixture mismatch'});
    if(body.action==='recovery'&&role==='renter'){
      // No SMTP, existing account reset or arbitrary recipient/redirect is accepted.
      const link=await fetch(ROOT+'/auth/v1/admin/generate_link',{method:'POST',headers,body:JSON.stringify({type:'recovery',email:user.email})});
      const data=await link.json();
      return link.ok&&data.hashed_token?reply(200,{token_hash:data.hashed_token}):reply(502,{error:'Recovery generation failed'});
    }
    if(body.action==='delete'){
      const removed=await fetch(ROOT+'/auth/v1/admin/users/'+body.id,{method:'DELETE',headers});
      return reply(removed.ok?200:502,{deleted:removed.ok});
    }
    return reply(400,{error:'Unsupported action'});
  }catch{return reply(500,{error:'Bootstrap failed'});}
});
