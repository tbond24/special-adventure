// Two comparable browser-count series, from recorded first-party activity.
(() => {
 const safe=value=>escapeHtml(String(value));
 function bounds(period,at){
  const now=new Date(at),end=new Date(now);if(period==='yesterday')end.setHours(0,0,0,0);
  const start=new Date(end);start.setHours(0,0,0,0);const single=['today','yesterday'].includes(period);
  start.setDate(start.getDate()-(period==='yesterday'?1:single?0:Number(period)-1));
  const fullEnd=new Date(start);fullEnd.setDate(fullEnd.getDate()+(single?1:Number(period)));
  const buckets=[];let cursor=new Date(start);
  while(cursor<end){const next=new Date(cursor);if(single)next.setTime(+next+3600000);else next.setDate(next.getDate()+1);const stop=new Date(Math.min(+next,+end));buckets.push({start:cursor.toISOString(),end:stop.toISOString()});cursor=stop;}
  // Midnight is a valid empty period; keep an explicit zero-width bucket.
  if(!buckets.length)buckets.push({start:start.toISOString(),end:end.toISOString()});
  return {start,end,fullEnd,buckets,single,period};
 }
 async function read(period,at=Date.now()){
  const range=bounds(period,at),data=await VACANCY_BACKEND.adminTrafficMetrics(range.buckets);
  const count=n=>Number.isSafeInteger(n)&&n>=0;
  if(data?.schemaVersion!==1||data.source!=='connected_v2'||!count(data.visits)||!count(data.unique)||data.unique>data.visits||!count(data.unidentifiedEvents)||data.unidentifiedEvents>0||!Number.isFinite(Date.parse(data.generatedAt))||!Array.isArray(data.series)||data.series.length!==range.buckets.length||data.series.some((p,i)=>!count(p.visits)||!count(p.unique)||p.unique>p.visits||!count(p.registered)||!count(p.nonRegistered)||!count(p.unknown)||Date.parse(p.at)!==Date.parse(range.buckets[i].end)))throw Error('Traffic history unavailable or incomplete');
  const repeat=data.repeat;if(!repeat||!['total','registered','nonRegistered','unknown'].every(k=>count(repeat[k]))||repeat.total!==repeat.registered+repeat.nonRegistered+repeat.unknown||repeat.total>data.unique||data.series.some(p=>p.registered+p.nonRegistered+p.unknown>repeat.total))throw Error('Repeat visitor counts do not reconcile');
  return {range,data};
 }
 function render({range,data},kind='visitors'){
  const repeating=kind==='repeat_visitors',fields=repeating?['registered','nonRegistered']:['visits','unique'];
  const maximum=Math.max(...data.series.flatMap(p=>fields.map(field=>p[field])),1),power=10**Math.floor(Math.log10(maximum)),max=Math.ceil(maximum/power)*power;
  const x=t=>30+(t-range.start)/Math.max(1,range.fullEnd-range.start)*130,y=n=>70-n/max*58;
  const series=field=>{const points=data.series.flatMap((p,i)=>i===0?[[+range.start,p[field]],[Date.parse(p.at),p[field]]]:[[Date.parse(p.at),p[field]]]);return points.map(([t,n])=>x(t)+','+y(n)).join(' ')};
  let grid='';for(let i=1;i<4;i++)grid+='<line x1="30" x2="160" y1="'+(12+i*14.5)+'" y2="'+(12+i*14.5)+'" stroke="#e5e7eb"/>';
  const units=range.single?24:Number(range.period),major=range.single?3:units<=7?1:units<=30?7:14;
  for(let i=1;i<units;i++){const isMajor=i%major===0;grid+='<line class="'+(isMajor?'grid-major':'grid-minor')+'" x1="'+(30+i/units*130)+'" x2="'+(30+i/units*130)+'" y1="12" y2="70" stroke="#e5e7eb" stroke-width="'+(isMajor?1:.5)+'"/>';}
  const tick=date=>range.single?date.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}):date.toLocaleDateString(undefined,{month:'short',day:'numeric'});
  const total=repeating?data.repeat.total:data.visits;
  const first=repeating?'Registered':'Visits',second=repeating?'Non-registered':'Unique visitors';
  const note=repeating?data.repeat.registered.toLocaleString()+' registered · '+data.repeat.nonRegistered.toLocaleString()+' non-registered'+(data.repeat.unknown?' · '+data.repeat.unknown+' unknown':''):data.unique.toLocaleString()+' unique in period';
  const description=repeating?'Repeat means at least two distinct sessions within the selected period. Each interval counts visitors after their second session is observed. Account status is based on currently linked accounts; logged-out account holders cannot be identified.':'Visits count distinct browser/session pairs with activity in each interval. Page loads do not create extra visits. A session spanning intervals counts in both; period totals deduplicate. Unique visitors count browser IDs, not people.';
  return '<strong data-metric-value>'+total.toLocaleString()+'</strong><div class="visitor-tile-legend"><span style="--visitor-line:#2fa586">'+first+'</span><span style="--visitor-line:#347ef0">'+second+'</span></div><small data-visitor-total>'+safe(note)+'</small><div class="overview-card-graph"><svg viewBox="0 0 170 94" role="img" aria-label="'+safe(first+' and '+second+' per '+(range.single?'hour':'day'))+'"><title>'+safe(description)+'</title>'+grid+'<text x="24" y="15" text-anchor="end" fill="#737b89" font-size="9">'+new Intl.NumberFormat(undefined,{notation:'compact'}).format(max)+'</text><text x="24" y="72" text-anchor="end" fill="#737b89" font-size="9">0</text><polyline data-visitor-series="'+fields[0]+'" points="'+series(fields[0])+'" fill="none" stroke="#2fa586" stroke-width="2"/><polyline data-visitor-series="'+fields[1]+'" points="'+series(fields[1])+'" fill="none" stroke="#347ef0" stroke-width="2"/><text x="30" y="88" fill="#737b89" font-size="9">'+safe(tick(range.start))+'</text><text x="160" y="88" text-anchor="end" fill="#737b89" font-size="9">'+safe(range.single?'24:00':tick(new Date(range.fullEnd.getFullYear(),range.fullEnd.getMonth(),range.fullEnd.getDate()-1)))+'</text></svg></div>';

 }
 window.VACANCY_VISITOR_TILE=Object.freeze({read,render});
})();
