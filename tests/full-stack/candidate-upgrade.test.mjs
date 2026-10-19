import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assertCandidateEnvironment,candidateTransaction} from './candidate-upgrade.mjs';
test('candidate rehearsal refuses Windows, absent opt-in and remote Docker before any command',()=>{
  const env={CI:'true',VACANCY_DISPOSABLE_STACK:'1',VACANCY_CANDIDATE_UPGRADE_REHEARSAL:'1'};
  assert.doesNotThrow(()=>assertCandidateEnvironment(env,'linux'));
  for(const [e,p] of [[env,'win32'],[{},'linux'],[{...env,CI:'false'},'linux'],[{...env,VACANCY_CANDIDATE_UPGRADE_REHEARSAL:'0'},'linux'],[{...env,DOCKER_HOST:'ssh://remote'},'linux'],[{...env,DOCKER_CONTEXT:'remote'},'linux']])assert.throws(()=>assertCandidateEnvironment(e,p),/isolated Linux CI/);
});
test('candidate executor rejects altered bytes and mismatched receipt identity',()=>{
  const source='select 1;\n',candidate={sourceVersion:'20261017053809',migrationName:'synthetic_candidate',path:'supabase/migrations/20261017053809_synthetic_candidate.sql',sha256:createHash('sha256').update(source).digest('hex')};
  assert.throws(()=>candidateTransaction(candidate,source+'select 2;'),/digest mismatch/);
  assert.throws(()=>candidateTransaction({...candidate,sourceVersion:"bad';drop table x;"},source));
  assert.throws(()=>candidateTransaction({...candidate,path:'../outside.sql'},source));
  assert.throws(()=>candidateTransaction({...candidate,migrationName:'wrong_name'},source));
});
