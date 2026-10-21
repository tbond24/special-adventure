// Two comparable browser-count series, from recorded first-party activity.
(() => {
 const safe=value=>escapeHtml(String(value));
 function bounds(period,at,full=false){
  const now=new Date(at),end=new Date(now);if(period==='yesterday')end.setHours(0,0,0,0);
  const start=new Date(end);start.setHours(0,0,0,0);const single=['today','yesterday'].includes(period);
  start.setDate(start.getDate()-(period==='yesterday'?1:single?0:Number(period)-1));
  const fullEnd=new Date(start);fullEnd.setDate(fullEnd.getDate()+(single?1:Number(period)));
  if(full)end.setTime(+fullEnd);
  const buckets=[];let cursor=new Date(start);
  while(cursor<end){const next=new Date(cursor);if(single)next.setTime(+next+3600000);else next.setDate(next.getDate()+1);const stop=new Date(Math.min(+next,+end));buckets.push({start:cursor.toISOString(),end:stop.toISOString()});cursor=stop;}
  // Midnight is a valid empty period; keep an explicit zero-width bucket.
  if(!buckets.length)buckets.push({start:start.toISOString(),end:end.toISOString()});
  return {start,end,fullEnd,buckets,single,period};
 }
 async function readOne(period,at=Date.now(),full=false){
  const range=bounds(period,at,full),data=await VACANCY_BACKEND.adminTrafficMetrics(range.buckets);
  const count=n=>Number.isSafeInteger(n)&&n>=0;
  if(data?.schemaVersion!==1||data.source!=='connected_v2'||!count(data.visits)||!count(data.unique)||data.unique>data.visits||!count(data.unidentifiedEvents)||data.unidentifiedEvents>0||!Number.isFinite(Date.parse(data.generatedAt))||!Array.isArray(data.series)||data.series.length!==range.buckets.length||data.series.some((p,i)=>!count(p.visits)||!count(p.unique)||p.unique>p.visits||!count(p.registered)||!count(p.nonRegistered)||!count(p.unknown)||Date.parse(p.at)!==Date.parse(range.buckets[i].end)))throw Error('Traffic history unavailable or incomplete');
  const repeat=data.repeat;if(!repeat||!['total','registered','nonRegistered','unknown'].every(k=>count(repeat[k]))||repeat.total!==repeat.registered+repeat.nonRegistered+repeat.unknown||repeat.total>data.unique||data.series.some(p=>p.registered+p.nonRegistered+p.unknown>repeat.total))throw Error('Repeat visitor counts do not reconcile');
  return {range,data};
 }
 async function read(period,at=Date.now()){
  const current=await readOne(period,at),previousAt=new Date(at),days=['today','yesterday'].includes(period)?1:Number(period);
  previousAt.setDate(previousAt.getDate()-days);
  const previous=await readOne(period,previousAt);return {...current,previous};
 }
 function render({range,data,previous},kind='visitors'){
  const repeat=kind==='repeat_visitors',fields=repeat?['registered','nonRegistered']:['visits','unique'],total=repeat?data.repeat.total:data.visits,before=repeat?previous.data.repeat.total:previous.data.visits;
  const change=before===0?(total?'New':'0% →'):(total>before?'+':total<before?'−':'')+Math.abs((total-before)/before*100).toLocaleString(undefined,{maximumFractionDigits:1})+'% '+(total>before?'↑':total<before?'↓':'→');
  const label=period=>period==='today'?'vs yesterday':period==='yesterday'?'vs the day before':'vs last '+period+' days';
  const make=(source,field,shift=0)=>source.data.series.map((p,i)=>({start:Date.parse(source.range.buckets[i].start)+shift,end:Date.parse(p.at)+shift,value:p[field]}));
  const colors=['#2fa586','#347ef0'],names=repeat?['Registered','Guests']:['Visits','Unique visitors'];
  const shift=+range.start-previous.range.start;
  const series=fields.map((field,i)=>({id:field,label:names[i],color:colors[i],values:make({range,data},field)}));
  const secondary=repeat?data.repeat.registered.toLocaleString()+' registered · '+data.repeat.nonRegistered.toLocaleString()+' guests'+(data.repeat.unknown?' · '+data.repeat.unknown.toLocaleString()+' unknown':''):data.unique.toLocaleString()+' unique visitors';
  return '<div class="overview-card-summary"><strong data-metric-value>'+total.toLocaleString()+'</strong><div class="overview-card-comparison"><p class="overview-card-change" data-direction="'+(total>before?'up':total<before?'down':'same')+'">'+safe(change)+'</p><small>'+label(range.period)+'</small></div></div><p class="overview-card-secondary">'+safe(secondary)+'</p><div class="overview-card-graph">'+VACANCY_CHART.render(series,{start:+range.start,end:+range.fullEnd,single:range.single,label:names.join(' and ')})+'</div>';

 }
 window.VACANCY_VISITOR_TILE=Object.freeze({read,render,bounds});
})();
