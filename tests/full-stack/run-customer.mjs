// Extend the existing isolated runner without changing its proven teardown.
// Generated module exists only within the disposable CI checkout, never app/.
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const original=new URL('./run.mjs',import.meta.url);
const generated=new URL('./.customer-run.generated.mjs',import.meta.url);
const source=await readFile(original,'utf8');
const blob=createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex');
if(blob!=='894fdf9a7cfab4386e71a9f44acf2f9acbedccf1')throw Error('Existing full-stack runner changed; review customer insertion before running');
const anchor="  phase='genuine expired token';";
if(source.split(anchor).length!==2)throw Error('Expected unique customer-journey insertion point');
const hook="  phase='customer create/edit/photo and recovery journeys';\n  await verifyCustomerJourneys({browser,context,loginUI,server,ROOT,key,sql,pass,check,evidence,sensitive,actors,request,artifacts});\n  phase='real browser photo decoding';\n  await verifyPublishedPhotoRendering({context,server,ROOT,sql,pass,check,evidence,actors,artifacts});\n"+anchor;
try {
  await writeFile(generated,"import {verifyCustomerJourneys} from './customer-journeys.mjs';\nimport {verifyPublishedPhotoRendering} from './photo-rendering.mjs';\n"+source.replace(anchor,hook));
  const syntax=spawnSync(process.execPath,['--check',generated.pathname],{encoding:'utf8'});
  if(syntax.status!==0)throw Error('Generated isolated runner has invalid syntax');
  await import(generated.href);
} finally {await unlink(generated).catch(()=>{});}
