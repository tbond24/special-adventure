// Full existing integration + customer gates + actual password-reset service.
// Every transformation is test-only; original runtime modules are unchanged.
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const generated=new URL('./.recovery-run.generated.mjs',import.meta.url);
let source=await readFile(new URL('./run.mjs',import.meta.url),'utf8');
const hash=createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex');
if(hash!=='894fdf9a7cfab4386e71a9f44acf2f9acbedccf1')throw Error('Original integration runner changed; re-review before extending');
function once(before,after){if(source.split(before).length!==2)throw Error('Recovery test insertion anchor changed');source=source.replace(before,after);}
once("const count=await prepare();phase='start local Supabase';","const count=await prepare();await prepareRecovery();phase='start local Supabase';");
once('studio,edge-runtime,logflare','studio,logflare');
const anchor="  phase='genuine expired token';";
once(anchor,"  phase='customer create/edit/photo and recovery journeys';\n  await verifyCustomerJourneys({browser,context,loginUI,server,ROOT,key,sql,pass,check,evidence,sensitive,actors,request,artifacts});\n  phase='real browser photo decoding';\n  await verifyPublishedPhotoRendering({context,server,ROOT,sql,pass,check,evidence,actors,artifacts});\n  phase='final password-reset Edge/GoTrue/email flow';\n  await verifyPasswordRecovery({context,loginUI,server,ROOT,key,sql,pass,check,evidence,sensitive,actors,request});\n"+anchor);
try{
  await writeFile(generated,"import {verifyCustomerJourneys} from './customer-journeys.mjs';\nimport {verifyPublishedPhotoRendering} from './photo-rendering.mjs';\nimport {prepareRecovery,verifyPasswordRecovery} from './password-recovery.mjs';\n"+source);
  const checked=spawnSync(process.execPath,['--check',generated.pathname],{encoding:'utf8'});
  if(checked.status!==0)throw Error('Generated recovery integration runner syntax invalid');
  await import(generated.href);
}finally{await unlink(generated).catch(()=>{});}
