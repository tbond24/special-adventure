// Opt-in Linux CI disaster drill. Only this run's synthetic local stack is destroyed.
// Backups contain synthetic Auth data: private ignored work dir, never artifacts/logs.
import {execFile} from 'node:child_process';
import {mkdir,readFile,writeFile,unlink,rmdir,realpath,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium,expect} from '@playwright/test';
import {frontendServer} from '../hosted-admin/frontend-server.mjs';
import {claims,totp} from '../hosted-admin/support.mjs';
const DB='supabase_db_vacancy-disposable-admin',STORAGE='supabase_storage_vacancy-disposable-admin';
// Pinned CLI v2.121.0 storage.service.ts mounts its own named volume at /mnt.
const STORAGE_PATH='/mnt';
const schemas=['auth','storage','public','private','supabase_migrations'];
const schemaList=schemas.map(s=>"'"+s+"'").join(',');
const sha=b=>createHash('sha256').update(b).digest('hex');
export function assertFreeRecoveryEnvironment(root,env=process.env,platform=process.platform){
  if(root!=='http://127.0.0.1:54321'||env.CI!=='true'||env.VACANCY_DISPOSABLE_STACK!=='1'||env.VACANCY_FREE_RECOVERY_DRILL!=='1'||platform!=='linux'||env.DOCKER_HOST||(env.DOCKER_CONTEXT&&env.DOCKER_CONTEXT!=='default')){
    throw Error('Free recovery drill requires exact local Linux CI and explicit opt-in; remote Docker forbidden');
  }
}
export function validateTarEntries(text){
  const entries=text.trim().split('\n');
  if(!text.trim()||entries.length>2000||entries.some(p=>p.startsWith('/')||p.includes('\\')||p.split('/').includes('..')||/[\r\0]/.test(p)))throw Error('Unsafe synthetic media archive paths');
  return entries.length;
}
function docker(args,input,{allowFailure=false}={}){
  return new Promise((resolve,reject)=>{
    const child=execFile('docker',['--context','default',...args],{encoding:'buffer',maxBuffer:64*1024*1024,timeout:120000},(error,stdout,stderr)=>{
      if(error&&!allowFailure){
        // Never print COPY rows, dump bytes, environment, object paths or Auth data.
        const detail=stderr.toString().split('\n').filter(s=>/^pg_restore: error: (could not execute query: ERROR:|input file)/.test(s)).map(s=>s.slice(0,160)).join('; ');
        reject(Error('Synthetic recovery command '+args[0]+' failed'+(detail?': '+detail:'')));
      }else resolve({ok:!error,stdout});
    });
    child.stdin.on('error',()=>{});child.stdin.end(input);
  });
}
const dataFingerprint=`
create temporary table free_recovery_fingerprints(relation text primary key,rows bigint,digest text) on commit preserve rows;
do $fingerprint$ declare r record; n bigint; d text; begin
 for r in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in (${schemaList}) and c.relkind='r' order by n.nspname,c.relname loop
  execute format('select count(*),md5(coalesce(string_agg(to_jsonb(t)::text,E''\\n'' order by to_jsonb(t)::text),'''')) from %I.%I t',r.nspname,r.relname) into n,d;
  insert into free_recovery_fingerprints values(r.nspname||'.'||r.relname,n,d);
 end loop;
 for r in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in (${schemaList}) and c.relkind='S' order by n.nspname,c.relname loop
  execute format('select last_value,md5(jsonb_build_array(last_value,is_called)::text) from %I.%I',r.nspname,r.relname) into n,d;
  insert into free_recovery_fingerprints values(r.nspname||'.'||r.relname,n,d);
 end loop;
end $fingerprint$;
select coalesce(jsonb_agg(to_jsonb(f) order by relation),'[]') from free_recovery_fingerprints f;`;
const catalogFingerprint=`select md5(jsonb_build_object(
 'relations',(select jsonb_agg(jsonb_build_array(n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text,pg_get_userbyid(c.relowner)) order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind in ('r','S')),
 'functions',(select jsonb_agg(jsonb_build_array(n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),pg_get_functiondef(p.oid),p.proacl::text,pg_get_userbyid(p.proowner)) order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.prokind='f'),
 'policies',(select jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname) from pg_policies p where schemaname in ('public','private','storage')),
 'triggers',(select jsonb_agg(jsonb_build_array(n.nspname,c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid)) order by n.nspname,c.relname,t.tgname) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and not t.tgisinternal)
)::text);`;
export async function verifyFreeRecovery(h){
  const {ROOT,sql,request,check,pass,evidence,actors,owner,sensitive,quiesce,restart}=h;
  assertFreeRecoveryEnvironment(ROOT);
  const info=evidence.freeRecovery={completed:false,environment:'Synthetic disposable Linux CI only',productionData:false,externalMail:false,phases:[]};
  const mark=label=>{info.phases.push(label);pass(label);};
  const publisher=actors.find(a=>a.role==='customer publisher');
  check(publisher?.id&&owner?.id,'Recovery drill requires original genuine synthetic actors');
  const privateDir=fileURLToPath(new URL('../../work/free-recovery-private/',import.meta.url));
  const work=fileURLToPath(new URL('../../work/',import.meta.url));
  const dumpPath=privateDir+'/synthetic-data.dump',mediaPath=privateDir+'/synthetic-media.tar';
  let restoredBrowser,restoredServer,phase='quiesce',databaseDump,mediaArchive,createdPrivateDir=false;
  try{
    await quiesce();
    await mkdir(privateDir,{mode:0o700});
    createdPrivateDir=true;
    check(!(await lstat(privateDir)).isSymbolicLink()&&(await realpath(privateDir)).startsWith((await realpath(work))+'/'),'Private backup path must stay in ignored work');
    const paths=JSON.parse(await sql("select jsonb_agg(storage_path order by sort_order) from public.media where owner_id='"+publisher.id+"' and status='active';"));
    check(paths?.length===3&&paths.every(p=>typeof p==='string'&&!p.split('/').includes('..')),'Recovery requires three existing synthetic customer uploads');
    const images=[];
    for(const p of paths){const url=ROOT+'/storage/v1/object/public/room-media/'+p.split('/').map(encodeURIComponent).join('/');const r=await fetch(url,{signal:AbortSignal.timeout(10000)});check(r.ok,'Source photo readable');images.push({url,sha256:sha(Buffer.from(await r.arrayBuffer()))});}
    const before=JSON.parse(await sql(dataFingerprint)),catalog=await sql(catalogFingerprint);
    check(before.some(x=>x.relation==='public.admin_change_audit'&&x.rows>0)&&before.some(x=>x.relation==='auth.users'&&x.rows>0),'Backup contains real synthetic users and immutable audit');
    phase='capture private data and media';
    databaseDump=(await docker(['exec',DB,'pg_dump','-U','postgres','-d','postgres','--format=custom','--data-only',...schemas.map(s=>'--schema='+s)])).stdout;
    const mounts=JSON.parse((await docker(['inspect','--format','{{json .Mounts}}',STORAGE])).stdout.toString());
    check(mounts.some(m=>m.Destination===STORAGE_PATH&&m.Type==='volume'&&m.Name===STORAGE),'Only this synthetic named Storage volume may be archived');
    info.storageMount={path:STORAGE_PATH,type:'volume',ownedByDisposableStack:true};
    mediaArchive=(await docker(['exec','-u','0',STORAGE,'tar','-C',STORAGE_PATH,'-cf','-','.'])).stdout;
    const entries=(await docker(['exec','-i',STORAGE,'tar','-tf','-'],mediaArchive)).stdout.toString();
    info.archiveEntries=validateTarEntries(entries);
    check(databaseDump.length>1000&&mediaArchive.length>1000,'Actual database and media archives must exist');
    await writeFile(dumpPath,databaseDump,{mode:0o600,flag:'wx'});await writeFile(mediaPath,mediaArchive,{mode:0o600,flag:'wx'});
    check(JSON.stringify(JSON.parse(await sql(dataFingerprint)))===JSON.stringify(before),'Quiescent source must not change during the checkpoint');
    info.backup={schemas,tableAndSequenceCount:before.length,databaseBytes:databaseDump.length,mediaBytes:mediaArchive.length,databaseSha256:sha(databaseDump),mediaSha256:sha(mediaArchive),uploaded:false};
    mark('Synthetic checkpoint captures exact table/sequence state and three real uploaded image hashes without writes');
    phase='corrupt archive rejection';
    const corrupt=Buffer.from(databaseDump);corrupt.fill(0,0,8);
    const invalid=await docker(['exec','-i',DB,'pg_restore','--list'],corrupt,{allowFailure:true});
    check(!invalid.ok&&JSON.stringify(JSON.parse(await sql(dataFingerprint)))===JSON.stringify(before),'Corrupt archive must be rejected without changing source');
    mark('Corrupt database archive is rejected before restore and preserves the checkpoint source');
    phase='destroy and recreate synthetic stack';
    databaseDump=null;mediaArchive=null;
    const began=performance.now(),local=await restart();
    check(local.key&&local.api===ROOT,'Recreated stack must retain the exact loopback API boundary');
    databaseDump=await readFile(dumpPath);mediaArchive=await readFile(mediaPath);
    check(sha(databaseDump)===info.backup.databaseSha256&&sha(mediaArchive)===info.backup.mediaSha256,'Restore must read the actual saved archives and verify both hashes');
    info.savedArchivesReadAndVerified=true;
    const empty=await sql("select (select count(*) from auth.users)=0 and (select count(*) from public.admin_change_audit)=0;");
    check(empty==='t','The recreated schema must not retain source actors or audit rows');
    check(await sql(catalogFingerprint)===catalog,'Exact source replay must retain schema/owners/RLS/policies/triggers/function ACLs');
    mark('Original synthetic stack and volumes are removed; exact source schema recreates without its users or audit data');
    phase='transactional data restore';
    const tableNames=await sql(`select string_agg(format('%I.%I',n.nspname,c.relname),',' order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in (${schemaList}) and c.relkind='r';`);
    check(tableNames.length>0&&!/[;\n]/.test(tableNames),'Only fixed schema table identifiers can be truncated in the recreated stack');
    await sql('begin; set local session_replication_role=replica; truncate table '+tableNames+' restart identity cascade; commit;');
    await docker(['exec','-i','-e','PGOPTIONS=-c session_replication_role=replica',DB,'pg_restore','-U','postgres','-d','postgres','--single-transaction','--exit-on-error'],databaseDump);
    check(JSON.stringify(JSON.parse(await sql(dataFingerprint)))===JSON.stringify(before),'Restored table contents and sequence values must exactly match the checkpoint');
    check(await sql(catalogFingerprint)===catalog&&await sql('show session_replication_role;')==='origin','Import bypass must be session-only and original security catalogue intact');
    mark('Transactional restore reproduces exact application/private/Auth/Storage/receipt rows and sequence state with original guards');
    phase='failed duplicate restore atomicity';
    const duplicate=await docker(['exec','-i','-e','PGOPTIONS=-c session_replication_role=replica',DB,'pg_restore','-U','postgres','-d','postgres','--single-transaction','--exit-on-error'],databaseDump,{allowFailure:true});
    check(!duplicate.ok&&JSON.stringify(JSON.parse(await sql(dataFingerprint)))===JSON.stringify(before),'Failed duplicate restore must not partially change the restored database');
    mark('Duplicate import fails as a single transaction and leaves recovered rows and sequences intact');
    phase='separate object restore';
    const missing=await fetch(images[0].url,{signal:AbortSignal.timeout(10000)});
    check(!missing.ok,'Database metadata alone must not recreate an uploaded photo');
    await docker(['exec','-i','-u','0',STORAGE,'tar','-C',STORAGE_PATH,'-xf','-'],mediaArchive);
    for(const image of images){const r=await fetch(image.url,{signal:AbortSignal.timeout(10000)});check(r.ok&&sha(Buffer.from(await r.arrayBuffer()))===image.sha256,'Separate media restore must recover exact bytes');}
    info.recoverySeconds=Math.round((performance.now()-began)/100)/10;info.mediaCount=images.length;
    mark('Database-only recovery leaves media unavailable; separate object restore recovers all three exact uploaded images');
    phase='real Auth and browser after recovery';
    const login=await request('auth/v1/token?grant_type=password',{body:{email:owner.email,password:owner.password}});
    check(login.ok&&claims(login.data.access_token).aal==='aal1','Restored password hash must support fresh genuine sign-in');
    sensitive.add(login.data.access_token);sensitive.add(login.data.refresh_token);
    const aal1=await request('rest/v1/rpc/admin_my_capabilities',{token:login.data.access_token,body:{}});
    check([401,403].includes(aal1.status)&&aal1.data?.code==='42501','Restored Owner must still require genuine AAL2');
    const user=await request('auth/v1/user',{token:login.data.access_token,method:'GET'});
    const factor=(user.data?.factors||[]).find(f=>f.factor_type==='totp'&&f.status==='verified');
    check(factor?.id&&owner.totpSecret,'Verified TOTP material must survive recovery');
    const challenge=await request('auth/v1/factors/'+factor.id+'/challenge',{token:login.data.access_token,body:{}});
    check(challenge.ok&&challenge.data?.id,'Restored factor supports a genuine challenge');
    // Avoid reusing a code consumed immediately before the checkpoint.
    await new Promise(r=>setTimeout(r,30100-Date.now()%30000));
    const code=totp(owner.totpSecret);sensitive.add(code);
    const verify=await request('auth/v1/factors/'+factor.id+'/verify',{token:login.data.access_token,body:{challenge_id:challenge.data.id,code}});
    check(verify.ok&&claims(verify.data.access_token).aal==='aal2','Restored TOTP must produce actual AAL2');
    sensitive.add(verify.data.access_token);sensitive.add(verify.data.refresh_token);
    const protectedRead=await request('rest/v1/rpc/admin_my_capabilities',{token:verify.data.access_token,body:{}});
    check(protectedRead.ok,'Restored Owner has protected access after real MFA');
    const direct=await request('rest/v1/analytics_events',{token:verify.data.access_token,body:{event_name:'page_view'}});
    check(!direct.ok&&direct.data?.code==='42501','Restored direct analytics write remains forbidden');
    let auditDenied=false;try{await sql('update public.admin_change_audit set reason=reason;');}catch{auditDenied=true;}
    check(auditDenied,'Restored immutable audit still rejects direct rewrite');
    restoredServer=await frontendServer(local.key);restoredBrowser=await chromium.launch({headless:true});
    const context=await restoredBrowser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
    await context.route('**/*',r=>[ROOT,restoredServer.url].includes(new URL(r.request().url()).origin)?r.continue():r.abort());
    const listing=await sql("select v.id from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where p.owner_id='"+publisher.id+"' and v.status='active';");
    check(/^[0-9a-f-]{36}$/.test(listing),'Restored customer has exactly one active listing');
    const page=await context.newPage();await page.goto(restoredServer.url+'/#detail/'+listing);
    await expect(page.locator('.quiet-intro h1')).toHaveText('Synthetic customer studio edited');
    const photos=page.locator('.quiet-gallery-slide img');await expect(photos).toHaveCount(3);
    for(let i=0;i<3;i++){if(i)await page.locator('[data-quiet-gallery-step="1"]').click();await expect.poll(()=>photos.nth(i).evaluate(img=>img.complete&&img.naturalWidth>0),{timeout:15000}).toBe(true);}
    mark('Restored real Auth/TOTP, AAL2 protection, direct-write denials, immutable audit and mobile customer photo decoding pass');
    info.verifiedRecoverySeconds=Math.round((performance.now()-began)/100)/10;
    info.completed=true;info.cataloguePreserved=true;info.exactDataAndSequenceRestore=true;info.recreatedStack=true;info.genuineAuthMfa=true;info.browserPhotoDecoding=true;
  }catch(error){info.failedPhase=phase;throw error;}
  finally{
    await restoredBrowser?.close();await restoredServer?.close();
    if(createdPrivateDir){
      for(const file of [dumpPath,mediaPath])await unlink(file).catch(e=>{if(e.code!=='ENOENT')throw e;});
      await rmdir(privateDir).catch(e=>{if(e.code!=='ENOENT')throw e;});
      info.privateBackupsRemoved=true;
    }
  }
}
