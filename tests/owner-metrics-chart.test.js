const {test}=require('node:test');
const assert=require('node:assert/strict');
const {rangeFor,readSeries,count}=require('../app/src/owner-metrics-chart.js');
function payload(range,until) {
  const buckets=[];let cursor=+new Date(range.from);
  while(cursor<until){const next=new Date(cursor);if(range.granularity==='hour')next.setTime(cursor+3600000);else next.setDate(next.getDate()+1);const end=Math.min(+next,until);buckets.push({from:new Date(cursor).toISOString(),to:new Date(end).toISOString(),impressions:0,clicks:0,message_arrivals:0});cursor=end;}
  return {...range,observed_until:new Date(until).toISOString(),clicks_are_unique:true,buckets};
}
test('today uses local midnight boundaries and hourly data; 7 and 30 days use calendar days',()=>{
  const now=new Date(2026,9,11,14,0);const today=rangeFor('today',null,null,now);assert.equal(today.granularity,'hour');assert.equal(new Date(today.from).getHours(),0);assert.equal(new Date(today.to).getDate(),12);assert.equal(rangeFor('7',null,null,now).granularity,'day');assert.equal(new Date(rangeFor('30',null,null,now).from).getDate(),12);
});
test('inclusive custom dates and invalid/future/too-long ranges',()=>{
  const now=new Date(2026,9,11,14,0);assert.equal(rangeFor('custom','2026-10-09','2026-10-09',now).granularity,'hour');assert.throws(()=>rangeFor('custom','','2026-10-01',now));assert.throws(()=>rangeFor('custom','2026-10-02','2026-10-01',now));assert.throws(()=>rangeFor('custom','2024-01-01','2026-10-01',now));assert.throws(()=>rangeFor('custom','2026-10-12','2026-10-12',now));
});
test('missing/null/string/negative counts are unavailable, never zero',()=>{for(const v of [undefined,null,'0',NaN,-1,1.5])assert.equal(count(v),null);assert.equal(count(0),0);});
test('complete zero buckets are valid; missing buckets, malformed response and legacy opens fail closed',()=>{
  const range=rangeFor('today',null,null,new Date(2026,9,11,14));const p=payload(range,+new Date(2026,9,11,14,30));assert.equal(readSeries(p,range).buckets.length,15);assert.throws(()=>readSeries({...p,buckets:p.buckets.slice(1)},range));assert.throws(()=>readSeries({...p,clicks_are_unique:false},range));assert.throws(()=>readSeries({...p,timezone:'Not/real'},range));assert.throws(()=>readSeries({...p,buckets:[{...p.buckets[0],clicks:null},...p.buckets.slice(1)]},range));
});
test('no future buckets are manufactured and an empty current interval is explicit',()=>{
  const range=rangeFor('today',null,null,new Date(2026,9,11,14));const p=payload(range,+new Date(2026,9,11,14,30));assert.equal(new Date(readSeries(p,range).buckets.at(-1).to).getMinutes(),30);assert.equal(readSeries(payload(range,+new Date(range.from)),range).buckets.length,0);
});
test('DST spring and fall days contain 23 and 25 real hours in New York',()=>{
  const original=process.env.TZ;process.env.TZ='America/New_York';try{for(const [date,hours] of [['2026-03-08',23],['2026-11-01',25]]){const range=rangeFor('custom',date,date,new Date(2026,11,1));assert.equal((+new Date(range.to)-+new Date(range.from))/3600000,hours);assert.equal(readSeries(payload(range,+new Date(range.to)),range).buckets.length,hours);}}finally{if(original===undefined)delete process.env.TZ;else process.env.TZ=original;}
});
test('daily bins use local midnight over DST rather than fixed 24-hour shifts',()=>{
  const original=process.env.TZ;process.env.TZ='America/New_York';try{const range=rangeFor('custom','2026-10-30','2026-11-03',new Date(2026,11,1));const rows=readSeries(payload(range,+new Date(range.to)),range).buckets;assert.equal(rows.length,5);assert.ok(rows.every(row=>new Date(row.from).getHours()===0));assert.equal((+new Date(rows[2].to)-+new Date(rows[2].from))/3600000,25);}finally{if(original===undefined)delete process.env.TZ;else process.env.TZ=original;}
});
test('the backend adapter sends one timezone-aware call to the existing endpoint',async()=>{
 const vm=require('node:vm'),fs=require('node:fs');const calls=[],session={access_token:'synthetic.'+Buffer.from(JSON.stringify({sub:'synthetic-owner',exp:4102444800})).toString('base64')+'.synthetic',refresh_token:'synthetic'};
 const context={window:{},localStorage:{getItem:()=>JSON.stringify(session),removeItem(){},setItem(){}},fetch:async(url,options)=>{calls.push({url,options});return{ok:true,text:async()=>JSON.stringify({impressions:5,clicks:2,messages:1})};},atob:v=>Buffer.from(v,'base64').toString(),URLSearchParams,Date,Map,Set,JSON,console};
 vm.runInNewContext(fs.readFileSync(require.resolve('../app/src/backend.js'),'utf8'),context);
 const result=await context.window.VACANCY_BACKEND.ownerDashboardMetrics('2026-10-01T00:00:00Z','2026-10-02T00:00:00Z',{timezone:'Africa/Nairobi'});
 assert.equal(calls.length,1);assert.ok(calls[0].url.endsWith('/rest/v1/rpc/owner_dashboard_metrics'));assert.deepEqual(JSON.parse(calls[0].options.body),{p_from:'2026-10-01T00:00:00Z',p_to:'2026-10-02T00:00:00Z',p_timezone:'Africa/Nairobi'});assert.equal(result.impressions,5);
});

test('daily validation stays calendar-anchored across a midnight DST gap',()=>{
 const original=process.env.TZ;process.env.TZ='America/Santiago';try{
  const gapDay=rangeFor('custom','2026-09-06','2026-09-06',new Date(2026,9,1));assert.equal(gapDay.granularity,'hour');assert.equal((Date.parse(gapDay.to)-Date.parse(gapDay.from))/3600000,23);assert.equal(new Date(gapDay.to).getHours(),0);
  const range=rangeFor('custom','2026-09-05','2026-09-08',new Date(2026,9,1));
  const boundaries=Array.from({length:5},(_,i)=>new Date(2026,8,5+i).toISOString());
  const buckets=boundaries.slice(0,-1).map((from,i)=>({from,to:boundaries[i+1],impressions:0,clicks:0,message_arrivals:0}));
  const rows=readSeries({...range,observed_until:range.to,clicks_are_unique:true,buckets},range).buckets;
  assert.equal(rows.length,4);assert.equal(new Date(rows[1].from).getHours(),1);assert.equal(new Date(rows[2].from).getHours(),0);
  const onGap=rangeFor('custom','2026-09-06','2026-09-08',new Date(2026,9,1));
  // The current server contract anchors daily bins to the selected start's local time.
  const starts=Array.from({length:3},(_,i)=>new Date(2026,8,6+i,1).toISOString());
  const gapBuckets=starts.map((from,i)=>({from,to:starts[i+1]||onGap.to,impressions:0,clicks:0,message_arrivals:0}));
  assert.equal(readSeries({...onGap,observed_until:onGap.to,clicks_are_unique:true,buckets:gapBuckets},onGap).buckets.length,3);
 }finally{if(original===undefined)delete process.env.TZ;else process.env.TZ=original;}
});
