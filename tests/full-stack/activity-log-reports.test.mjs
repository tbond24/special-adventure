import test from 'node:test';
import assert from 'node:assert/strict';
import {assertActivityEnvironment,verifyActivityLogAndReports} from './activity-log-reports.mjs';
const env={CI:'true',VACANCY_DISPOSABLE_STACK:'1'};
test('exact disposable Linux CI contract is accepted',()=>
  assert.doesNotThrow(()=>assertActivityEnvironment('http://127.0.0.1:54321',env,'linux')));
test('hosted, aliased and alternate loopback targets are refused',()=>{
  for(const root of ['https://example.supabase.co','http://localhost:54321','http://127.0.0.1:54322','http://127.0.0.1:54321/'])
    assert.throws(()=>assertActivityEnvironment(root,env,'linux'));
});
test('missing CI/opt-in and other operating systems are refused',()=>{
  for(const settings of [{CI:'true'},{VACANCY_DISPOSABLE_STACK:'1'},{CI:'false',VACANCY_DISPOSABLE_STACK:'1'}])
    assert.throws(()=>assertActivityEnvironment('http://127.0.0.1:54321',settings,'linux'));
  for(const platform of ['win32','darwin'])
    assert.throws(()=>assertActivityEnvironment('http://127.0.0.1:54321',env,platform));
});
test('unsafe invocation is rejected before any supplied SQL or HTTP action',async()=>{
  let actions=0;
  await assert.rejects(verifyActivityLogAndReports({ROOT:'https://production.invalid',
    sql:()=>{actions++;},request:()=>{actions++;}}),/disposable Linux CI/);
  assert.equal(actions,0);
});
