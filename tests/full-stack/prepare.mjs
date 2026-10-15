import {readFile,writeFile,mkdir,readdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {check} from '../hosted-admin/support.mjs';
export const stackDir=fileURLToPath(new URL('../../work/disposable-admin/',import.meta.url));
export const artifacts=fileURLToPath(new URL('../../work/full-stack-evidence/',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
export async function prepare(){
  check(process.env.CI==='true'&&process.env.VACANCY_DISPOSABLE_STACK==='1'&&process.platform==='linux','Disposable Linux CI opt-in required');
  try{await access(stackDir+'/supabase/config.toml');throw Error('Disposable directory already exists');}catch(e){if(e.code!=='ENOENT')throw e;}
  await mkdir(stackDir+'/supabase/migrations',{recursive:true});await mkdir(artifacts,{recursive:true});
  await writeFile(stackDir+'/supabase/config.toml',await readFile(new URL('./config.toml',import.meta.url)));
  const source=new URL('../../supabase/migrations/',import.meta.url),manifest=[];
  for(const file of (await readdir(source)).filter(f=>/^\d+_.+\.sql$/.test(f)).sort()){
    const original=await readFile(new URL(file,source),'utf8');let sql=original;
    if(file==='20260906132736_operations_analytics_and_expiry.sql'){
      const historical="insert into public.admin_users(user_id) values ('11111111-1111-4111-8111-111111111111') on conflict do nothing;";
      check(sql.split(historical).length===2,'Historical data insert changed; review required');
      sql=sql.replace(historical,'-- Disposable replay omits the historical account assignment; schema unchanged.');
    }
    await writeFile(stackDir+'/supabase/migrations/'+file,sql);
    manifest.push({file,sourceSha256:hash(original),replaySha256:hash(sql),historicalDataInsertOmitted:sql!==original});
  }
  check(manifest.length>=72&&manifest.filter(x=>x.historicalDataInsertOmitted).length===1,'Complete migration replay manifest required');
  await writeFile(artifacts+'/migration-manifest.json',JSON.stringify(manifest,null,2));
  return manifest.length;
}
