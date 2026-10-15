// OFFLINE contract tests of the actual TypeScript handler via a minimal
// Deno.serve adapter. Auth and provider responses are explicit stubs here;
// genuine Auth, SMTP and Edge runtime are covered by the full-stack gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
let handler;
globalThis.Deno={serve(fn){handler=fn;},env:{get(name){return name==='SUPABASE_URL'?'https://unit-auth.invalid':'unit-publishable';}}};
await import('../../supabase/functions/secure-password-reset/index.ts');
const password='SyntheticUnitPassword42!';
const hash=createHash('sha1').update(password).digest('hex').toUpperCase();
async function probe(input={}){
  const calls=[];const original=globalThis.fetch;
  globalThis.fetch=async(url,options={})=>{
    const path=new URL(url).pathname;
    if(path==='/auth/v1/user'&&options.method!=='PUT'){
      calls.push('user');return new Response('{}',{status:input.userStatus||200});
    }
    if(path.startsWith('/range/')){
      calls.push('safety');assert.equal(path,'/range/'+hash.slice(0,5));
      assert.equal(options.headers['Add-Padding'],'true');
      if(input.safetyThrow)throw new TypeError('Synthetic provider outage');
      return new Response(input.safetyBody??'F'.repeat(35)+':0',{status:input.safetyStatus||200});
    }
    if(path==='/auth/v1/user'&&options.method==='PUT'){
      calls.push('update');assert.equal(options.headers.Authorization,'Bearer unit-test-caller');
      assert.equal(options.headers.apikey,'unit-publishable');
      return new Response('{}',{status:input.updateStatus||200});
    }
    if(path==='/auth/v1/logout'){
      calls.push('logout');assert.equal(new URL(url).searchParams.get('scope'),'global');
      if(input.logoutThrow)throw new TypeError('Synthetic logout transport outage');
      return new Response(null,{status:input.logoutStatus||204});
    }
    throw Error('Unexpected network request in offline contract test');
  };
  try{
    const result=await handler(new Request('https://handler.invalid',{method:'POST',
      headers:{Authorization:'Bearer unit-test-caller','Content-Type':'application/json'},
      body:JSON.stringify({password:input.password??password})}));
    return {status:result.status,body:await result.json(),calls};
  }finally{globalThis.fetch=original;}
}
for(const c of [
  {name:'unauthenticated user rejected before mutation',userStatus:401,expected:401,updates:0},
  {name:'short password rejected before provider query',password:'short',expected:400,updates:0},
  {name:'oversized password rejected',password:'Aa1'+''.padEnd(129,'x'),expected:400,updates:0},
  {name:'password-safety HTTP failure fails closed',safetyStatus:503,expected:503,updates:0},
  {name:'password-safety transport failure fails closed',safetyThrow:true,expected:503,updates:0},
  {name:'empty safety response fails closed',safetyBody:'',expected:503,updates:0},
  {name:'malformed safety response fails closed',safetyBody:'bad-response',expected:503,updates:0},
  {name:'breached password denied',safetyBody:hash.slice(5)+':4',expected:400,updates:0},
  {name:'GoTrue update rate limit propagated',updateStatus:429,expected:429,updates:1},
  {name:'padded zero-count safety suffix is not a breach',safetyBody:hash.slice(5)+':0',expected:200,updates:1}
])test(c.name,async()=>{
  const out=await probe(c);assert.equal(out.status,c.expected);
  assert.equal(out.calls.filter(x=>x==='update').length,c.updates);
});
// Release expectation: once GoTrue has accepted the new password, an
// unrelated logout transport failure must not tell the user that the reset
// itself failed. The unchanged handler currently fails this regression.
test('committed password change is not reported as failed when logout transport fails',async()=>{
  const out=await probe({logoutThrow:true});
  assert.deepEqual(out.calls,['user','safety','update','logout']);
  assert.equal(out.status,200,'Password is already changed: preserve that fact and warn separately about session sign-out');
  assert.match(out.body.message,/password.*updated/i);
});
