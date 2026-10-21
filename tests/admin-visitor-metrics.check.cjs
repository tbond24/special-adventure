// Disposable PostgreSQL only; never reads a hosted database.
const {PGlite}=require(process.env.VACANCY_PGLITE_MODULE||'@electric-sql/pglite');const fs=require('node:fs');const assert=require('node:assert/strict');
(async()=>{const db=new PGlite();await db.exec(`create role anon;create role authenticated;create schema private;create schema auth;create function auth.uid() returns uuid language sql as 'select null::uuid';create function private.is_admin(uuid) returns boolean language sql as $$select coalesce(current_setting('test.admin',true),'no')='yes'$$;create table public.analytics_events(created_at timestamptz,visitor_id uuid,user_id uuid);create table public.admin_users(user_id uuid);`);await db.exec(fs.readFileSync('supabase/migrations/20261021130000_admin_visitor_metrics.sql','utf8'));
const now=Date.now(),buckets=[{start:new Date(now-3600000).toISOString(),end:new Date(now-1800000).toISOString()},{start:new Date(now-1800000).toISOString(),end:new Date(now).toISOString()}];const read=b=>db.query('select public.admin_visitor_metrics($1::jsonb) as p',[JSON.stringify(b)]);await assert.rejects(()=>read(buckets));await db.exec("set test.admin='yes'");
await db.exec(`insert into public.admin_users values('90000000-0000-4000-8000-000000000001');insert into public.analytics_events values
(now()-interval '45 minutes','10000000-0000-4000-8000-000000000001',null),
(now()-interval '2 minutes','10000000-0000-4000-8000-000000000001',null),
(now()-interval '3 minutes','20000000-0000-4000-8000-000000000001',null),
(now()-interval '1 minute','30000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001'),
(now()-interval '1 minute',null,null);`);
let r=(await read(buckets)).rows[0].p;assert.equal(r.live,2);assert.equal(r.unique,2);assert.deepEqual(r.series.map(p=>p.unique),[1,2]);assert.deepEqual(r.series.map(p=>p.live),[0,2]);
await assert.rejects(()=>read(Array(101).fill(buckets[0])));await assert.rejects(()=>read([buckets[1],buckets[0]]));await assert.rejects(()=>read([{start:buckets[0].start,end:new Date(now+3600000).toISOString()}]));
r=(await db.query("select has_function_privilege('anon','public.admin_visitor_metrics(jsonb)','execute') as allowed")).rows[0];assert.equal(r.allowed,false);
await db.exec('delete from public.analytics_events');r=(await read(buckets)).rows[0].p;assert.equal(r.live,0);assert.equal(r.unique,0);assert.ok(r.series.every(p=>p.live===0&&p.unique===0));await db.close();console.log('PASS: admin guard/grants, five-minute activity, interval/whole-period distinct counts, admin/missing-ID exclusion, bounds and zeros');})();
