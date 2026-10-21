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
    const max=scaleMax(values),days=timeline?.days||values.length,single=days===1;
    const now=new Date(at),fraction=(now.getHours()+now.getMinutes()/60+now.getSeconds()/3600)/24;
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
    return {total,previous,values,timeline:{days:interval.days,fractions}};
  }
  const comparisonLabel=period=>period==='today'?'vs yesterday':period==='yesterday'?'vs the day before':'vs last '+period+' days';
  function changeText(value,before){
    if(before===null||before===undefined)return 'Comparison unavailable';
    if(before===0)return value===0?'No change':'New · previous 0';
    if(value===before)return 'No change';
    return (value>before?'+':'−')+number(Math.abs(100*(value-before)/before))+'% '+(value>before?'↑':'↓');
  }
  function mount(host){
    if(mounted.has(host))return mounted.get(host);
    const section=host.closest('[data-admin-section]'),actor=currentUser?.id;
    const key='vacancy-overview-cards-v1:'+actor;
    let stored;try{stored=JSON.parse(sessionStorage.getItem(key)||'null')}catch{}
    let liveMigrated=false;try{liveMigrated=sessionStorage.getItem('vacancy-overview-live-first:'+actor)==='true'}catch{}
    const used=new Set();
    const initial=Array.isArray(stored)?stored.slice(0,metrics.length):metrics.slice(0,5).map(metric=>({metric:metric.id}));
    const choices=initial.map((entry,i)=>{
      const metric=metrics[i],migrateLive=i===0&&!liveMigrated;
      const wanted=migrateLive?'visitors':entry?.metric;
      const selected=metrics.some(m=>m.id===wanted)&&!used.has(wanted)?wanted:(!used.has(metric.id)?metric.id:metrics.find(m=>!used.has(m.id)).id);
      used.add(selected);return {metric:selected,mode:entry?.mode==='browsers'?'browsers':'events',period:periods.some(p=>p[0]===entry?.period)?entry.period:'30'};
    });
    try{sessionStorage.setItem('vacancy-overview-live-first:'+actor,'true')}catch{}
    try{if(sessionStorage.getItem('vacancy-overview-repeat-card:'+actor)!=='true'){if(!choices.some(c=>c.metric==='repeat_visitors'))choices.push({metric:'repeat_visitors',mode:'events',period:'30'});sessionStorage.setItem('vacancy-overview-repeat-card:'+actor,'true')}}catch{}
    const freshness=document.createElement('p');freshness.className='overview-data-freshness';freshness.setAttribute('role','status');freshness.textContent='Card data: waiting for refresh';host.before(freshness);let refreshVersion=0;
    const cache=new Map(),cards=[];let snapshotAt=new Date(),refreshTimer=null,stopped=false,visible=!section?.hidden&&!document.hidden;
    host.className='overview-metric-row';host.setAttribute('role','region');host.setAttribute('aria-label','Overview metrics');
    const valid=()=>!stopped&&host.isConnected&&location.hash==='#admin'&&currentUser?.id===actor&&!!actor&&VACANCY_BACKEND.assuranceLevel()==='aal2'&&(!VACANCY_BACKEND.session?.()?.user?.id||VACANCY_BACKEND.session().user.id===actor);
    const toolbar=document.createElement('div');toolbar.className='overview-card-toolbar';
    toolbar.innerHTML='<span data-card-status role="status"></span><button type="button" data-overview-add-card>Add card</button><dialog class="overview-add-dialog" aria-labelledby="overviewAddTitle"><form><h3 id="overviewAddTitle">Add card</h3><label>Data<select data-add-metric></select></label><label data-add-count-label>Count<select data-add-count><option value="events">Total events</option><option value="browsers">Distinct browsers</option></select></label><label>Period<select data-add-period>'+periods.map(p=>'<option value="'+p[0]+'">'+p[1]+'</option>').join('')+'</select></label><div class="overview-add-actions"><button type="button" data-add-cancel>Cancel</button><button type="submit">Add card</button></div></form></dialog>';
    host.before(toolbar);
    const addButton=toolbar.querySelector('[data-overview-add-card]'),dialog=toolbar.querySelector('dialog'),picker=toolbar.querySelector('[data-add-metric]'),addPeriod=toolbar.querySelector('[data-add-period]'),addCount=toolbar.querySelector('[data-add-count]');
    const available=()=>metrics.filter(m=>!choices.some(c=>c.metric===m.id));
    const syncCount=()=>{toolbar.querySelector('[data-add-count-label]').hidden=!metrics.find(m=>m.id===picker.value)?.tracking};
    function syncMetricOptions(){
      cards.forEach((card,index)=>{
        card.index=index;const selected=choices[index].metric,label=metrics.find(m=>m.id===selected).label;
        card.metric.replaceChildren(...metrics.filter(m=>m.id===selected||!choices.some((c,i)=>i!==index&&c.metric===m.id)).map(m=>new Option(m.label,m.id)));
        card.metric.value=selected;card.metric.setAttribute('aria-label','Data for card '+(index+1));
        card.mode.setAttribute('aria-label','Counting method for card '+(index+1));card.node.querySelector('[data-card-period]').setAttribute('aria-label','Period for card '+(index+1));
        card.menu.querySelector('summary').setAttribute('aria-label','Manage '+label+' card');
        card.menu.querySelector('[data-card-move="-1"]').disabled=index===0;
        card.menu.querySelector('[data-card-move="1"]').disabled=index===cards.length-1;
      });
      const free=available(),selected=picker.value;picker.replaceChildren(...free.map(m=>new Option(m.label,m.id)));if(free.some(m=>m.id===selected))picker.value=selected;
      addButton.disabled=!free.length;dialog.querySelector('[type="submit"]').disabled=!free.length;syncCount();
      toolbar.querySelector('[data-card-status]').textContent=!cards.length?'No cards yet':!free.length?'All metrics added':'';
    }
    addButton.onclick=()=>{if(!valid())return;syncMetricOptions();addPeriod.value='30';addCount.value='events';dialog.showModal()};
    picker.onchange=syncCount;toolbar.querySelector('[data-add-cancel]').onclick=()=>dialog.close();
    dialog.querySelector('form').onsubmit=event=>{
      event.preventDefault();if(!valid()||!available().some(m=>m.id===picker.value))return;
      const choice={metric:picker.value,mode:addCount.value==='browsers'?'browsers':'events',period:periods.some(p=>p[0]===addPeriod.value)?addPeriod.value:'30'};
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
    function save(){try{sessionStorage.setItem(key,JSON.stringify(choices))}catch{}}
    const unavailableHTML=message=>'<strong data-metric-value>—</strong><p class="overview-card-change">'+esc(message)+'</p><div class="overview-card-graph">'+graph(null)+'</div>';
    function unavailable(card,message){card.body.innerHTML=unavailableHTML(message)}
    async function read(metric){
      if(!cache.has(metric))cache.set(metric,Promise.resolve().then(()=>VACANCY_BACKEND.adminDailyMetricsLocal(metric,180,timeZone)).then(data=>validate(data,metric)).catch(error=>{cache.delete(metric);throw error}));
      return cache.get(metric);
    }
    async function load(card,batch=null){
      if(!cards.includes(card))return;
      const version=++card.request,choice=choices[card.index],metric=metrics.find(m=>m.id===choice.metric),period=choice.period;
      card.node.dataset.metric=metric.id;
      card.icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+metric.icon+'"/></svg>';
      card.node.setAttribute('aria-label',metric.label+' · '+periods.find(p=>p[0]===period)[1]);
      const commit=html=>{const apply=()=>{if(card.request===version&&cards.includes(card)&&valid()&&visible){card.body.innerHTML=html;card.body.removeAttribute('aria-busy')}};if(batch)batch.push(apply);else apply()};
      card.node.removeAttribute('title');if(!batch||!card.body.childElementCount)unavailable(card,'Loading…');card.body.setAttribute('aria-busy','true');
      if(!valid()||!visible)return;
      let timer;
      try{
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
          commit('<strong data-metric-value>'+number(data.total)+'</strong><p class="overview-card-change" data-direction="'+direction+'">'+esc(change)+'</p><small>'+esc(comparisonLabel(period))+'</small><div class="overview-card-graph">'+graph(data.values,metric.label,+interval.start,period,data.timeline,snapshotAt)+'</div>');
          return true;
        }

        const values=await Promise.race([read(metric.id),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Daily data timed out')),15000)})]);
        if(card.request!==version||!valid()||!visible)return;
        const interval=range(period,snapshotAt),current=points(values,interval.start,interval.end);
        if(!current){commit(unavailableHTML('History unavailable for this period'));return false;}
        const comparisonRange=trackingRange(period,snapshotAt),comparisonKey='comparison:'+metric.id+':'+period;
        let comparison=null;
        try{
          if(!cache.has(comparisonKey))cache.set(comparisonKey,Promise.resolve().then(()=>VACANCY_BACKEND.adminMetricComparison(metric.id,comparisonRange.start.toISOString(),comparisonRange.end.toISOString(),comparisonRange.previousStart.toISOString(),comparisonRange.previousEnd.toISOString())).catch(error=>{cache.delete(comparisonKey);throw error}));
          clearTimeout(timer);
          comparison=await Promise.race([cache.get(comparisonKey),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Comparison timed out')),15000)})]);
          if(comparison?.metric!==metric.id||!Number.isSafeInteger(comparison.total)||comparison.total<0||(comparison.previous!==null&&(!Number.isSafeInteger(comparison.previous)||comparison.previous<0)))throw Error('Invalid comparison');
        }catch{comparison=null;}
        if(card.request!==version||!valid()||!visible)return;
        const value=comparison?.total??current.reduce((a,b)=>a+b,0),before=comparison?.previous;
        if(comparison){const last=value-current.slice(0,-1).reduce((a,b)=>a+b,0);if(last<0){commit(unavailableHTML('Data unavailable for this refresh'));return false;}current[current.length-1]=last;}
        const direction=before===null||before===undefined?'same':value>before?'up':value<before?'down':'same';
        const change=before===null?'Earlier history unavailable':changeText(value,before);
        commit('<strong data-metric-value>'+number(value)+'</strong><p class="overview-card-change" data-direction="'+direction+'">'+esc(change)+'</p><small>'+esc(comparisonLabel(period))+'</small><div class="overview-card-graph">'+graph(current,metric.label,interval.start,period,null,snapshotAt)+'</div>');
        card.node.title=date(interval.start)+' to '+date(interval.end-day)+' · local daily totals · comparison uses the same elapsed period';
        return comparison!==null;
      }catch{if(card.request===version&&valid()&&visible)commit(unavailableHTML(metric.tracking?'Tracking unavailable for this period':'Data unavailable. Refresh to retry.'));return false;}
      finally{clearTimeout(timer);}
    }
    function createCard(choice,index){
      const node=document.createElement('article');node.className='overview-metric-card';
      node.innerHTML='<div class="overview-card-heading"><span class="overview-card-icon"></span><select data-card-metric aria-label="Data for card '+(index+1)+'">'+metrics.map(m=>'<option value="'+m.id+'">'+m.label+'</option>').join('')+'</select></div><div class="overview-card-body" aria-live="polite"></div><label class="overview-card-period"><span class="sr-only">Period</span><select data-card-period aria-label="Period for card '+(index+1)+'">'+periods.map(p=>'<option value="'+p[0]+'">'+p[1]+'</option>').join('')+'</select></label>';
      const metric=node.querySelector('[data-card-metric]'),period=node.querySelector('[data-card-period]');metric.value=choice.metric;period.value=choice.period;
      const mode=document.createElement('select');mode.dataset.cardCount='';mode.setAttribute('aria-label','Counting method for card '+(index+1));mode.innerHTML='<option value="events">Total events</option><option value="browsers">Distinct browsers</option>';mode.value=choice.mode;mode.hidden=true;node.querySelector('.overview-card-period').before(mode);
      const menu=document.createElement('details');menu.className='overview-card-menu';menu.innerHTML='<summary>⋯</summary><div><button type="button" data-card-move="-1">Move earlier</button><button type="button" data-card-move="1">Move later</button><button type="button" data-card-remove>Remove card</button></div>';node.querySelector('.overview-card-heading').append(menu);
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
    activity.innerHTML='<div class="section-head"><div><h3>Recorded activity</h3><p>New accounts, listings and enquiries</p></div><label>Period <select aria-label="Activity graph period"><option value="7">Last 7 days</option><option value="30" selected>Last 30 days</option><option value="90">Last 90 days</option></select></label></div><div data-activity-body aria-live="polite"></div>';
    host.after(activity);let graphRequest=0;
    async function activityGraph(){
      const version=++graphRequest,target=activity.querySelector('[data-activity-body]'),period=activity.querySelector('select').value;
      target.textContent='Loading activity…';
      try{
        const values=await Promise.all(metrics.slice(0,3).map(metric=>read(metric.id)));
        if(version!==graphRequest||!valid()||!visible)return;
        const interval=range(period,snapshotAt),series=values.map(value=>points(value,interval.start,interval.end));
        if(series.some(value=>!value)){target.textContent='History unavailable for this period';return;}
        const max=scaleMax(series.flat()),colours=['#ff6b22','#347ef0','#2fa586'];
        let svg='<svg viewBox="0 0 800 280" role="img" aria-label="Recorded daily accounts, listings and enquiries"><title>Recorded activity</title>';
        for(let i=1;i<4;i++){const y=20+i*54;svg+='<line x1="50" x2="780" y1="'+y+'" y2="'+y+'" stroke="#e1e7f0"/><text x="40" y="'+(y+4)+'" text-anchor="end" fill="#637087" font-size="11">'+axisNumber(Math.round(max*(4-i)/4))+'</text>';}
        const major=interval.days<=7?1:interval.days<=30?7:14;
        for(let i=1;i<interval.days;i++){const x=50+i*730/interval.days,isMajor=i%major===0;svg+='<line class="'+(isMajor?'grid-major':'grid-minor')+'" x1="'+x+'" x2="'+x+'" y1="20" y2="236" stroke="#e1e7f0" stroke-width="'+(isMajor?1:.5)+'"/>';}
        series.forEach((values,index)=>{const now=new Date(snapshotAt),fraction=(now.getHours()+now.getMinutes()/60)/24;let coords=values.map((value,i)=>(50+(i===values.length-1?i+fraction:i+1)*730/values.length)+','+(236-value/max*216)).join(' ');if(values.every(n=>n===0))coords='50,236 '+(50+(values.length-1+fraction)*730/values.length)+',236';svg+='<polyline points="'+coords+'" fill="none" stroke="'+colours[index]+'" stroke-width="2.5"/>';});
        svg+='<text x="50" y="265" font-size="11" fill="#637087">'+tick(interval.start)+'</text><text x="780" y="265" text-anchor="end" font-size="11" fill="#637087">'+tick(interval.end-day)+'</text></svg>';
        target.innerHTML='<p class="overview-activity-legend">'+metrics.slice(0,3).map((metric,i)=>'<span style="--series-colour:'+colours[i]+'">'+esc(metric.label)+'</span>').join('')+'</p>'+svg+'<details><summary>View activity data table</summary><div class="journey-table-wrap"><table><thead><tr><th>Date</th>'+metrics.slice(0,3).map(m=>'<th>'+esc(m.label)+'</th>').join('')+'</tr></thead><tbody>'+series[0].map((_,i)=>'<tr><th>'+date(interval.start+i*day)+'</th>'+series.map(values=>'<td>'+values[i]+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></details>';
      }catch{if(version===graphRequest&&valid()&&visible)target.textContent='Activity unavailable. Refresh to retry.';}
    }
    activity.querySelector('select').onchange=()=>void activityGraph();
    async function refresh(){
      clearTimeout(refreshTimer);if(!valid()||!visible)return;
      cache.clear();snapshotAt=new Date();const at=new Date(snapshotAt),version=++refreshVersion,batch=[];
      freshness.textContent='Card data: refreshing…';void activityGraph();
      const results=await Promise.all([...cards].map(card=>load(card,batch)));
      if(version!==refreshVersion||!valid()||!visible)return;
      batch.forEach(apply=>apply());
      const incomplete=results.some(result=>result===false);
      freshness.replaceChildren(document.createTextNode(incomplete?'Card refresh incomplete · ':'Card data refreshed · '));
      const time=document.createElement('time');time.dateTime=at.toISOString();time.textContent=at.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit'});freshness.append(time);
      refreshTimer=setTimeout(refresh,60000);
    }
    function cleanup(){if(stopped)return;stopped=true;if(dialog.open)dialog.close();toolbar.remove();freshness.remove();clearTimeout(refreshTimer);++graphRequest;activity.remove();cards.forEach(card=>++card.request);observer.disconnect();document.removeEventListener('visibilitychange',sync);window.removeEventListener('hashchange',sync);window.removeEventListener('storage',sync);host.replaceChildren();}
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
