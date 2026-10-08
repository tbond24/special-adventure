import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {database,root} from './engine.mjs';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const alice=id(1),bob=id(2),guest=id(3),suspended=id(4),stranger=id(5),admin='11111111-1111-4111-8111-111111111111';
const property=id(10),otherProperty=id(11),room=id(20),otherRoom=id(21),vacancy=id(30),expired=id(31),paused=id(32),unlimited=id(33),conversation=id(40),foreignConversation=id(41);
test('real PostgreSQL migration replay and security/caller matrix',async t=>{
 const db=await database();
 const role=async(user,extra={})=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(user?{sub:user,role:'authenticated',is_anonymous:user===guest,aal:'aal1',...extra}:{role:'anon'})]);await db.exec(`set role ${user?'authenticated':'anon'}`);};
 const owner=async()=>db.exec('reset role');
 const rows=async(sql,args=[])=>(await db.query(sql,args)).rows;
 const denied=async(sql,args=[],match=/permission denied|row-level security|active account|required|unavailable|not a conversation member|not found/i)=>assert.rejects(db.query(sql,args),match);
 const queryCount=async(table)=>(await rows(`select count(*)::int as n from ${table}`))[0].n;
 try{
 await db.query("insert into auth.users(id,raw_user_meta_data,email_confirmed_at,is_anonymous) select x,'{\"display_name\":\"Synthetic member\"}',now(),x=$2::uuid from unnest($1::uuid[]) x",[[alice,bob,guest,suspended,stranger],guest]);
 await db.query("update public.profiles set account_status='suspended' where id=$1",[suspended]);
 await db.query("insert into public.properties(id,owner_id,title,state,city,suburb,country,market_code) values($1,$2,'Property','Nairobi','Nairobi','Westlands','Kenya','KE'),($3,$4,'Other','Nairobi','Nairobi','East','Kenya','KE')",[property,alice,otherProperty,bob]);
 await db.query("insert into public.property_private_locations(property_id,address_line) values($1,'Private address'),($2,'Other address')",[property,otherProperty]);
 await db.query("insert into public.rooms(id,property_id,name,unit_type) values($1,$2,'Room','Studio'),($3,$4,'Other room','Studio')",[room,property,otherRoom,otherProperty]);
 for(const [v,r,status,expires] of [[vacancy,room,'active','2100-01-01'],[expired,room,'active','2000-01-01'],[paused,room,'paused','2100-01-01'],[unlimited,room,'active',null]])await db.query("insert into public.vacancies(id,room_id,weekly_rent,monthly_rent,rent_amount,rent_currency,rent_period,available_from,status,expires_at) values($1,$2,10000,10000,10000,'KES','month','2026-10-08',$3,$4)",[v,r,status,expires]);
 await db.query('insert into public.conversations(id,vacancy_id) values($1,$2),($3,$4)',[conversation,vacancy,foreignConversation,expired]);
 await db.query('insert into public.conversation_members(conversation_id,user_id) values($1,$2),($1,$3),($4,$2),($4,$5)',[conversation,alice,bob,foreignConversation,stranger]);
 await db.query("insert into public.messages(conversation_id,sender_id,body) values($1,$2,'Private foreign history')",[foreignConversation,stranger]);
 await db.query("insert into storage.objects(bucket_id,name,owner_id) values('room-media','legacy/photo.jpg',$1),('room-media','other/photo.jpg',$2),('room-media','missing-owner.jpg',null)",[alice,bob]);
 await t.test('baseline contract and 65 migrations replay unchanged',async()=>{const checks=await rows(await fs.readFile(path.join(root,'supabase/verify_baseline.sql'),'utf8'));assert.deepEqual(checks.filter(c=>!c.ok),[]);assert.equal(await queryCount('supabase_migrations.schema_migrations'),65);});
 await t.test('membership read marker works; identity/foreign-history reassignment denied',async()=>{
  await role(bob);assert.equal((await rows('select * from public.messages where conversation_id=$1',[foreignConversation])).length,0);
  for(const [col,value] of [['conversation_id',foreignConversation],['user_id',stranger],['joined_at','2000-01-01']])await denied(`update public.conversation_members set ${col}=$1 where conversation_id=$2 and user_id=$3`,[value,conversation,bob]);
  assert.equal((await db.query("update public.conversation_members set last_read_at='2030-01-01' where conversation_id=$1 and user_id=$2 returning last_read_at",[conversation,bob])).rows.length,1);
  assert.equal((await db.query("update public.conversation_members set last_read_at='2030-01-01' where conversation_id=$1 and user_id=$2 returning last_read_at",[conversation,alice])).rows.length,0);
 });
 await t.test('profile actual edit/Google/avatar allowlist; verification and status denied',async()=>{
  await role(alice);assert.equal((await rows("update public.profiles set display_name='New name',avatar_path='legacy/avatar.jpg' where id=$1 returning display_name,avatar_path",[alice])).length,1);
  for(const [col,value] of [['phone_verified','true'],['account_status',"'active'"],['bio',"'unexpected writer'"],['created_at','now()'],['updated_at','now()']])await denied(`update public.profiles set ${col}=${value} where id=$1`,[alice]);
  assert.equal((await rows("update public.profiles set display_name='Not mine' where id=$1 returning id",[bob])).length,0);
  await role(guest);assert.equal((await rows("update public.profiles set display_name='Guest edit' where id=$1 returning id",[guest])).length,0);
 });
 await t.test('media accepts owned legacy path, room and property; rejects foreign parents/object/missing owner',async()=>{
  await role(alice);
  const insert=(p,r,path)=>db.query('insert into public.media(owner_id,property_id,room_id,storage_path) values($1,$2,$3,$4) returning id',[alice,p,r,path]);
  const media=(await insert(null,room,'legacy/photo.jpg')).rows[0].id;
  assert.equal((await insert(property,null,'legacy/photo.jpg')).rows.length,1);
  for(const args of [[null,otherRoom,'legacy/photo.jpg'],[otherProperty,null,'legacy/photo.jpg'],[null,room,'other/photo.jpg'],[null,room,'missing.jpg'],[null,room,'missing-owner.jpg']])await assert.rejects(insert(...args),/row-level security/);
  await denied('update public.media set room_id=$1 where id=$2',[otherRoom,media]);
  assert.equal((await rows("update public.media set sort_order=2,status='hidden' where id=$1 returning id",[media])).length,1);
 });
 await t.test('active room/path uniqueness protects insert and reactivation without changing property or hidden history',async()=>{
  await role(alice);const first=(await rows("insert into public.media(owner_id,room_id,storage_path) values($1,$2,'legacy/photo.jpg') returning id",[alice,room]))[0].id;
  await denied("insert into public.media(owner_id,room_id,storage_path) values($1,$2,'legacy/photo.jpg')",[alice,room],/duplicate key/);
  const hidden=(await rows("insert into public.media(owner_id,room_id,storage_path,status) values($1,$2,'legacy/photo.jpg','hidden') returning id",[alice,room]))[0].id;
  await denied("update public.media set status='active' where id=$1",[hidden],/duplicate key/);
  await rows("update public.media set sort_order=4 where id=$1",[first]);await rows("insert into public.media(owner_id,property_id,storage_path) values($1,$2,'legacy/photo.jpg')",[alice,property]);
 });
 await t.test('direct message insert including forged attachment is denied; invoker wrapper can send',async()=>{
  await role(bob);await denied('insert into public.messages(conversation_id,sender_id,body,media_path) values($1,$2,$3,$4)',[conversation,bob,'bypass','forged.jpg']);
  assert.ok((await rows("select public.send_message($1,'Valid message') as id",[conversation]))[0].id);
  await denied("select public.send_message($1,'foreign')",[foreignConversation]);
 });
 await t.test('bilateral block cannot be bypassed by either messaging wrapper',async()=>{
  await owner();await db.query('insert into public.blocks(blocker_id,blocked_id) values($1,$2)',[alice,bob]);await role(bob);
  await denied("select public.send_message($1,'blocked')",[conversation]);await denied("select public.start_enquiry($1,null,null,null,'blocked')",[vacancy]);
  await owner();await db.query('delete from public.blocks');
 });
 await t.test('suspended callers denied before privileged helper effects; missing profile also denied',async()=>{
  await role(suspended);await denied("select public.start_enquiry($1,null,null,null,'no')",[vacancy]);await denied("select public.send_message($1,'no')",[conversation]);await denied('select public.conversation_peer_summary($1)',[conversation]);await denied('select public.set_contact_preferences(true,false,false,false)');
  await role(id(999));await denied("select public.start_enquiry($1,null,null,null,'no')",[vacancy]);
 });
 await t.test('new enquiries reject expired/paused listings, accept active null-expiry and genuine guest',async()=>{
  await role(guest);for(const v of [expired,paused])await denied("select public.start_enquiry($1,null,null,null,'new enquiry')",[v]);
  assert.ok((await rows("select public.start_enquiry($1,null,1,'Guest','Hello') as id",[unlimited]))[0].id);
 });
 await t.test('existing conversations survive vacancy expiry and pause',async()=>{
  await owner();await db.query("update public.vacancies set status='paused',expires_at='2000-01-01' where id=$1",[vacancy]);await role(bob);
  assert.equal((await rows("select public.start_enquiry($1,null,null,null,'Continue history') as id",[vacancy]))[0].id,conversation);
  assert.ok((await rows("select public.send_message($1,'Still open') as id",[conversation]))[0].id);
  await owner();await db.query("update public.vacancies set status='active',expires_at='2100-01-01' where id=$1",[vacancy]);
 });
 await t.test('suspended owner blocks only new enquiries, not another active member replying',async()=>{
  await owner();await db.query("update public.profiles set account_status='suspended' where id=$1",[alice]);await role(stranger);await denied("select public.start_enquiry($1,null,null,null,'new')",[unlimited]);await role(bob);assert.ok((await rows("select public.send_message($1,'Existing member') as id",[conversation]))[0].id);await owner();await db.query("update public.profiles set account_status='active' where id=$1",[alice]);
 });
 await t.test('guest throttle remains active through RPC and photo wrapper',async()=>{
  await role(guest);const c=(await rows("select public.start_enquiry($1,null,null,null,'Guest second') as id",[unlimited]))[0].id;
  for(let n=0;n<8;n++)await rows("select public.send_message($1,'Guest allowed')",[c]);await denied("select public.send_message($1,'Limit')",[c],/Guest message limit/);
  await owner();const photo=`${c}/${guest}/${id(300)}.jpg`;await db.query("insert into storage.objects(bucket_id,name,owner_id) values('conversation-media',$1,$2)",[photo,guest]);await role(guest);await denied('select public.send_photo_message($1,$2,$3)',[c,'Photo',photo],/Guest message limit/);
 });
 await t.test('photo send validates Storage owner and retains checked member/block path',async()=>{
  const photo=`${conversation}/${bob}/${id(301)}.jpg`;await owner();await db.query("insert into storage.objects(bucket_id,name,owner_id) values('conversation-media',$1,$2)",[photo,bob]);await role(bob);
  const message=(await rows('select public.send_photo_message($1,$2,$3) as id',[conversation,'Photo',photo]))[0].id;assert.equal((await rows('select media_path from public.messages where id=$1',[message]))[0].media_path,photo);
  await denied('select public.send_photo_message($1,$2,$3)',[conversation,'Photo',`wrong/${photo}`],/Photo unavailable/);
 });
 await t.test('admin AAL2 and membership remain required; suspended admin denied',async()=>{
  await role(admin);assert.equal((await rows('select private.is_admin($1) as ok',[admin]))[0].ok,false);await role(admin,{aal:'aal2'});assert.equal((await rows('select private.is_admin($1) as ok',[admin]))[0].ok,true);await owner();await db.query("update public.profiles set account_status='suspended' where id=$1",[admin]);await role(admin,{aal:'aal2'});assert.equal((await rows('select private.is_admin($1) as ok',[admin]))[0].ok,false);await owner();await db.query("update public.profiles set account_status='active' where id=$1",[admin]);
 });
 await t.test('private-name clear, contacts and nickname work for active owner; foreign/guest denied',async()=>{
  await role(alice);await db.query("insert into public.room_private_names(room_id,name) values($1,'Private A1')",[room]);assert.equal((await rows('delete from public.room_private_names where room_id=$1 returning room_id',[room])).length,1);
  await rows("select public.set_property_manager_nickname($1,'My property')",[property]);await rows('select public.set_contact_preferences(true,true,false,false)');await rows('select public.conversation_peer_summary($1)',[conversation]);
  await role(bob);await denied("select public.set_property_manager_nickname($1,'Other')",[property]);await role(guest);await denied('select public.set_contact_preferences(true,false,false,false)',[],/permanent account/);
 });
 const payload={p_locality:'New area',p_city:'Nairobi',p_region:'Nairobi',p_postal:'',p_landmark:'',p_country:'Kenya',p_market_code:'KE',p_address_line:'New private address',p_property_type:'Apartment',p_household_summary:'Quiet',p_unit_name:'Edited room',p_unit_type:'Studio',p_furnished:null,p_ensuite:true,p_unit_description:'Edited',p_rent_amount:'1234567890.55',p_rent_currency:'KES',p_rent_period:'month',p_deposit:'200000000.25',p_bills_included:false,p_available_from:'2026-10-08',p_minimum_stay_weeks:4,p_parking_spaces:0,p_max_occupants:2,p_pets_considered:false,p_smoking_allowed:false,p_water_available:true,p_electricity_available:true,p_security_available:true,p_internet_available:false,p_smoking_override:null,p_pets_override:true};
 const edit=(values=payload,details={amenities:[{label:'Balcony'}]},name='Private new',lat=-1.2,lon=36.8)=>db.query('select public.update_listing_atomic($1,$2,$3,$4,$5,$6)',[vacancy,values,details,name,lat,lon]);
 await owner();await db.query("insert into public.rooms(id,property_id,name,unit_details) values($1,$2,'Sibling','{\"keep\":true}')",[id(22),property]);await db.query("insert into public.room_private_names(room_id,name) values($1,'Sibling private')",[id(22)]);
 await t.test('atomic edit writes complete caller contract with high precision legacy amounts and zero coordinates',async()=>{
  await role(alice);await edit(payload,undefined,'Private new',0,0);assert.equal((await rows('select rent_amount::text,bond::text from public.vacancies where id=$1',[vacancy]))[0].rent_amount,'1234567890.55');assert.equal(Number((await rows('select public_latitude::text from public.properties where id=$1',[property]))[0].public_latitude),0);assert.equal((await rows('select name from public.room_private_names where room_id=$1',[room]))[0].name,'Private new');await edit(payload,{},'');assert.equal((await rows('select * from public.room_private_names where room_id=$1',[room])).length,0);
 });
 await t.test('shared property edit remains shared; sibling unit fields and labels unchanged',async()=>{
  await role(alice);const sibling=(await rows('select r.name,r.unit_details,p.suburb,p.public_latitude::text from public.rooms r join public.properties p on p.id=r.property_id where r.id=$1',[id(22)]))[0];assert.equal(sibling.name,'Sibling');assert.deepEqual(sibling.unit_details,{keep:true});assert.equal(sibling.suburb,'New area');assert.equal((await rows('select name from public.room_private_names where room_id=$1',[id(22)]))[0].name,'Sibling private');
  await edit(payload,{},'Keep label');await edit(payload,{},null);assert.equal((await rows('select name from public.room_private_names where room_id=$1',[room]))[0].name,'Keep label');await edit(payload,null,'');assert.deepEqual((await rows('select unit_details from public.rooms where id=$1',[room]))[0].unit_details,{});
 });
 await t.test('late coordinate failure rolls back ALL edit database changes, including private label',async()=>{
  await role(alice);const before=await rows('select r.name,r.unit_details,v.rent_amount::text,p.suburb from public.rooms r join public.vacancies v on v.room_id=r.id join public.properties p on p.id=r.property_id where v.id=$1',[vacancy]);
  await assert.rejects(edit({...payload,p_unit_name:'Must rollback',p_rent_amount:'555',p_locality:'Must rollback'},{rules:[]},'Must rollback',999,36.8),/Invalid latitude/);
  assert.deepEqual(await rows('select r.name,r.unit_details,v.rent_amount::text,p.suburb from public.rooms r join public.vacancies v on v.room_id=r.id join public.properties p on p.id=r.property_id where v.id=$1',[vacancy]),before);assert.equal((await rows('select * from public.room_private_names where room_id=$1',[room])).length,0);
 });
 await t.test('atomic edit rejects foreign, guest, suspended and malformed details',async()=>{
  await role(bob);await assert.rejects(edit(),/Vacancy not found/);await role(guest);await assert.rejects(edit(),/active permanent account/);await role(suspended);await assert.rejects(edit(),/active permanent account/);await role(alice);await assert.rejects(edit(payload,[]),/Unit details must be an object/);
 });
 await t.test('anonymous caller has no mutation/RPC privilege',async()=>{
  await role(null);await denied("select public.send_message($1,'No')",[conversation]);await denied("select public.start_enquiry($1,null,null,null,'No')",[vacancy]);await denied('update public.profiles set display_name=$1 where id=$2',['No',alice]);await denied('update public.conversation_members set last_read_at=now() where user_id=$1',[alice]);
 });
 }finally{await db.close();}
});
