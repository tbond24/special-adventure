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
  return {start,end,fullEnd,buckets,single};
 }
 async function render(period,at=Date.now()){
  const range=bounds(period,at),data=await VACANCY_BACKEND.adminVisitorMetrics(range.buckets);
  const count=n=>Number.isSafeInteger(n)&&n>=0;
  if(!count(data?.live)||!count(data?.unique)||!Number.isFinite(Date.parse(data.generatedAt))||!Array.isArray(data.series)||data.series.length!==range.buckets.length||data.series.some((p,i)=>!count(p.live)||!count(p.unique)||Date.parse(p.at)!==Date.parse(range.buckets[i].end)))throw Error('Visitor history unavailable');
  const maximum=Math.max(...data.series.flatMap(p=>[p.live,p.unique]),1),power=10**Math.floor(Math.log10(maximum)),max=Math.ceil(maximum/power)*power;
  const x=t=>30+(t-range.start)/Math.max(1,range.fullEnd-range.start)*130,y=n=>70-n/max*58;
  const series=field=>{const points=data.series.flatMap((p,i)=>i===0?[[+range.start,p[field]],[Date.parse(p.at),p[field]]]:[[Date.parse(p.at),p[field]]]);return points.map(([t,n])=>x(t)+','+y(n)).join(' ')};
  let grid='';for(let i=1;i<4;i++)grid+='<line x1="30" x2="160" y1="'+(12+i*14.5)+'" y2="'+(12+i*14.5)+'" stroke="#e5e7eb"/>';
  const units=range.single?24:Number(period),major=range.single?3:units<=7?1:units<=30?7:14;
  for(let i=1;i<units;i++){const isMajor=i%major===0;grid+='<line class="'+(isMajor?'grid-major':'grid-minor')+'" x1="'+(30+i/units*130)+'" x2="'+(30+i/units*130)+'" y1="12" y2="70" stroke="#e5e7eb" stroke-width="'+(isMajor?1:.5)+'"/>';}
  const tick=date=>range.single?date.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}):date.toLocaleDateString(undefined,{month:'short',day:'numeric'});
  return '<strong data-metric-value>'+data.live.toLocaleString()+'</strong><div class="visitor-tile-legend"><span style="--visitor-line:#2fa586">Active · 5 min</span><span style="--visitor-line:#347ef0">Unique · '+(range.single?'hour':'day')+'</span></div><small data-visitor-total>'+data.unique.toLocaleString()+' unique in period</small><div class="overview-card-graph"><svg viewBox="0 0 170 94" role="img" aria-label="Active browsers in five-minute windows and distinct browsers per '+(range.single?'hour':'day')+'"><title>Recorded browser IDs. Green: active in the five minutes ending at each interval cutoff. Blue: distinct in each interval. Period total deduplicates across intervals.</title>'+grid+'<text x="24" y="15" text-anchor="end" fill="#737b89" font-size="9">'+new Intl.NumberFormat(undefined,{notation:'compact'}).format(max)+'</text><text x="24" y="72" text-anchor="end" fill="#737b89" font-size="9">0</text><polyline data-visitor-series="live" points="'+series('live')+'" fill="none" stroke="#2fa586" stroke-width="2"/><polyline data-visitor-series="unique" points="'+series('unique')+'" fill="none" stroke="#347ef0" stroke-width="2"/><text x="30" y="88" fill="#737b89" font-size="9">'+safe(tick(range.start))+'</text><text x="160" y="88" text-anchor="end" fill="#737b89" font-size="9">'+safe(range.single?'24:00':tick(new Date(range.fullEnd.getFullYear(),range.fullEnd.getMonth(),range.fullEnd.getDate()-1)))+'</text></svg></div>';
 }
 window.VACANCY_VISITOR_TILE=Object.freeze({render});
})();
