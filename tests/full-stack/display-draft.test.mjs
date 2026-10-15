import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyDisplayDraft} from './display-draft.mjs';
test('shared display acceptance rejects hosted targets before touching SQL/Auth/HTTP',async()=>{
  let calls=0;
  await assert.rejects(verifyDisplayDraft({ROOT:'https://production.invalid',
    sql:()=>{calls++;},request:()=>{calls++;}}),/disposable Linux CI/);
  assert.equal(calls,0);
});
test('no opt-in cannot run display acceptance on a nominal loopback URL',async()=>{
  const old=process.env.VACANCY_DISPOSABLE_STACK;
  try{
    delete process.env.VACANCY_DISPOSABLE_STACK;
    await assert.rejects(verifyDisplayDraft({ROOT:'http://127.0.0.1:54321'}),/disposable Linux CI/);
  }finally{if(old===undefined)delete process.env.VACANCY_DISPOSABLE_STACK;else process.env.VACANCY_DISPOSABLE_STACK=old;}
});
