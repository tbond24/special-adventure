import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {File} from 'node:buffer';

// Intended destination: qa/account-drafts/sql/edit-photo-order.test.mjs.
const repo=process.env.VACANCY_REPO||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const baseMigration='20261011000329_private_account_listing_drafts.sql';
async function reviewedReplacement(){
  if(process.env.VACANCY_EDIT_PHOTO_ORDER_SQL)return fs.readFile(process.env.VACANCY_EDIT_PHOTO_ORDER_SQL,'utf8');
  const directory=path.join(repo,'supabase/migrations');
  for(const name of (await fs.readdir(directory)).filter(name=>name.endsWith('.sql')&&name>baseMigration).sort().reverse()){
    const sql=await fs.readFile(path.join(directory,name),'utf8');
    if(sql.includes('create or replace function public.listing_draft_publish_action(')&&sql.includes('Existing listings retain append-only sort positions after deletions.'))return sql;
  }
  throw new Error('The reviewed photo-order migration is not recorded yet; set VACANCY_EDIT_PHOTO_ORDER_SQL to the approved local proposal for isolated review.');
}
const {database}=await import(pathToFileURL(path.join(repo,'qa/data-repairs/engine.mjs')));
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const alice=id(8001),bob=id(8002),guest=id(8003);
const signature='public.listing_draft_publish_action(uuid,bigint,uuid,uuid,text,jsonb)';

test('real client appends at order 8 after deleting a non-last photo from eight',async()=>{
  const token='synthetic.'+Buffer.from(JSON.stringify({sub:alice,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.synthetic';
  const session=JSON.stringify({access_token:token,user:{id:alice,is_anonymous:false}});
  const room=id(8010),vacancy=id(8011),media=Array.from({length:7},(_,i)=>({id:'old-'+i,sort_order:i+1,storage_path:'existing-'+i+'.jpg'}));
  const answer=body=>({ok:true,status:200,text:async()=>JSON.stringify(body)});let captured;
  const context={crypto:webcrypto,File,Blob,Date,URLSearchParams,atob:v=>Buffer.from(v,'base64').toString('binary'),localStorage:{getItem:()=>session},fetch:async(url)=>{
    const pathname=new URL(url).pathname;
    if(pathname==='/auth/v1/user')return answer({id:alice,is_anonymous:false});
    if(pathname==='/rest/v1/vacancies')return answer([{id:vacancy,room_id:room,rooms:{properties:{owner_id:alice}}}]);
    if(pathname==='/rest/v1/media')return answer(media);
    if(pathname.startsWith('/storage/v1/object/room-media/'))return answer({});
    throw new Error('Unexpected synthetic request '+pathname);
  }};
  context.window=context;vm.createContext(context);vm.runInContext(await fs.readFile(path.join(repo,'app/src/backend.js'),'utf8'),context);
  await context.VACANCY_BACKEND.withDraftPublication({ownerId:alice,editing:true,requestId:id(8012),head:{draftId:id(8013),publishToken:id(8014),revision:2},action:async(action,args)=>{captured={action,args};return{id:id(8015)}}},()=>context.VACANCY_BACKEND.uploadListingImages(vacancy,[new File(['replacement'],'replacement.jpg',{type:'image/jpeg',lastModified:1})]));
  assert.equal(captured.action,'link_media');assert.equal(captured.args.p_order,8);
});

test('isolated full-migration compatibility fix preserves boundaries and append order',async t=>{
  const db=await database({beforeMigration:'20261011000329'});await db.exec(await fs.readFile(path.join(repo,'supabase/migrations',baseMigration),'utf8'));let serial=8100;
  const rows=async(sql,args=[])=>(await db.query(sql,args)).rows;
  const admin=()=>db.exec('reset role');
  const role=async(user=alice)=>{await admin();await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(user?{sub:user,role:'authenticated',is_anonymous:user===guest}:{role:'anon'})]);await db.exec('set role '+(user?'authenticated':'anon'));};
  const head=async state=>(await rows('select * from public.listing_drafts where id=$1',[state.draft]))[0];
  const active=state=>rows("select id,storage_path,sort_order,status from public.media where room_id=$1 and status='active' order by sort_order,id",[state.room]);
  const prepare=async({edit=true,orders=[]}={})=>{
    await admin();const state={property:id(serial++),room:id(serial++),vacancy:id(serial++),request:id(serial++),source:id(serial++),transfer:id(serial++),token:id(serial++),revision:2};
    await rows("insert into public.properties(id,owner_id,title,state,city,suburb) values($1,$2,'Synthetic','Nairobi','Nairobi','Westlands')",[state.property,alice]);
    await rows("insert into public.rooms(id,property_id,name) values($1,$2,'Synthetic unit')",[state.room,state.property]);
    await rows("insert into public.vacancies(id,room_id,weekly_rent,monthly_rent,rent_amount,rent_currency,rent_period,status,client_request_id) values($1,$2,100,100,100,'KES','month',$3,$4)",[state.vacancy,state.room,edit?'active':'draft',state.request]);
    for(const order of orders)await rows("insert into public.media(owner_id,room_id,storage_path,mime_type,sort_order,status) values($1,$2,$3,'image/jpeg',$4,'active')",[alice,state.room,`${alice}/${state.room}/old-${order}.jpg`,order]);
    await role();state.draft=(await rows('select * from public.begin_listing_draft($1)',[state.source]))[0].id;
    const payload={version:1,scope:edit?'edit-'+state.vacancy:'property-'+state.property,editVacancy:edit?state.vacancy:null,shared:{},units:[{_requestId:state.request}]};
    await rows('select * from public.stage_listing_draft($1,$2,0,$3,$4,$5,$6)',[state.draft,state.transfer,payload,'[]',edit?null:state.property,edit?state.vacancy:null]);
    await rows('select * from public.commit_listing_draft($1,$2,0)',[state.draft,state.transfer]);
    await rows('select * from public.begin_listing_draft_publish($1,1,$2)',[state.draft,state.token]);
    return state;
  };
  const tagged=(state,{revision=state.revision,token=state.token,owner=alice,request=state.request,room=state.room}={})=>`${owner}/${room}/draft-${state.draft}-${token}-${revision}-${request}-${String(serial++).padStart(64,'a')}.jpg`;
  const upload=async(state,options={})=>{const name=tagged(state,options);await rows("insert into storage.objects(bucket_id,name,owner_id,metadata) values('room-media',$1,$2,$3)",[name,options.owner||alice,options.metadata||{size:11,mimetype:'image/jpeg'}]);return name;};
  const link=(state,name,order,overrides={})=>rows('select public.listing_draft_publish_action($1,$2,$3,$4,\'link_media\',$5) as result',[overrides.draft||state.draft,overrides.revision??state.revision,overrides.token||state.token,overrides.request||state.request,{p_vacancy_id:state.vacancy,p_path:name,p_mime:'image/jpeg',p_order:order,p_bytes:11,...overrides.args}]).then(result=>result[0].result);
  const catalog=async()=>({
    policies:await rows('select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies order by 1,2,3'),
    functions:await rows("select oid::regprocedure::text as signature,pg_get_functiondef(oid) as definition,proacl::text as acl from pg_proc where pronamespace in ('public'::regnamespace,'private'::regnamespace) and oid<>$1::regprocedure order by 1",[signature]),
    target:await rows('select oid,proowner,proacl::text,prosecdef,proconfig,proargnames,proargtypes::text,prorettype,provolatile from pg_proc where oid=$1::regprocedure',[signature]),
    grants:await rows("select grantee,table_schema,table_name,privilege_type from information_schema.role_table_grants where table_schema in ('public','storage') order by 1,2,3,4"),
    buckets:await rows('select * from storage.buckets order by id'),
    triggers:await rows("select tgrelid::regclass::text,tgname,pg_get_triggerdef(oid) as definition,tgenabled from pg_trigger where not tgisinternal order by 1,2")
  });
  try{
    await rows("insert into auth.users(id,is_anonymous,raw_user_meta_data) values($1,false,'{\"display_name\":\"Synthetic Alice\"}'),($2,false,'{\"display_name\":\"Synthetic Bob\"}'),($3,true,'{\"display_name\":\"Synthetic guest\"}')",[alice,bob,guest]);
    let gap,path8;
    await t.test('unchanged candidate reproduces rejection with seven existing orders 1..7',async()=>{
      gap=await prepare({orders:[1,2,3,4,5,6,7]});path8=await upload(gap);
      await assert.rejects(link(gap,path8,8),/Invalid media metadata/);assert.equal((await active(gap)).length,7);assert.equal(Number((await head(gap)).revision),2);
    });
    await t.test('replacement changes only target body and preserves its OID, INVOKER, fixed search path and ACL plus all policies/grants/triggers/buckets',async()=>{
      await admin();const before=await catalog();
      assert.equal(before.target[0].prosecdef,false);
      const proposal=await reviewedReplacement();
      await db.exec(proposal);assert.deepEqual(await catalog(),before);
      await db.exec(proposal);assert.deepEqual(await catalog(),before);
      const now=(await rows('select pg_get_functiondef($1::regprocedure) as definition',[signature]))[0].definition;
      assert.match(now,/2147483647/);await role();
    });
    await t.test('seven gapped photos append at 8, existing main/order unchanged, exact retry does not duplicate',async()=>{
      const before=await active(gap),out=await link(gap,path8,8),after=await active(gap);
      assert.equal(after.length,8);assert.deepEqual(after.slice(0,7),before);assert.equal(after.at(-1).storage_path,path8);assert.equal(after.at(-1).sort_order,8);
      assert.equal(Number(out.head.revision),3);const again=await link(gap,path8,8);assert.deepEqual(again,out);assert.equal((await active(gap)).length,8);gap.revision=3;
    });
    await t.test('ninth photo remains rejected even with valid append order 9',async()=>{
      const name=await upload(gap),before=await active(gap);await assert.rejects(link(gap,name,9),/Maximum 8 uploaded images/);assert.deepEqual(await active(gap),before);assert.equal(Number((await head(gap)).revision),3);
    });
    await t.test('a separate edit draft for the same room rechecks the committed eighth photo',async()=>{
      const other={...gap,source:id(serial++),transfer:id(serial++),request:id(serial++),token:id(serial++),revision:2};
      other.draft=(await rows('select * from public.begin_listing_draft($1)',[other.source]))[0].id;
      const payload={version:1,scope:'edit-'+other.vacancy,editVacancy:other.vacancy,shared:{},units:[{_requestId:other.request}]};
      await rows('select * from public.stage_listing_draft($1,$2,0,$3,\'[]\',null,$4)',[other.draft,other.transfer,payload,other.vacancy]);
      await rows('select * from public.commit_listing_draft($1,$2,0)',[other.draft,other.transfer]);
      await rows('select * from public.begin_listing_draft_publish($1,1,$2)',[other.draft,other.token]);
      const name=await upload(other);await assert.rejects(link(other,name,9),/Maximum 8 uploaded images/);
      assert.equal((await active(other)).length,8);assert.equal(Number((await head(other)).revision),2);
    });
    await t.test('new listing still rejects order 8 and accepts order 7',async()=>{
      const state=await prepare({edit:false}),name=await upload(state);await assert.rejects(link(state,name,8),/Invalid media metadata/);assert.equal((await active(state)).length,0);const out=await link(state,name,7);assert.equal(out.result.sort_order,7);
    });
    await t.test('edit accepts canonical boundary integers 0, 8, 2147483647',async()=>{
      for(const order of [0,8,2147483647]){const state=await prepare(),name=await upload(state);const out=await link(state,name,order);assert.equal(out.result.sort_order,order);}
    });
    await t.test('edit rejects negative, decimal, missing, malformed, noncanonical and overflow without mutation',async()=>{
      const state=await prepare(),name=await upload(state);
      for(const order of [-1,-2147483648,1.5,2147483648,9999999999,'9999999999999999999999999999','08','+8',' 8','8 ','8.0','8e0','NaN','Infinity','',null,true,{},[],undefined]){
        await assert.rejects(link(state,name,order),/Invalid media metadata/,String(order));
        assert.equal(Number((await head(state)).revision),2);assert.equal((await active(state)).length,0);
      }
    });
    await t.test('new listings reject other canonical positive integers above 7 and malformed orders',async()=>{
      const state=await prepare({edit:false}),name=await upload(state);
      for(const order of [8,2147483647,-1,1.5,'07','+1',null,undefined])await assert.rejects(link(state,name,order),/Invalid media metadata/);
      assert.equal((await active(state)).length,0);
    });
    await t.test('MIME, bytes and actual Storage metadata must still match',async()=>{
      const state=await prepare(),name=await upload(state);
      for(const args of [{p_mime:'image/gif'},{p_bytes:0},{p_bytes:10485761},{p_bytes:'invalid'}])await assert.rejects(link(state,name,8,{args}),/Invalid media metadata/);
      for(const args of [{p_mime:'image/png'},{p_bytes:10},{p_path:`${alice}/${state.room}/missing.jpg`}])await assert.rejects(link(state,name,8,{args}),/Media object unavailable/);
      assert.equal((await active(state)).length,0);
    });
    await t.test('foreign account, anonymous account and anon retain denial',async()=>{
      const state=await prepare(),name=await upload(state);
      for(const user of [bob,guest,null]){await role(user);await assert.rejects(link(state,name,8),/permission denied|Draft unavailable|Active permanent account required/);}
      await role();assert.equal((await active(state)).length,0);assert.equal(Number((await head(state)).revision),2);
    });
    await t.test('foreign listing target, request identity, token and stale revision retain denial',async()=>{
      const state=await prepare(),other=await prepare(),name=await upload(state);
      for(const override of [{args:{p_vacancy_id:other.vacancy}},{request:id(8990)},{token:id(8991)},{revision:1}])await assert.rejects(link(state,name,8,override),/Listing unavailable|Unit is not in draft|Publish fence changed|Draft revision conflict/);
      assert.equal((await active(state)).length,0);assert.equal(Number((await head(state)).revision),2);
    });
    await t.test('tagged Storage insert checks current token, revision, owner, unit and MIME unchanged',async()=>{
      const state=await prepare();
      for(const options of [{revision:1},{token:id(8992)},{owner:bob},{request:id(8993)},{room:id(8994)},{metadata:{size:11,mimetype:'image/png'}}])await assert.rejects(upload(state,options),/row-level security|fence|target unavailable|MIME mismatch/);
      const name=await upload(state);assert.equal((await rows('select * from storage.objects where name=$1',[name])).length,1);
    });
    await t.test('recovery fences stale gateway link and privileged final Storage insert',async()=>{
      const state=await prepare(),name=await upload(state),late=tagged(state);
      await rows('select * from public.finish_listing_draft_publish($1,2,$2,$3)',[state.draft,state.token,id(serial++)]);
      await assert.rejects(link(state,name,8),/Draft revision conflict/);
      await assert.rejects(link(state,name,8,{revision:3}),/Publish fence changed/);
      await admin();await db.query("select set_config('request.jwt.claims','{}',false)");
      await assert.rejects(rows("insert into storage.objects(bucket_id,name,owner_id,metadata) values('room-media',$1,$2,'{\"size\":11,\"mimetype\":\"image/jpeg\"}')",[late,alice]),/Draft upload fence changed/);
      assert.equal((await rows('select * from storage.objects where name=$1',[late])).length,0);await role();assert.equal((await active(state)).length,0);
    });
  }finally{await db.close();}
});
