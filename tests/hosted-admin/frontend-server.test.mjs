import test from 'node:test';
import assert from 'node:assert/strict';
import {frontendServer} from './frontend-server.mjs';
test('served frontend replaces production target and bounds outgoing connections',async()=>{
  const server=await frontendServer('synthetic-public-key-for-local-server-test');
  try{
    const page=await fetch(server.url+'/');
    assert.match(page.headers.get('content-security-policy'),/raauicmfyjpcuhfzknak/);
    assert.doesNotMatch(page.headers.get('content-security-policy'),/xtutkwiivqkgkqjpkxvj/);
    const source=await(await fetch(server.url+'/src/backend.js')).text();
    assert.doesNotMatch(source,/xtutkwiivqkgkqjpkxvj|sb_publishable_w3Y/);
    assert.match(source,/raauicmfyjpcuhfzknak/);
    assert.equal((await fetch(server.url+'/api/listing-page.js')).status,403);
  }finally{await server.close();}
});
