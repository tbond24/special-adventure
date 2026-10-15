import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize,assertDisposable} from './editor-read-performance.mjs';
const owner={role:'owner',email:'qa-owner@vacancy.invalid'}, env={VACANCY_DISPOSABLE_STACK:'1'};
test('50-sample nearest-rank P50 and P95 are exact and input remains unchanged',()=>{
  const values=Array.from({length:50},(_,i)=>50-i), original=[...values];
  assert.deepEqual(summarize(values),{samples:50,min:1,p50:25,p95:48,max:50});
  assert.deepEqual(values,original);
});
test('one zero-duration sample is valid',()=>assert.deepEqual(summarize([0]),{samples:1,min:0,p50:0,p95:0,max:0}));
test('invalid or empty measurements fail closed',()=>{
  for(const values of [[],[-1],[NaN],[Infinity],null])assert.throws(()=>summarize(values));
});
test('only exact disposable loopback and synthetic Owner are accepted',()=>assertDisposable('http://127.0.0.1:54321',owner,env));
test('hosted or different origins fail before network access',()=>{
  for(const url of ['https://example.com','https://example.supabase.co','http://localhost:54321','http://127.0.0.1:54321/'])
    assert.throws(()=>assertDisposable(url,owner,env));
});
test('missing explicit opt-in, non-Owner or real identity fail before network access',()=>{
  assert.throws(()=>assertDisposable('http://127.0.0.1:54321',owner,{}));
  assert.throws(()=>assertDisposable('http://127.0.0.1:54321',{...owner,role:'operator'},env));
  assert.throws(()=>assertDisposable('http://127.0.0.1:54321',{...owner,email:'real@example.com'},env));
});
