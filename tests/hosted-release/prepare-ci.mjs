// Local preparation only; outputs remain ignored and must never be uploaded as artifacts.
import {randomBytes,createHash} from 'node:crypto';
import {readFile,writeFile,readdir} from 'node:fs/promises';
const dir=new URL('../../work/hosted-ci/',import.meta.url);
const nonce=randomBytes(32).toString('hex'),run='vacancy-hosted-'+Date.now(),expires=new Date(Date.now()+7200000).toISOString();
const render=s=>s.replaceAll('__NONCE_HASH__',createHash('sha256').update(nonce).digest('hex')).replaceAll('__RUN__',run).replaceAll('__EXPIRES__',expires);
await writeFile(new URL('window.json',dir),JSON.stringify({nonce,run,expires}),{flag:'wx',mode:0o600});
await writeFile(new URL('index.ts',dir),render(await readFile(new URL('./bootstrap-edge.ts',import.meta.url),'utf8')),{flag:'wx'});
const migrations=(await readdir(new URL('supabase/migrations/',dir))).filter(x=>x.endsWith('_bounded_hosted_ci_window.sql'));
if(migrations.length!==1)throw Error('Create exactly one empty test-only migration with the installed CLI first');
const migration=new URL('supabase/migrations/'+migrations[0],dir);
if((await readFile(migration,'utf8')).trim())throw Error('Migration is not empty');
await writeFile(migration,render(await readFile(new URL('./ci-fixture.sql',import.meta.url),'utf8')));
console.log('Prepared expiring test-only Edge and fixed-command fixture migration in ignored work/hosted-ci.');
