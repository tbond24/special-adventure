import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {readFile} from 'node:fs/promises';
import {createHash,webcrypto} from 'node:crypto';
const nonce='a'.repeat(64),digest=createHash('sha256').update(nonce).digest('hex');
const template=await readFile(new URL('./bootstrap-edge.ts',import.meta.url),'utf8');
const root='https://raauicmfyjpcuhfzknak.supabase.co';
function harness({url=root,expires='2099-01-01',respond}={}){
  const calls=[];let handler;
  vm.runInNewContext(stripTypeScriptTypes(template.replaceAll('__NONCE_HASH__',digest)
    .replaceAll('__EXPIRES__',expires).replaceAll('__RUN__','synthetic-test-run')),
    {Deno:{env:{get:name=>({SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:'fixture-service-key',
      SUPABASE_ANON_KEY:'fixture-anon-key'})[name]},serve:fn=>{handler=fn}},
      crypto:webcrypto,TextEncoder,Response,Request,fetch:async(url,options)=>{
        calls.push({url,options});return respond?respond(url,options):Response.json({
          id:'10000000-0000-4000-8000-000000000001',email:'synthetic@example.test'});
      }});
  return {calls,invoke:(body={},headers={})=>handler(new Request(root,{method:'POST',
    headers:{'Content-Type':'application/json','x-qa-window':nonce,...headers},body:JSON.stringify(body)}))};
}
test('bootstrap denies wrong nonce, browser origin, expired window and production environment before privileged calls',async()=>{
  for(const [options,headers,status] of [[{}, {'x-qa-window':'b'.repeat(64)},401],
    [{},{origin:'http://127.0.0.1'},403],[{expires:'2000-01-01'},{},410],
    [{url:'https://xtutkwiivqkgkqjpkxvj.supabase.co'},{},410]]){
    const h=harness(options);assert.equal((await h.invoke({},headers)).status,status);assert.equal(h.calls.length,0);
  }
});
test('bootstrap provisions only named fixtures with confirmed email; never returns service credential',async()=>{
  const h=harness();
  assert.equal((await h.invoke({action:'create',role:'arbitrary',password:'a'.repeat(50)})).status,400);
  const res=await h.invoke({action:'create',role:'owner',password:'a'.repeat(50)});
  assert.equal(res.status,200);const data=await res.json();
  assert.equal(data.key,'fixture-anon-key');assert.ok(!JSON.stringify(data).includes('fixture-service-key'));
  assert.equal(h.calls.length,1);assert.equal(h.calls[0].url,root+'/auth/v1/admin/users');
  const sent=JSON.parse(h.calls[0].options.body);
  assert.equal(sent.email_confirm,true);assert.equal(sent.email,'synthetic-test-run-owner@example.test');
  assert.equal(sent.app_metadata.vacancy_qa_scope,'synthetic-test-run');
});
test('cleanup refuses to delete an account outside this run and actor',async()=>{
  const h=harness({respond:()=>Response.json({app_metadata:{vacancy_qa_scope:'another-run'}})});
  assert.equal((await h.invoke({action:'delete',role:'owner',id:'10000000-0000-4000-8000-000000000001'})).status,403);
  assert.equal(h.calls.length,1);assert.equal(h.calls[0].options.method,undefined);
});
