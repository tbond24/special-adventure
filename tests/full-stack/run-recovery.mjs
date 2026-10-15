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
once('  const grantId=randomUUID();',"  denied(await rpc('admin_renter_journeys',operator,{p_from:new Date(Date.now()-86400000).toISOString(),p_to:new Date().toISOString(),p_offset:0}),'Unassigned genuine AAL2 administrator cannot read new renter analytics');\n  const grantId=randomUUID();");
once("  phase='AAL2 capabilities and direct table matrix';",
  "  phase='activity log and existing report dependencies';\n  await verifyActivityLogAndReports({ROOT,request,sql,pass,check,evidence,owner,operator,viewer,suspended});\n  phase='AAL2 capabilities and direct table matrix';");
const anchor="  phase='genuine expired token';";
once(anchor,"  phase='customer create/edit/photo and recovery journeys';\n  await verifyCustomerJourneys({browser,context,loginUI,server,ROOT,key,sql,pass,check,evidence,sensitive,actors,request,artifacts});\n  phase='real browser photo decoding';\n  await verifyPublishedPhotoRendering({context,server,ROOT,sql,pass,check,evidence,actors,artifacts});\n  phase='final password-reset Edge/GoTrue/email flow';\n  await verifyPasswordRecovery({context,loginUI,server,ROOT,key,sql,pass,check,evidence,sensitive,actors,request});\n"+anchor);
once('  evidence.finalSnapshot=await snapshot();',"  phase='bounded pilot editor read measurements';\n  await verifyEditorReadPerformance({ROOT,key,sql,check,pass,evidence,owner,page,sensitive});\n  phase='shared card service display publication';\n  await verifyDisplayDraft({ROOT,key,sql,request,check,pass,evidence,owner,operator,viewer,suspended,page,operatorPage:operatorUI.page,context,server,artifacts,sensitive});\n  phase='remaining optional detail display publication';\n  await verifyRemainingDisplays({ROOT,key,sql,request,check,pass,evidence,owner,operator,page,server,sensitive,context});\n  phase='icon catalogue and favicon publication';\n  await verifyBrandPublication({ROOT,key,sql,request,check,pass,evidence,owner,operator,viewer,suspended,page,operatorPage:operatorUI.page,server,sensitive,context,artifacts});\n  evidence.finalSnapshot=await snapshot();");
once('  evidence.finalSnapshot=await snapshot();',"  phase='separate Create/Edit language selector publication';\n  await verifyLanguageControls({ROOT,sql,request,check,pass,evidence,owner,operator,viewer,suspended,page,sensitive,server,loginUI,actors,artifacts});\n  evidence.finalSnapshot=await snapshot();");
once('  evidence.finalSnapshot=await snapshot();',"  phase='Stage 4 compatible ingestion and prospective renter analytics';\n  await verifyStage4Analytics({ROOT,key,sql,request,check,pass,evidence,owner,operator,viewer,suspended,page,server,sensitive,actors,loginUI,artifacts});\n  evidence.finalSnapshot=await snapshot();");
const analyticsUnit=spawnSync(process.execPath,['--test','tests/analytics-queue.test.cjs','tests/connected-collector.test.cjs'],{stdio:'inherit'});
if(analyticsUnit.status!==0)throw Error('Analytics collector safety tests failed');
const unit=spawnSync(process.execPath,['--test',new URL('./editor-read-performance.test.mjs',import.meta.url).pathname],{stdio:'inherit'});
if(unit.status!==0)throw Error('Editor measurement safety/statistics tests failed');
const activityUnit=spawnSync(process.execPath,['--test',new URL('./activity-log-reports.test.mjs',import.meta.url).pathname],{stdio:'inherit'});
if(activityUnit.status!==0)throw Error('Activity-log isolation safety tests failed');
const displayUnit=spawnSync(process.execPath,['--test',new URL('./display-draft.test.mjs',import.meta.url).pathname],{stdio:'inherit'});
if(displayUnit.status!==0)throw Error('Shared display isolation safety tests failed');
try{
  await writeFile(generated,"import {verifyStage4Analytics} from './stage4-analytics.mjs';\nimport {verifyLanguageControls} from './language-controls.mjs';\nimport {verifyBrandPublication} from './brand-publication.mjs';\nimport {verifyRemainingDisplays} from './remaining-displays.mjs';\nimport {verifyDisplayDraft} from './display-draft.mjs';\nimport {verifyActivityLogAndReports} from './activity-log-reports.mjs';\nimport {verifyCustomerJourneys} from './customer-journeys.mjs';\nimport {verifyPublishedPhotoRendering} from './photo-rendering.mjs';\nimport {prepareRecovery,verifyPasswordRecovery} from './password-recovery.mjs';\nimport {verifyEditorReadPerformance} from './editor-read-performance.mjs';\n"+source);
  const checked=spawnSync(process.execPath,['--check',generated.pathname],{encoding:'utf8'});
  if(checked.status!==0)throw Error('Generated recovery integration runner syntax invalid');
  await import(generated.href);
}finally{await unlink(generated).catch(()=>{});}
