// One card template, using the existing protected daily-count reader.
(() => {
  const day=86400000, mounted=new WeakMap();
  const metrics=[
    {id:'accounts',label:'New accounts',icon:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0'},
    {id:'listings',label:'New listings',icon:'M3 10 12 3l9 7v11H3Z M9 21v-8h6v8'},
    {id:'enquiries',label:'New enquiries',icon:'M3 5h18v14H3Z M3 5l9 8 9-8'},
    {id:'messages',label:'Messages sent',icon:'M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 1 1 17-5Z'},
    {id:'images',label:'Media uploaded',icon:'M3 3h18v18H3Z M3 17l6-6 5 5 3-3 4 4 M16 7h.01'}
  ];
  metrics.push({id:'visitors',label:'Live visitors',icon:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0'});
  metrics.push(...VACANCY_TRACKING.catalog.map(point=>({id:'track:'+point.id,label:point.label,tracking:point.id,icon:'M3 17l5-5 4 3 8-10 M3 3v18h18'})));
  const periods=[['today','Today'],['yesterday','Yesterday'],['7','7 days'],['30','30 days'],['90','90 days']];
  const timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localDay=n=>{const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(n));return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');};
  const tick=n=>new Date(new Date(n).getUTCFullYear(),new Date(n).getUTCMonth(),new Date(n).getUTCDate()).toLocaleDateString(undefined,{day:'numeric',month:'short'});
  const date=n=>new Date(n).toISOString().slice(0,10);
  const axisNumber=n=>new Intl.NumberFormat(undefined,{notation:'compact',maximumFractionDigits:1}).format(n);
  const number=n=>n.toLocaleString(undefined,{maximumFractionDigits:1});
  const esc=s=>escapeHtml(String(s));
  function range(period){
    const today=Date.parse(localDay(Date.now())+'T00:00:00Z');
    const days=period==='today'||period==='yesterday'?1:Number(period);
    const end=period==='yesterday'?today:today+day;
    return {days,start:end-days*day,end,previous:end-2*days*day};
  }
  function validate(report,metric){
    const count=n=>Number.isSafeInteger(n)&&n>=0;
    if(report?.timeZone!==timeZone)throw Error('Local-day data unavailable');
    if(report?.metric!==metric||!count(report.days)||report.days<1||report.days>180||!Array.isArray(report.series)||report.series.length!==report.days||!count(report.total))throw Error('Daily data is unavailable');
    let last=null,total=0;const values=new Map();
    for(const point of report.series){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(point.date)||!count(point.value))throw Error('Daily data is unavailable');
      const stamp=Date.parse(point.date+'T00:00:00Z');
      if(!Number.isFinite(stamp)||date(stamp)!==point.date||(last!==null&&stamp!==last+day))throw Error('Daily history has gaps');
      values.set(point.date,point.value);last=stamp;total+=point.value;
    }
    if(!Number.isSafeInteger(total)||total!==report.total)throw Error('Daily totals do not reconcile');
    return values;
  }
  function points(values,start,end){
    const result=[];
    for(let t=start;t<end;t+=day){const value=values.get(date(t));if(value===undefined)return null;result.push(value);}
    return result;
  }
  function scaleMax(values){
    const maximum=Math.max(...values);if(!maximum)return 1;
    const target=maximum/4,power=10**Math.floor(Math.log10(target));
    const step=[1,2,5,10].map(n=>n*power).find(n=>n>=target);
    return Math.ceil(maximum/step)*step+(maximum%step===0?step:0);
  }
  function graph(values,label,start,period,timeline=null){
    if(!values)return '<span class="overview-card-no-graph">No history</span>';
    const max=scaleMax(values),days=timeline?.days||values.length,single=days===1;
    const now=new Date(),fraction=(now.getHours()+now.getMinutes()/60+now.getSeconds()/3600)/24;
    const current=period!=='yesterday',cutoff=timeline?timeline.fractions.at(-1):current?(days-1+fraction)/days:1;
    const x=f=>30+f*130,y=n=>70-n/max*58;
    let coords=timeline?values.map((value,i)=>[x(timeline.fractions[i]),y(value)]):values.map((value,i)=>[x(single?cutoff:(i===days-1?cutoff:(i+1)/days)),y(value)]);
    const allZero=values.every(n=>n===0);if(allZero)coords=[[x(0),y(0)],[x(cutoff),y(0)]];
    const line=coords.map(p=>p.join(',')).join(' '),last=coords.at(-1);
    let grid='';
    for(let i=1;i<4;i++){const yy=12+i*58/4;grid+='<line class="grid-value" x1="30" x2="160" y1="'+yy+'" y2="'+yy+'" stroke="#e5e7eb"/>';}
    const units=single?24:days,major=single?3:days<=7?1:days<=30?7:14,minor=single?1:days<=7?.5:days<=30?1:7;
    for(let t=minor;t<units;t+=minor){const isMajor=Math.abs(t/major-Math.round(t/major))<.001;const xx=x(t/units);grid+='<line class="'+(isMajor?'grid-major':'grid-minor')+'" y1="12" y2="70" x1="'+xx+'" x2="'+xx+'" stroke="#e5e7eb" stroke-width="'+(isMajor?1:.5)+'"/>';}
    const startLabel=single?'00:00':tick(start),endLabel=single?'24:00':tick(start+(days-1)*day);
    return '<svg viewBox="0 0 170 94" role="img" data-scale-max="'+max+'" data-period-units="'+units+'" aria-label="'+esc(label)+'"><title>'+esc(label)+(timeline?' · event counts by time bucket':single?' · daily total; hourly breakdown unavailable':' · daily totals')+'</title>'+grid+
      '<text x="24" y="15" text-anchor="end" fill="#737b89" font-size="9">'+axisNumber(max)+'</text><text x="24" y="72" text-anchor="end" fill="#737b89" font-size="9">0</text>'+
      ((timeline||!single||allZero)?'<polyline class="metric-series" points="'+line+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>':'')+
      '<circle cx="'+last[0]+'" cy="'+last[1]+'" r="2.5" fill="currentColor"/><text x="30" y="88" fill="#737b89" font-size="9">'+startLabel+'</text>'+
      '<text x="160" y="88" text-anchor="end" fill="#737b89" font-size="9">'+endLabel+'</text></svg>';
  }
  function trackingRange(period){
    const end=new Date();if(period==='yesterday')end.setHours(0,0,0,0);
    const start=new Date(end);start.setHours(0,0,0,0);const days=['today','yesterday'].includes(period)?1:Number(period);
    start.setDate(start.getDate()-(period==='yesterday'?1:days-1));
    const axisEnd=new Date(start);axisEnd.setDate(axisEnd.getDate()+days);
    const previousStart=new Date(start);previousStart.setDate(previousStart.getDate()-days);
    const previousEnd=new Date(end);previousEnd.setDate(previousEnd.getDate()-days);
    return {start,end,axisEnd,previousStart,previousEnd,days};
  }
  function trackingData(report,point,mode,interval){
    if(!Array.isArray(report?.events)||report.events.length>=5001||!Number.isFinite(Date.parse(report.coverageStart)))throw Error('Tracking not collected yet');
    if(report.events.some(row=>!row||typeof row.event_id!=='string'||typeof row.visitor_id!=='string'||!row.visitor_id||!VACANCY_TRACKING.catalog.some(p=>p.id===row.event_name)||!Number.isFinite(Date.parse(row.occurred_at))||Date.parse(row.occurred_at)<+interval.previousStart||Date.parse(row.occurred_at)>=+interval.end))throw Error('Incomplete tracking');
    const coverage=Date.parse(report.coverageStart);
    if(coverage>+interval.start)throw Error('Tracking history unavailable for this period');
    const rows=[...new Map(report.events.map(row=>[row.event_id,row])).values()].filter(row=>row.event_name===point);
    const count=events=>mode==='browsers'?new Set(events.map(row=>row.visitor_id)).size:events.length;
    const between=(from,to)=>rows.filter(row=>Date.parse(row.occurred_at)>=+from&&Date.parse(row.occurred_at)<+to);
    const total=count(between(interval.start,interval.end));
    const previous=coverage<=+interval.previousStart?count(between(interval.previousStart,interval.previousEnd)):null;
    const values=[],fractions=[];let cursor=new Date(interval.start);
    while(cursor<interval.end){const next=new Date(cursor);if(interval.days===1)next.setTime(+cursor+3600000);else next.setDate(next.getDate()+1);
      const stop=Math.min(+next,+interval.end),value=count(between(cursor,stop));
      fractions.push((+cursor-interval.start)/(interval.axisEnd-interval.start));values.push(value);
      if(stop===+interval.end){fractions.push((stop-interval.start)/(interval.axisEnd-interval.start));values.push(value)}cursor=next;
    }
    if(!values.length){values.push(0,0);fractions.push(0,0)}
    return {total,previous,values,timeline:{days:interval.days,fractions}};
  }
  function mount(host){
    if(mounted.has(host))return mounted.get(host);
    const section=host.closest('[data-admin-section]'),actor=currentUser?.id;
    const key='vacancy-overview-cards-v1:'+actor;
    let stored;try{stored=JSON.parse(sessionStorage.getItem(key)||'null')}catch{}
    let liveMigrated=false;try{liveMigrated=sessionStorage.getItem('vacancy-overview-live-first:'+actor)==='true'}catch{}
    const used=new Set();
    const choices=metrics.slice(0,5).map((metric,i)=>{
      const migrateLive=i===0&&!liveMigrated;
      const wanted=migrateLive?'visitors':stored?.[i]?.metric;
      const selected=metrics.some(m=>m.id===wanted)&&!used.has(wanted)?wanted:(!used.has(metric.id)?metric.id:metrics.find(m=>!used.has(m.id)).id);
      used.add(selected);return {metric:selected,mode:stored?.[i]?.mode==='browsers'?'browsers':'events',period:periods.some(p=>p[0]===stored?.[i]?.period)?stored[i].period:'30'};
    });
    try{sessionStorage.setItem('vacancy-overview-live-first:'+actor,'true')}catch{}
    const freshness=document.createElement('p');freshness.className='overview-data-freshness';freshness.setAttribute('role','status');freshness.textContent='Daily data: waiting for refresh';host.before(freshness);let refreshVersion=0;
    const cache=new Map(),cards=[];let visitorTimer=null,refreshTimer=null,stopped=false,visible=!section?.hidden&&!document.hidden;
    host.className='overview-metric-row';host.setAttribute('role','region');host.setAttribute('aria-label','Overview metrics');
    const valid=()=>!stopped&&host.isConnected&&location.hash==='#admin'&&currentUser?.id===actor&&!!actor&&VACANCY_BACKEND.assuranceLevel()==='aal2'&&(!VACANCY_BACKEND.session?.()?.user?.id||VACANCY_BACKEND.session().user.id===actor);
    function syncMetricOptions(){
      for(const card of cards){const selected=choices[card.index].metric;
        card.metric.replaceChildren(...metrics.filter(m=>m.id===selected||!choices.some((c,i)=>i!==card.index&&c.metric===m.id)).map(m=>new Option(m.label,m.id)));
        card.metric.value=selected;
      }
    }
    function save(){try{sessionStorage.setItem(key,JSON.stringify(choices))}catch{}}
    function unavailable(card,message){card.body.innerHTML='<strong data-metric-value>—</strong><p class="overview-card-change">'+esc(message)+'</p><div class="overview-card-graph">'+graph(null)+'</div>';}
    async function read(metric){
      if(!cache.has(metric))cache.set(metric,Promise.resolve().then(()=>VACANCY_BACKEND.adminDailyMetricsLocal(metric,180,timeZone)).then(data=>validate(data,metric)).catch(error=>{cache.delete(metric);throw error}));
      return cache.get(metric);
    }
    async function load(card){
      const version=++card.request,choice=choices[card.index],metric=metrics.find(m=>m.id===choice.metric),period=choice.period;
      if(card.node.dataset.metric==='visitors'||metric.id==='visitors')clearTimeout(visitorTimer);
      card.node.dataset.metric=metric.id;
      card.icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+metric.icon+'"/></svg>';
      card.node.setAttribute('aria-label',metric.label+' · '+periods.find(p=>p[0]===period)[1]);
      card.node.removeAttribute('title');unavailable(card,'Loading…');
      if(!valid()||!visible)return;
      let timer;
      try{
        if(metric.id==='visitors'){card.mode.hidden=true;const html=await Promise.race([VACANCY_VISITOR_TILE.render(period),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Visitor timeout')),15000)})]);if(card.request!==version||!valid()||!visible)return;card.body.innerHTML=html;card.node.title='Recorded browser IDs · refreshes every 30 seconds';visitorTimer=setTimeout(()=>void load(card),30000);return;}
        card.mode.hidden=!metric.tracking;
        if(metric.tracking){
          const cacheKey='tracking:'+period;
          if(!cache.has(cacheKey)){const interval=trackingRange(period);cache.set(cacheKey,{interval,promise:Promise.resolve().then(()=>VACANCY_BACKEND.adminElementTracking(interval.previousStart.toISOString(),interval.end.toISOString())).catch(error=>{cache.delete(cacheKey);throw error})})}
          const {interval,promise}=cache.get(cacheKey);
          const report=await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Tracking timed out')),15000)})]);
          if(card.request!==version||!valid()||!visible)return;
          const data=trackingData(report,metric.tracking,choice.mode||'events',interval);
          card.node.title='Through '+interval.end.toLocaleString()+' · '+(interval.days===1?'hourly':'daily')+' buckets · comparison uses the same elapsed period';
          const change=data.previous===null?'Earlier history unavailable':data.previous===0?(data.total?'New · previous 0':'No change'):data.total===data.previous?'No change':((data.total>data.previous?'+':'')+number((data.total-data.previous)/data.previous*100)+'%');
          card.body.innerHTML='<strong data-metric-value>'+number(data.total)+'</strong><p class="overview-card-change">'+esc(change)+'</p><div class="overview-card-graph">'+graph(data.values,metric.label,+interval.start,period,data.timeline)+'</div>';
          return;
        }

        const values=await Promise.race([read(metric.id),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Daily data timed out')),15000)})]);
        if(card.request!==version||!valid()||!visible)return;
        const interval=range(period),current=points(values,interval.start,interval.end),previous=points(values,interval.previous,interval.start);
        if(!current){unavailable(card,'History unavailable for this period');return;}
        const value=current.reduce((a,b)=>a+b,0),before=previous?.reduce((a,b)=>a+b,0);
        let direction='same',change='Comparison unavailable';
        if(previous){
          direction=value>before?'up':value<before?'down':'same';
          change=before===0?(value===0?'No change':'New · previous 0'):(direction==='same'?'No change':(direction==='up'?'+':'−')+number(Math.abs(100*(value-before)/before))+'%');
        }
        const comparison=period==='today'?'vs yesterday’s full day':period==='yesterday'?'vs the day before':'vs previous '+interval.days+' days';
        card.body.innerHTML='<strong data-metric-value>'+number(value)+'</strong><p class="overview-card-change" data-direction="'+direction+'">'+change+'</p><small>'+(previous?comparison:'Earlier history unavailable')+'</small><div class="overview-card-graph">'+graph(current,metric.label,interval.start,period)+'</div>';
        card.node.title=date(interval.start)+' to '+date(interval.end-day)+' · '+timeZone+' daily totals'+(period==='yesterday'?'':' · includes today so far');
      }catch{if(metric.id==='visitors'&&valid()&&visible)visitorTimer=setTimeout(()=>void load(card),30000);if(card.request===version&&valid()&&visible)unavailable(card,metric.tracking?'Tracking unavailable for this period':'Data unavailable. Refresh to retry.');}
      finally{clearTimeout(timer);}
    }
    choices.forEach((choice,index)=>{
      const node=document.createElement('article');node.className='overview-metric-card';
      node.innerHTML='<div class="overview-card-heading"><span class="overview-card-icon"></span><select data-card-metric aria-label="Data for card '+(index+1)+'">'+metrics.map(m=>'<option value="'+m.id+'">'+m.label+'</option>').join('')+'</select></div><div class="overview-card-body" aria-live="polite"></div><label class="overview-card-period"><span class="sr-only">Period</span><select data-card-period aria-label="Period for card '+(index+1)+'">'+periods.map(p=>'<option value="'+p[0]+'">'+p[1]+'</option>').join('')+'</select></label>';
      const metric=node.querySelector('[data-card-metric]'),period=node.querySelector('[data-card-period]');metric.value=choice.metric;period.value=choice.period;
      const mode=document.createElement('select');mode.dataset.cardCount='';mode.setAttribute('aria-label','Counting method for card '+(index+1));mode.innerHTML='<option value="events">Total events</option><option value="browsers">Distinct browsers</option>';mode.value=choice.mode;mode.hidden=true;node.querySelector('.overview-card-period').before(mode);
      const card={node,index,metric,mode,request:0,icon:node.querySelector('.overview-card-icon'),body:node.querySelector('.overview-card-body')};cards.push(card);host.append(node);
      metric.onchange=()=>{const next=metric.value;if(!metrics.some(m=>m.id===next)||choices.some((c,i)=>i!==index&&c.metric===next)){syncMetricOptions();return;}choice.metric=next;syncMetricOptions();save();void load(card)};
      mode.onchange=()=>{choice.mode=mode.value;save();void load(card)};
      period.onchange=()=>{choice.period=period.value;save();void load(card)};
    });
    syncMetricOptions();save();
    const activity=document.createElement('section');activity.className='overview-activity-graph';
    activity.innerHTML='<div class="section-head"><div><h3>Recorded activity</h3><p>New accounts, listings and enquiries</p></div><label>Period <select aria-label="Activity graph period"><option value="7">7 days</option><option value="30" selected>30 days</option><option value="90">90 days</option></select></label></div><div data-activity-body aria-live="polite"></div>';
    host.after(activity);let graphRequest=0;
    async function activityGraph(){
      const version=++graphRequest,target=activity.querySelector('[data-activity-body]'),period=activity.querySelector('select').value;
      target.textContent='Loading activity…';
      try{
        const values=await Promise.all(metrics.slice(0,3).map(metric=>read(metric.id)));
        if(version!==graphRequest||!valid()||!visible)return;
        const interval=range(period),series=values.map(value=>points(value,interval.start,interval.end));
        if(series.some(value=>!value)){target.textContent='History unavailable for this period';return;}
        const max=scaleMax(series.flat()),colours=['#ff6b22','#347ef0','#2fa586'];
        let svg='<svg viewBox="0 0 800 280" role="img" aria-label="Recorded daily accounts, listings and enquiries"><title>Recorded activity</title>';
        for(let i=1;i<4;i++){const y=20+i*54;svg+='<line x1="50" x2="780" y1="'+y+'" y2="'+y+'" stroke="#e1e7f0"/><text x="40" y="'+(y+4)+'" text-anchor="end" fill="#637087" font-size="11">'+axisNumber(Math.round(max*(4-i)/4))+'</text>';}
        const major=interval.days<=7?1:interval.days<=30?7:14;
        for(let i=1;i<interval.days;i++){const x=50+i*730/interval.days,isMajor=i%major===0;svg+='<line class="'+(isMajor?'grid-major':'grid-minor')+'" x1="'+x+'" x2="'+x+'" y1="20" y2="236" stroke="#e1e7f0" stroke-width="'+(isMajor?1:.5)+'"/>';}
        series.forEach((values,index)=>{const now=new Date(),fraction=(now.getHours()+now.getMinutes()/60)/24;let coords=values.map((value,i)=>(50+(i===values.length-1?i+fraction:i+1)*730/values.length)+','+(236-value/max*216)).join(' ');if(values.every(n=>n===0))coords='50,236 '+(50+(values.length-1+fraction)*730/values.length)+',236';svg+='<polyline points="'+coords+'" fill="none" stroke="'+colours[index]+'" stroke-width="2.5"/>';});
        svg+='<text x="50" y="265" font-size="11" fill="#637087">'+tick(interval.start)+'</text><text x="780" y="265" text-anchor="end" font-size="11" fill="#637087">'+tick(interval.end-day)+'</text></svg>';
        target.innerHTML='<p class="overview-activity-legend">'+metrics.slice(0,3).map((metric,i)=>'<span style="--series-colour:'+colours[i]+'">'+esc(metric.label)+'</span>').join('')+'</p>'+svg+'<details><summary>View activity data table</summary><div class="journey-table-wrap"><table><thead><tr><th>Date</th>'+metrics.slice(0,3).map(m=>'<th>'+esc(m.label)+'</th>').join('')+'</tr></thead><tbody>'+series[0].map((_,i)=>'<tr><th>'+date(interval.start+i*day)+'</th>'+series.map(values=>'<td>'+values[i]+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></details>';
      }catch{if(version===graphRequest&&valid()&&visible)target.textContent='Activity unavailable. Refresh to retry.';}
    }
    activity.querySelector('select').onchange=()=>void activityGraph();
    function refresh(){clearTimeout(refreshTimer);if(!valid()||!visible)return;cache.clear();const version=++refreshVersion;freshness.textContent='Daily data: refreshing…';cards.forEach(card=>void load(card));void activityGraph();Promise.all(metrics.filter(metric=>!metric.tracking&&metric.id!=='visitors').map(metric=>read(metric.id))).then(()=>{if(version!==refreshVersion||!valid()||!visible)return;const now=new Date();freshness.replaceChildren(document.createTextNode('Daily data refreshed · '));const time=document.createElement('time');time.dateTime=now.toISOString();time.textContent=now.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit'});freshness.append(time);}).catch(()=>{if(version===refreshVersion&&valid()&&visible)freshness.textContent='Daily data refresh incomplete · some cards unavailable';});refreshTimer=setTimeout(refresh,60000);}
    function cleanup(){if(stopped)return;stopped=true;clearTimeout(visitorTimer);freshness.remove();clearTimeout(refreshTimer);++graphRequest;activity.remove();cards.forEach(card=>++card.request);observer.disconnect();document.removeEventListener('visibilitychange',sync);window.removeEventListener('hashchange',sync);window.removeEventListener('storage',sync);host.replaceChildren();}
    function sync(){
      if(!valid()){cleanup();return;}
      const next=!document.hidden&&!section?.hidden;
      if(!next&&visible){visible=false;clearTimeout(visitorTimer);clearTimeout(refreshTimer);++graphRequest;activity.querySelector('[data-activity-body]').textContent='Refresh when visible';cards.forEach(card=>{++card.request;unavailable(card,'Refresh when visible');});}
      else if(next&&!visible){visible=true;refresh();}
    }
    const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});document.addEventListener('visibilitychange',sync);window.addEventListener('hashchange',sync);window.addEventListener('storage',sync);
    const api={refresh,cleanup};mounted.set(host,api);refresh();return api;
  }
  window.VACANCY_OVERVIEW_CARDS={mount};
})();
