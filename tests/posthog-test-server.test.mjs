import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createPosthogTestServer,testConfiguration} from '../scripts/posthog-test-server.mjs';
const env = {POSTHOG_ENABLED:'true', POSTHOG_PROJECT_TOKEN:'phc_synthetic_test_only', POSTHOG_HOST:'https://eu.i.posthog.com', POSTHOG_TEST_PROJECT_ID:'123'};

test('connection page refuses production, hosted environments and missing configuration',()=>{
  assert.equal(testConfiguration(env).projectId,'123');
  for (const patch of [{VERCEL:'1'},{CI:'true'},{VERCEL_ENV:'production'},{NODE_ENV:'production'},{POSTHOG_TEST_PROJECT_ID:''},{POSTHOG_ENABLED:'false'},{POSTHOG_HOST:'https://evil.invalid'}]) {
    assert.throws(()=>testConfiguration({...env,...patch}));
  }
});

test('connection server serves only test assets with loopback and origin protections',async()=>{
  const server=createPosthogTestServer(testConfiguration(env));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  try {
    const page=await fetch(base);
    assert.match(await page.text(),/Test analytics is off/);
    assert.equal(page.headers.get('referrer-policy'),'no-referrer');
    assert.match(page.headers.get('content-security-policy'),/connect-src 'self' https:\/\/eu.i.posthog.com/);
    const config=await (await fetch(base+'/api/posthog-config')).json();
    assert.equal(config.token,env.POSTHOG_PROJECT_TOKEN);
    for(const asset of ['/src/posthog-analytics.js','/vendor/posthog/posthog.js','/posthog-test.js'])assert.equal((await fetch(base+asset)).status,200);
    for(const asset of ['/index.html','/src/backend.js','/api/geocode','/.env.posthog.local','/__admin-preview'])assert.equal((await fetch(base+asset)).status,404);
    assert.equal((await fetch(base+'/?email=private')).status,400);
    assert.equal((await fetch(base,{method:'POST'})).status,405);
    assert.equal((await fetch(base,{headers:{Origin:'https://evil.invalid'}})).status,403);
    const wrongHostStatus=await new Promise((resolve,reject)=>{
      http.get(base,{headers:{Host:'evil.invalid'}},response=>{response.resume();resolve(response.statusCode);}).on('error',reject);
    });
    assert.equal(wrongHostStatus,403);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
