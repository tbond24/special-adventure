// Read-only source checks; no SQL, Auth or network operations.
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=new URL('../../',import.meta.url);
const sha=value=>createHash('sha256').update(value).digest('hex');
const blob=value=>createHash('sha1').update('blob '+Buffer.byteLength(value)+'\0').update(value).digest('hex');
const load=async path=>(await readFile(new URL(path,root),'utf8')).replace(/\r\n/g,'\n');
export async function verifyReconciliationSources(){
 const previous=JSON.parse(await load('docs/evidence/admin-editor-completion-verification-20261016.json'));
 const target='a9c6303d6a80cd93d8ca1566cc0d459fbe77a87a';
 let referenceCheckout=false;
 try{await access(new URL('work/reconciliation-reference/.git',root));referenceCheckout=true;}catch{}
 if(referenceCheckout)assert.equal(execFileSync('git',['-C',new URL('work/reconciliation-reference',root).pathname,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),target);
 const targetSource=async path=>referenceCheckout?load('work/reconciliation-reference/'+path):execFileSync('git',['show',target+':'+path],{encoding:'utf8'}).replace(/\r\n/g,'\n');
 const unchanged=[];
 for(const item of previous.migrationSources){
  const text=await load(item.path);assert.equal(sha(text),item.sha256,item.path+' changed');
  unchanged.push({path:item.path,sha256:sha(text),gitBlob:blob(text),matchesContinuation:true});
 }
 for(const [path,expected] of Object.entries(previous.frozenContracts))assert.equal(blob(await load(path)),expected,'Frozen contract '+path);
 const prior=JSON.parse(await load('docs/evidence/admin-release-source-20261016.json'));
 for(const path of ['package.json','package-lock.json'])assert.equal(blob(await load(path)),prior.runtimeTrees.find(r=>r.path===path).gitObject,'Dependency file changed');
 for(const item of previous.migrationSources.slice(0,6))assert.equal(sha(await targetSource(item.path)),item.sha256,'Shared target foundation changed');
 const historical='supabase/migrations/20260930180151_listing_activity_log.sql',sql=text=>text.replace(/^(?:--[^\n]*\n|\s)+/,'');
 assert.equal(sql(await load(historical)),sql(await targetSource(historical)),'Recovered historical SQL differs');
 const generator=await targetSource('tests/full-stack/favicon.mjs');
 const expectedGenerator=generator.slice(generator.indexOf('function crc32('),generator.indexOf('\nconst url='));
 const actualGenerator=await load('tests/full-stack/reconciliation-png.mjs');
 assert.equal(actualGenerator.slice(actualGenerator.indexOf('function crc32(')).trim().replace('export function png(','function png('),expectedGenerator.trim(),'Target PNG fixture generator changed');
 const alternatives=prior.targetReconciliation.targetOnlyCandidatePaths;
 for(const path of alternatives){let exists=false;try{await access(new URL(path,root));exists=true;}catch{}assert.equal(exists,false,'Alternative migration active: '+path);}
 const newPath='supabase/migrations/20261016061530_admin_branch_reconciliation.sql';
 const report={continuation:'3411cc26630c8b2927023297af3aa82a75b0e1d8',target,
  method:'Selective source reconciliation; retain canonical per-setting APIs, port target protections; original branches and protocols preserved in source histories',
  originalCandidatesUnchanged:unchanged,sharedFoundationFilesMatchBothBranches:6,
  recoveredHistoricalSqlEqualIgnoringLeadingComments:true,originalFrozenContractsMatch:true,dependenciesUnchanged:true,
  targetReferenceCheckout:referenceCheckout,targetGeneratorPortedVerbatim:true,
  excludedAlternativeCandidates:await Promise.all(alternatives.map(async path=>({path,sha256:sha(await targetSource(path)),active:false}))),
  additiveMigration:{path:newPath,sha256:sha(await load(newPath)),gitBlob:blob(await load(newPath))},
  combinedAcceptanceRequired:true,productionMutation:false};
 return report;
}
if(process.argv.includes('--check')){
 const report=await verifyReconciliationSources();
 console.log('PASS: fifteen original candidates, frozen contracts and dependencies preserved; six shared foundations and target generator match; four alternative migrations excluded');
 if(process.argv.includes('--record')){await mkdir(new URL('work/full-stack-evidence/',root),{recursive:true});await writeFile(new URL('work/full-stack-evidence/reconciliation-source-provenance.json',root),JSON.stringify(report,null,2));}
}
