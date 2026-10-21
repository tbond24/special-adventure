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
  metrics.push({id:'visitors',label:'Visits & unique visitors',icon:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0'});
  metrics.push({id:'repeat_visitors',label:'Repeat visitors',icon:'M3 11a9 9 0 1 1 3 7 M3 3v8h8'});
  metrics.push(...VACANCY_TRACKING.catalog.map(point=>({id:'track:'+point.id,label:point.label,tracking:point.id,icon:'M3 17l5-5 4 3 8-10 M3 3v18h18'})));
  metrics.push({id:'active_now',label:'Active now',live:true,icon:''});
  const periods=[['today','Today'],['yesterday','Yesterday'],['7','Last 7 days'],['30','Last 30 days'],['90','Last 90 days']];
  const timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localDay=n=>{const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(n));return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');};
  const tick=n=>new Date(new Date(n).getUTCFullYear(),new Date(n).getUTCMonth(),new Date(n).getUTCDate()).toLocaleDateString(undefined,{day:'numeric',month:'short'});
  const date=n=>new Date(n).toISOString().slice(0,10);
  const axisNumber=n=>new Intl.NumberFormat(undefined,{notation:'compact',maximumFractionDigits:1}).format(n);
  const number=n=>n.toLocaleString(undefined,{maximumFractionDigits:1});
  const esc=s=>escapeHtml(String(s));
  function range(period,at=Date.now()){
    const today=Date.parse(localDay(at)+'T00:00:00Z');
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
  function graph(values,label,start,period,timeline=null,at=Date.now()){
    if(!values)return '<span class="overview-card-no-graph">No history</span>';
    const days=timeline?.days||values.length,end=start+days*day,cutoff=period==='yesterday'?1:Math.min(1,(days-1+(new Date(at).getHours()+new Date(at).getMinutes()/60)/24)/days);
    const bucketValues=values.map((value,i)=>({start:start+(timeline?timeline.fractions[i]:i/days)*(end-start),end:start+(timeline?timeline.fractions[Math.min(i+1,values.length-1)]:Math.min((i+1)/days,cutoff))*(end-start),value}));
    return VACANCY_CHART.render([{label,color:'#ff6b22',values:bucketValues}],{start,end,single:days===1,label,timeZone:'UTC'});
  }

  function trackingRange(period,at=Date.now()){
    const end=new Date(at);if(period==='yesterday')end.setHours(0,0,0,0);
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
    return {total,previous,browsers:new Set(between(interval.start,interval.end).map(row=>row.visitor_id)).size,events:between(interval.start,interval.end).length,values,timeline:{days:interval.days,fractions}};
  }
  const comparisonLabel=period=>period==='today'?'vs yesterday':period==='yesterday'?'vs the day before':'vs last '+period+' days';
  function changeText(value,before){
    if(before===null||before===undefined)return 'Comparison unavailable';
    if(before===0)return value===0?'0% →':'New';
    if(value===before)return '0% →';
    return (value>before?'+':'−')+number(Math.abs(100*(value-before)/before))+'% '+(value>before?'↑':'↓');
  }
  function mount(host){
    if(mounted.has(host))return mounted.get(host);
    const section=host.closest('[data-admin-section]'),actor=currentUser?.id;
    const key='vacancy-overview-cards-v1:'+actor;
    let stored;try{stored=JSON.parse(localStorage.getItem(key)||sessionStorage.getItem(key)||'null')}catch{}
    let liveMigrated=false;try{liveMigrated=localStorage.getItem('vacancy-overview-live-first:'+actor)==='true'}catch{}
    const used=new Set();
    const initial=Array.isArray(stored)?stored.slice(0,metrics.length):['visitors','listings','enquiries','messages'].map(metric=>({metric}));
    const choices=initial.map((entry,i)=>{
      const metric=metrics[i],migrateLive=i===0&&!liveMigrated&&!Array.isArray(stored);
      const wanted=migrateLive?'visitors':entry?.metric;
      const selected=metrics.some(m=>m.id===wanted)&&!used.has(wanted)?wanted:(!used.has(metric.id)?metric.id:metrics.find(m=>!used.has(m.id)).id);
      used.add(selected);return {metric:selected,mode:entry?.mode==='browsers'?'browsers':'events',period:periods.some(p=>p[0]===entry?.period)?entry.period:'today'};
    });
    try{localStorage.setItem('vacancy-overview-live-first:'+actor,'true')}catch{}
    try{if(localStorage.getItem('vacancy-overview-repeat-card:'+actor)!=='true'){if(!Array.isArray(stored)&&!choices.some(c=>c.metric==='repeat_visitors'))choices.push({metric:'repeat_visitors',mode:'events',period:'today'});localStorage.setItem('vacancy-overview-repeat-card:'+actor,'true')}}catch{}
    const activeKey='vacancy-overview-active-card:'+actor;try{if(localStorage.getItem(activeKey)!=='true'){if(choices.length&&!choices.some(c=>c.metric==='active_now'))choices.push({metric:'active_now',mode:'events',period:'today'});localStorage.setItem(activeKey,'true')}}catch{}
    const freshness=document.createElement('p');freshness.className='overview-data-freshness';freshness.setAttribute('role','status');freshness.innerHTML='<span data-refresh-label>Last refreshed —</span><button type="button" data-refresh-data aria-label="Refresh data" title="Refresh data">↻</button>';host.before(freshness);let refreshVersion=0;
    const cache=new Map(),cards=[];let snapshotAt=new Date(),refreshTimer=null,stopped=false,visible=!section?.hidden&&!document.hidden;
    host.className='overview-metric-row';host.setAttribute('role','region');host.setAttribute('aria-label','Overview metrics');
    const valid=()=>!stopped&&host.isConnected&&location.hash==='#admin'&&currentUser?.id===actor&&!!actor&&VACANCY_BACKEND.assuranceLevel()==='aal2'&&(!VACANCY_BACKEND.session?.()?.user?.id||VACANCY_BACKEND.session().user.id===actor);
    const toolbar=document.createElement('div');toolbar.className='overview-card-toolbar';
    toolbar.innerHTML='<span data-card-status role="status"></span><button type="button" data-overview-add-card>Add card</button><dialog class="overview-add-dialog" aria-labelledby="overviewAddTitle"><form><h3 id="overviewAddTitle">Add card</h3><label>Data<select data-add-metric></select></label><label data-add-count-label>Count<select data-add-count><option value="events">Total events</option><option value="browsers">Distinct browsers</option></select></label><label>Period<select data-add-period>'+periods.map(p=>'<option value="'+p[0]+'">'+p[1]+'</option>').join('')+'</select></label><div class="overview-add-actions"><button type="button" data-add-cancel>Cancel</button><button type="submit">Add card</button></div></form></dialog>';
    host.before(toolbar);toolbar.append(freshness);
    freshness.querySelector('[data-refresh-data]').onclick=()=>void refresh();
    const addButton=toolbar.querySelector('[data-overview-add-card]'),dialog=toolbar.querySelector('dialog'),picker=toolbar.querySelector('[data-add-metric]'),addPeriod=toolbar.querySelector('[data-add-period]'),addCount=toolbar.querySelector('[data-add-count]');
    const available=()=>metrics.filter(m=>!choices.some(c=>c.metric===m.id));
    const syncCount=()=>{toolbar.querySelector('[data-add-count-label]').hidden=!metrics.find(m=>m.id===picker.value)?.tracking};
    function balanceRows(){
      const width=host.getBoundingClientRect().width;if(!width)return;
      const gap=parseFloat(getComputedStyle(host).rowGap)||24;
      const capacity=Math.max(1,Math.min(6,Math.floor((width+gap)/(260+gap))));
      const rows=Math.ceil(cards.length/capacity),base=Math.floor(cards.length/rows),extra=cards.length%rows;
      let index=0;for(let row=0;row<rows;row++){const size=base+(row<extra?1:0);for(let col=0;col<size;col++){const node=cards[index++].node;node.style.gridColumn='span '+(60/size);node.style.width='calc(100% - '+(gap*(size-1)/size)+'px)';node.style.marginLeft=(gap*col/size)+'px';}}
    }
    const resizeObserver=new ResizeObserver(balanceRows);resizeObserver.observe(host);
    function syncMetricOptions(){
      balanceRows();
      cards.forEach((card,index)=>{
        card.index=index;const selected=choices[index].metric,label=metrics.find(m=>m.id===selected).label;
        card.metric.replaceChildren(...metrics.filter(m=>m.id===selected||!choices.some((c,i)=>i!==index&&c.metric===m.id)).map(m=>new Option(m.label,m.id)));
        card.metric.value=selected;card.metric.title=label;card.metric.setAttribute('aria-label','Data for card '+(index+1));
        card.mode.setAttribute('aria-label','Counting method for card '+(index+1));card.node.querySelector('[data-card-period]').setAttribute('aria-label','Period for card '+(index+1));
        card.menu.querySelector('summary').setAttribute('aria-label','Manage '+label+' card');
        card.menu.querySelector('[data-card-move="-1"]').disabled=index===0;
        card.menu.querySelector('[data-card-move="1"]').disabled=index===cards.length-1;
      });
      const free=available(),selected=picker.value;picker.replaceChildren(...free.map(m=>new Option(m.label,m.id)));if(free.some(m=>m.id===selected))picker.value=selected;
      addButton.disabled=!free.length;dialog.querySelector('[type="submit"]').disabled=!free.length;syncCount();
      toolbar.querySelector('[data-card-status]').textContent=!cards.length?'No cards yet':!free.length?'All metrics added':'';
    }
    addButton.onclick=()=>{if(!valid())return;syncMetricOptions();addPeriod.value='today';addCount.value='events';dialog.showModal()};
    picker.onchange=syncCount;toolbar.querySelector('[data-add-cancel]').onclick=()=>dialog.close();
    dialog.querySelector('form').onsubmit=event=>{
      event.preventDefault();if(!valid()||!available().some(m=>m.id===picker.value))return;
      const choice={metric:picker.value,mode:addCount.value==='browsers'?'browsers':'events',period:periods.some(p=>p[0]===addPeriod.value)?addPeriod.value:'today'};
      choices.push(choice);const card=createCard(choice,cards.length);syncMetricOptions();save();dialog.close();void load(card);card.metric.focus();
    };
    function moveCard(card,offset){
      if(!valid())return;const from=cards.indexOf(card),to=from+offset;if(from<0||to<0||to>=cards.length)return;
      cards.splice(from,1);cards.splice(to,0,card);const choice=choices.splice(from,1)[0];choices.splice(to,0,choice);
      host.append(...cards.map(c=>c.node));card.menu.open=false;syncMetricOptions();save();card.menu.querySelector('summary').focus();
    }
    function removeCard(card){
      if(!valid())return;const index=cards.indexOf(card);if(index<0)return;
      ++card.request;
      choices.splice(index,1);cards.splice(index,1);card.node.remove();syncMetricOptions();save();
      (cards[Math.min(index,cards.length-1)]?.menu.querySelector('summary')||addButton).focus();
    }
    function save(){try{localStorage.setItem(key,JSON.stringify(choices))}catch{}}
    const summary=(value,change,direction,period,secondary='')=>'<div class="overview-card-summary"><strong data-metric-value>'+number(value)+'</strong><div class="overview-card-comparison"><p class="overview-card-change" data-direction="'+direction+'">'+esc(change)+'</p><small>'+esc(comparisonLabel(period))+'</small></div></div><p class="overview-card-secondary">'+esc(secondary)+'</p>';
    const unavailableHTML=message=>'<strong data-metric-value>—</strong><p class="overview-card-change">'+esc(message)+'</p><div class="overview-card-graph">'+graph(null)+'</div>';
    function unavailable(card,message){card.body.innerHTML=unavailableHTML(message)}
    async function read(metric){
      if(!cache.has(metric))cache.set(metric,Promise.resolve().then(()=>VACANCY_BACKEND.adminDailyMetricsLocal(metric,180,timeZone)).then(data=>validate(data,metric)).catch(error=>{cache.delete(metric);throw error}));
      return cache.get(metric);
    }
    async function load(card,batch=null){
      if(!cards.includes(card))return;
      const version=++card.request,choice=choices[card.index],metric=metrics.find(m=>m.id===choice.metric),period=choice.period;
      card.node.dataset.metric=metric.id;card.node.querySelector('[data-card-period]').hidden=!!metric.live;card.node.querySelector('[data-card-now]').hidden=!metric.live;
      card.icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+metric.icon+'"/></svg>';
      card.node.setAttribute('aria-label',metric.label+' · '+(metric.live?'At last refresh':periods.find(p=>p[0]===period)[1]));
      const commit=html=>{const apply=()=>{if(card.request===version&&cards.includes(card)&&valid()&&visible){card.body.innerHTML=html;card.body.removeAttribute('aria-busy')}};if(batch)batch.push(apply);else apply()};
      card.node.removeAttribute('title');if(!batch||!card.body.childElementCount)unavailable(card,'Loading…');card.body.setAttribute('aria-busy','true');
      if(!valid()||!visible)return;
      let timer;
      try{
        if(metric.live){
          card.mode.hidden=true;
          const report=await Promise.race([VACANCY_BACKEND.adminVisitorPresence(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Presence timeout')),5000)})]);
          const count=n=>Number.isSafeInteger(n)&&n>=0,labels={find:'Find listings',listing:'Listing pages',list:'Your listings',create:'Create listing',auth:'Account',other:'Other pages','step:0':'Location','step:1':'Listing details','step:2':'Review','step:3':'Publish attempt'};
          const stamp=Date.parse(report?.generatedAt),expiry=Date.parse(report?.expiresAt),ids=new Set();
          if(!count(report?.total)||!Number.isFinite(stamp)||stamp>Date.now()+5000||Date.now()-stamp>15000||!Number.isFinite(expiry)||expiry<=Date.now()||expiry<=stamp||expiry-stamp>15000||!Array.isArray(report.nodes)||report.nodes.length>10||report.nodes.some(n=>!Object.hasOwn(labels,n.id)||ids.has(n.id)||!ids.add(n.id)||!count(n.count)||n.count>report.total)||report.nodes.reduce((n,p)=>n+p.count,0)<report.total)throw Error('Invalid presence');
          const pages=[...report.nodes].filter(n=>n.count).sort((a,b)=>b.count-a.count).slice(0,3);
          commit('<div class="overview-card-summary"><strong data-metric-value>'+number(report.total)+'</strong></div><p class="overview-card-secondary">Active browsers at last refresh</p><dl class="overview-card-presence">'+pages.map(n=>'<div><dt>'+labels[n.id]+'</dt><dd>'+number(n.count)+'</dd></div>').join('')+'</dl><small class="overview-card-live-note">'+(report.total?'Pages can overlap across tabs.':'No active visitors recorded.')+' Admins excluded.</small>');return true;
        }
        if(metric.id==='visitors'||metric.id==='repeat_visitors'){
          card.mode.hidden=true;const trafficKey='traffic:'+period;
          if(!cache.has(trafficKey))cache.set(trafficKey,VACANCY_VISITOR_TILE.read(period,snapshotAt).catch(error=>{cache.delete(trafficKey);throw error}));
          const model=await Promise.race([cache.get(trafficKey),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Traffic timeout')),15000)})]);
          if(card.request!==version||!valid()||!visible)return;
          commit(VACANCY_VISITOR_TILE.render(model,metric.id));card.node.title='Recorded sessions · shared refresh'+(model.data.lastRecordedAt?' · latest event '+new Date(model.data.lastRecordedAt).toLocaleString():' · no recorded events');return true;
        }
        card.mode.hidden=!metric.tracking;
        if(metric.tracking){
          const cacheKey='tracking:'+period;
          if(!cache.has(cacheKey)){const interval=trackingRange(period,snapshotAt);cache.set(cacheKey,{interval,promise:Promise.resolve().then(()=>VACANCY_BACKEND.adminElementTracking(interval.previousStart.toISOString(),interval.end.toISOString())).catch(error=>{cache.delete(cacheKey);throw error})})}
          const {interval,promise}=cache.get(cacheKey);
          const report=await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Tracking timed out')),15000)})]);
          if(card.request!==version||!valid()||!visible)return;
          const data=trackingData(report,metric.tracking,choice.mode||'events',interval);
          card.node.title='Through '+interval.end.toLocaleString()+' · '+(interval.days===1?'hourly':'daily')+' buckets · comparison uses the same elapsed period';
          const direction=data.previous===null?'same':data.total>data.previous?'up':data.total<data.previous?'down':'same';
          const change=data.previous===null?'Earlier history unavailable':changeText(data.total,data.previous);
          commit(summary(data.total,change,direction,period,choice.mode==='browsers'?number(data.events)+' recorded actions':number(data.browsers)+' unique browsers')+'<div class="overview-card-graph">'+graph(data.values,metric.label,+interval.start,period,data.timeline,snapshotAt)+'</div>');
          return true;
        }

        const interval=trackingRange(period,snapshotAt),bucketRange=VACANCY_VISITOR_TILE.bounds(period,snapshotAt),previousAt=new Date(snapshotAt);
        previousAt.setDate(previousAt.getDate()-interval.days);
        const previousRange=VACANCY_VISITOR_TILE.bounds(period,previousAt),key='series:'+metric.id+':'+period;
        if(!cache.has(key))cache.set(key,Promise.all([VACANCY_BACKEND.adminCardSeries(metric.id,bucketRange.buckets),VACANCY_BACKEND.adminCardSeries(metric.id,previousRange.buckets)]));
        const reports=await Promise.race([cache.get(key),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Chart timed out')),15000)})]);
        const validSeries=(r,b)=>r?.metric===metric.id&&Array.isArray(r.series)&&r.series.length===b.length&&r.series.every((p,i)=>Number.isSafeInteger(p.value)&&p.value>=0&&Date.parse(p.at)===Date.parse(b[i].end));
        if(!validSeries(reports[0],bucketRange.buckets)||!validSeries(reports[1],previousRange.buckets))throw Error('Invalid chart');
        const value=reports[0].series.reduce((n,p)=>n+p.value,0),before=reports[1].series.reduce((n,p)=>n+p.value,0),shift=+bucketRange.start-previousRange.start;
        const series=[{label:metric.label,color:({accounts:'#ff6b22',listings:'#347ef0',enquiries:'#2fa586',messages:'#9462db',images:'#d49a32'}[metric.id]||'#ff6b22'),values:reports[0].series.map((p,j)=>({start:Date.parse(bucketRange.buckets[j].start),end:Date.parse(p.at),value:p.value}))}];
        commit(summary(value,changeText(value,before),value>before?'up':value<before?'down':'same',period)+'<div class="overview-card-graph">'+VACANCY_CHART.render(series,{start:+bucketRange.start,end:+bucketRange.fullEnd,single:bucketRange.single,label:metric.label})+'</div>');
        return true;
      }catch{if(card.request===version&&valid()&&visible)commit(unavailableHTML(metric.tracking?'Tracking unavailable for this period':'Data unavailable. Refresh to retry.'));return false;}
      finally{clearTimeout(timer);}
    }
    function createCard(choice,index){
      const node=document.createElement('article');node.className='overview-metric-card';
      node.innerHTML='<div class="overview-card-heading"><span class="overview-card-icon"></span><select data-card-metric aria-label="Data for card '+(index+1)+'">'+metrics.map(m=>'<option value="'+m.id+'">'+m.label+'</option>').join('')+'</select></div><div class="overview-card-body" aria-live="polite"></div><label class="overview-card-period"><span class="sr-only">Period</span><select data-card-period aria-label="Period for card '+(index+1)+'">'+periods.map(p=>'<option value="'+p[0]+'">'+p[1]+'</option>').join('')+'</select></label>';
      const metric=node.querySelector('[data-card-metric]'),period=node.querySelector('[data-card-period]');metric.value=choice.metric;period.value=choice.period;
      const mode=document.createElement('select');mode.dataset.cardCount='';mode.setAttribute('aria-label','Counting method for card '+(index+1));mode.innerHTML='<option value="events">Total events</option><option value="browsers">Distinct browsers</option>';mode.value=choice.mode;mode.hidden=true;node.querySelector('.overview-card-period').before(mode);
      const menu=document.createElement('details');menu.className='overview-card-menu';menu.innerHTML='<summary>⋯</summary><div><button type="button" data-card-move="-1">Move earlier</button><button type="button" data-card-move="1">Move later</button><button type="button" data-card-remove>Remove card</button></div>';node.querySelector('.overview-card-heading').append(menu);
      const now=document.createElement('span');now.dataset.cardNow='';now.className='overview-card-now';now.textContent='Now';now.title='Active browsers measured at the shared refresh';now.hidden=true;node.querySelector('.overview-card-heading').append(node.querySelector('.overview-card-period'),now,menu);menu.querySelector('div').prepend(mode);
      const card={node,index,metric,mode,menu,request:0,icon:node.querySelector('.overview-card-icon'),body:node.querySelector('.overview-card-body')};cards.push(card);host.append(node);
      metric.onchange=()=>{const next=metric.value;if(!metrics.some(m=>m.id===next)||choices.some((c,i)=>i!==card.index&&c.metric===next)){syncMetricOptions();return;}choice.metric=next;syncMetricOptions();save();void load(card)};
      mode.onchange=()=>{choice.mode=mode.value;save();void load(card)};
      period.onchange=()=>{choice.period=period.value;save();void load(card)};
      menu.querySelectorAll('[data-card-move]').forEach(button=>button.onclick=()=>moveCard(card,Number(button.dataset.cardMove)));
      menu.querySelector('[data-card-remove]').onclick=()=>removeCard(card);
      return card;
    }
    choices.forEach(createCard);
    syncMetricOptions();save();
    const activity=document.createElement('section');activity.className='overview-activity-graph';
    activity.innerHTML='<div class="section-head"><div><h3>Recorded activity</h3><p>New accounts, listings and enquiries</p></div><label>Period <select aria-label="Activity graph period"><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label></div><div data-activity-body aria-live="polite"></div>';
    host.after(activity);let graphRequest=0;const activityPeriod=activity.querySelector('select'),activityKey='vacancy-overview-activity-period:'+actor;try{const saved=localStorage.getItem(activityKey);if(periods.some(p=>p[0]===saved))activityPeriod.value=saved}catch{}
    async function activityGraph(){
      const version=++graphRequest,target=activity.querySelector('[data-activity-body]'),period=activity.querySelector('select').value;
      target.textContent='Loading activity…';
      try{
        const interval=VACANCY_VISITOR_TILE.bounds(period,snapshotAt),buckets=interval.buckets;
        const values=await Promise.all(metrics.slice(0,3).map(async metric=>{const report=await VACANCY_BACKEND.adminCardSeries(metric.id,buckets);if(report?.metric!==metric.id||report.series?.length!==buckets.length||report.series.some((p,i)=>!Number.isSafeInteger(p.value)||p.value<0||Date.parse(p.at)!==Date.parse(buckets[i].end)))throw Error('Invalid activity');return report.series.map(p=>p.value)}));
        if(version!==graphRequest||!valid()||!visible)return;
        const colours=['#ff6b22','#347ef0','#2fa586'];
        const svg=VACANCY_CHART.render(values.map((counts,i)=>({label:metrics[i].label,color:colours[i],values:counts.map((value,j)=>({value,start:Date.parse(buckets[j].start),end:Date.parse(buckets[j].end)}))})),{start:+interval.start,end:+interval.fullEnd,single:interval.single,label:'Recorded activity',compact:false});
        target.innerHTML=svg+'<details><summary>View activity data table</summary><div class="journey-table-wrap"><table><thead><tr><th>Period</th>'+metrics.slice(0,3).map(m=>'<th>'+esc(m.label)+'</th>').join('')+'</tr></thead><tbody>'+buckets.map((bucket,i)=>'<tr><th>'+esc(new Date(bucket.start).toLocaleString(undefined,{month:'short',day:'numeric',...(interval.single?{hour:'numeric',hour12:true}:{})}))+'</th>'+values.map(counts=>'<td>'+counts[i]+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></details>';
      }catch{if(version===graphRequest&&valid()&&visible)target.textContent='Activity unavailable. Refresh to retry.';}
    }
    activityPeriod.onchange=()=>{try{localStorage.setItem(activityKey,activityPeriod.value)}catch{}void activityGraph()};
    async function refresh(){
      clearTimeout(refreshTimer);if(!valid()||!visible)return;
      cache.clear();snapshotAt=new Date();const at=new Date(snapshotAt),version=++refreshVersion,batch=[];
      freshness.querySelector('[data-refresh-label]').textContent='Refreshing…';freshness.querySelector('button').disabled=true;void activityGraph();window.dispatchEvent(new Event('vacancy:refresh-data'));
      const results=await Promise.all([...cards].map(card=>load(card,batch)));
      if(version!==refreshVersion||!valid()||!visible)return;
      batch.forEach(apply=>apply());
      const incomplete=results.some(result=>result===false);
      const sameDay=at.toDateString()===new Date().toDateString();
      freshness.querySelector('[data-refresh-label]').textContent='Last refreshed '+at.toLocaleString(undefined,{...(sameDay?{}:{month:'short',day:'numeric',year:'numeric'}),hour:'numeric',minute:'2-digit',second:'2-digit'})+(incomplete?' · incomplete':'');
      freshness.querySelector('button').disabled=false;
      refreshTimer=setTimeout(refresh,60000);
    }
    function cleanup(){if(stopped)return;stopped=true;if(dialog.open)dialog.close();toolbar.remove();freshness.remove();clearTimeout(refreshTimer);++graphRequest;activity.remove();cards.forEach(card=>++card.request);observer.disconnect();resizeObserver.disconnect();document.removeEventListener('visibilitychange',sync);window.removeEventListener('hashchange',sync);window.removeEventListener('storage',sync);host.replaceChildren();}
    function sync(){
      if(!valid()){cleanup();return;}
      const next=!document.hidden&&!section?.hidden;
      if(!next&&visible){visible=false;clearTimeout(refreshTimer);++graphRequest;activity.querySelector('[data-activity-body]').textContent='Refresh when visible';cards.forEach(card=>{++card.request;unavailable(card,'Refresh when visible');});}
      else if(next&&!visible){visible=true;refresh();}
    }
    const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});document.addEventListener('visibilitychange',sync);window.addEventListener('hashchange',sync);window.addEventListener('storage',sync);
    const api={refresh,cleanup};mounted.set(host,api);refresh();return api;
  }
  window.VACANCY_OVERVIEW_CARDS={mount};
})();
