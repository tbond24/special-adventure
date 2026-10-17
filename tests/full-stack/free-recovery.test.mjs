import test from 'node:test';
import assert from 'node:assert/strict';
import {assertFreeRecoveryEnvironment,validateTarEntries} from './free-recovery.mjs';
const opted={CI:'true',VACANCY_DISPOSABLE_STACK:'1',VACANCY_FREE_RECOVERY_DRILL:'1'};
test('Destructive drill rejects hosted, redirected, non-CI and non-Linux environments before Docker',()=>{
 for(const root of ['https://xtutkwiivqkgkqjpkxvj.supabase.co','https://raauicmfyjpcuhfzknak.supabase.co','http://localhost:54321','http://127.0.0.1:54321/'])assert.throws(()=>assertFreeRecoveryEnvironment(root,opted,'linux'));
 for(const env of [{...opted,CI:'false'},{...opted,VACANCY_FREE_RECOVERY_DRILL:'0'},{...opted,DOCKER_HOST:'tcp://remote:2375'},{...opted,DOCKER_CONTEXT:'production'}])assert.throws(()=>assertFreeRecoveryEnvironment('http://127.0.0.1:54321',env,'linux'));
 assert.throws(()=>assertFreeRecoveryEnvironment('http://127.0.0.1:54321',opted,'win32'));
 assert.doesNotThrow(()=>assertFreeRecoveryEnvironment('http://127.0.0.1:54321',opted,'linux'));
});
test('Media import rejects traversal, absolute paths and malformed/oversized manifests',()=>{
 for(const text of ['','/etc/passwd\n','./../../secret\n','./a/../secret\n','C:\\secret\n','./bad\rname\n','./bad\0name\n',Array(2002).fill('./x').join('\n')])assert.throws(()=>validateTarEntries(text));
 assert.equal(validateTarEntries('./\n./synthetic/\n./synthetic/image.png\n'),3);
});
