// Prepares ignored, expiring authority for the single named test project.
import {randomBytes,createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
if(process.argv[2]!=='--prepare')throw Error('Use --prepare');
const dir=new URL('../../work/hosted-release/',import.meta.url);
await mkdir(dir,{recursive:true});
const nonce=randomBytes(32).toString('hex'),run='vacancy-hosted-'+Date.now();
const expires=new Date(Date.now()+2*60*60*1000).toISOString();
const template=await readFile(new URL('./bootstrap-edge.ts',import.meta.url),'utf8');
const source=template.replaceAll('__NONCE_HASH__',createHash('sha256').update(nonce).digest('hex'))
  .replaceAll('__EXPIRES__',expires).replaceAll('__RUN__',run);
await writeFile(new URL('window.json',dir),JSON.stringify({nonce,run,expires}),{flag:'wx',mode:0o600});
await writeFile(new URL('index.ts',dir),source,{flag:'wx'});
console.log('Prepared isolated two-hour window; credentials remain in ignored work/.');
