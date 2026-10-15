// Metadata-only schema evidence and genuine local reporting checks.
import {readFile,writeFile} from 'node:fs/promises';
import {expect} from '@playwright/test';
export async function verifySourceSchema({sql,check,pass,evidence,artifacts}){
  const query=await readFile(new URL('./catalog.sql',import.meta.url),'utf8');
  const catalog=JSON.parse(await sql(query));
  check(catalog.relations.some(x=>x.schema==='public'&&x.name==='listing_activity_log'&&x.rls===true),'Recovered activity table must exist with RLS');
  for(const table of ['properties','rooms','vacancies']){
    const trigger=catalog.triggers.find(x=>x.table===table&&x.name==='listing_activity_'+table);
    check(trigger?.enabled==='O','Recovered activity trigger must be enabled on '+table);
  }
  await writeFile(artifacts+'/source-catalog.json',JSON.stringify(catalog,null,2));
  evidence.sourceCatalogCounts=Object.fromEntries(Object.entries(catalog).map(([k,v])=>[k,v?.length||0]));
  pass('Source schema includes recovered historical activity table, RLS and all three enabled triggers');
}
export async function verifyActivityReporting({sql,rpc,owner,page,check,pass,evidence}){
  const activity=JSON.parse(await sql("select json_build_object('created',(select count(*) from public.listing_activity_log where entity_type in ('property','unit','listing') and action='created'),'paused',(select count(*) from public.listing_activity_log where entity_id='55555555-5555-4555-8555-555555555555' and actor_id='"+owner.id+"' and old_status='active' and new_status='paused'),'reactivated',(select count(*) from public.listing_activity_log where entity_id='55555555-5555-4555-8555-555555555555' and actor_id='"+owner.id+"' and old_status='paused' and new_status='active'));"));
  check(activity.created>=3&&activity.paused>=1&&activity.reactivated>=1,'Real UI moderation must produce correctly attributed activity transitions');
  evidence.activityRecovery=activity;
  pass('Real listing creation and reasoned UI moderation fire the recovered activity triggers');
  const range={p_from:new Date(Date.now()-86400000).toISOString(),p_to:new Date(Date.now()+60000).toISOString()};
  const report=await rpc('admin_connected_journeys',owner,range);
  check(report.ok&&report.data?.schemaVersion===2&&report.data.complete===true,'Connected report must execute with real activity dependency');
  const legacy=await rpc('admin_lister_marketing',owner,range);
  check(legacy.ok&&legacy.data&&typeof legacy.data==='object','Legacy reporting must execute with restored activity dependency');
  await page.locator('#adminSectionMenu [data-section=marketing]').click();
  await expect(page.locator('.console-journey .journey-freshness')).toContainText('Report generated');
  await expect(page.locator('.console-journey .journey-stats')).toBeVisible();
  await expect(page.locator('.console-journey [role=alert]')).toHaveCount(0);
  pass('Actual connected and legacy reports query restored activity schema; Marketing renders validated server data');
}
