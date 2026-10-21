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
  const periods=[['today','Today'],['yesterday','Yesterday'],['7','7 days'],['30','30 days'],['90','90 days']];
  const date=n=>new Date(n).toISOString().slice(0,10);
  const number=n=>n.toLocaleString(undefined,{maximumFractionDigits:1});
  const esc=s=>escapeHtml(String(s));
  function range(period){
    const today=Date.parse(date(Date.now())+'T00:00:00Z');
    const days=period==='today'||period==='yesterday'?1:Number(period);
    const end=period==='yesterday'?today:today+day;
    return {days,start:end-days*day,end,previous:end-2*days*day};
  }
  function validate(report,metric){
    const count=n=>Number.isSafeInteger(n)&&n>=0;
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
  function graph(values,label){
    if(!values)return '<span class="overview-card-no-graph">No history</span>';
    const max=Math.max(...values,1),coords=values.map((value,i)=>[values.length===1?56:4+i*104/(values.length-1),42-value/max*34]);
    const line=coords.map(p=>p.join(',')).join(' '),last=coords.at(-1);
    return '<svg viewBox="0 0 112 48" role="img" aria-label="'+esc(label)+'"><title>'+esc(label)+(values.length===1?' · one daily total; no intraday history':'')+'</title>'+
      (values.length===1?'':'<polygon points="4,46 '+line+' 108,46" fill="currentColor" opacity=".09"/><polyline points="'+line+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>')+
      '<circle cx="'+last[0]+'" cy="'+last[1]+'" r="2.5" fill="currentColor"/></svg>';
  }
  function mount(host){
    if(mounted.has(host))return mounted.get(host);
    const section=host.closest('[data-admin-section]'),actor=currentUser?.id;
    const key='vacancy-overview-cards-v1:'+actor;
    let stored;try{stored=JSON.parse(sessionStorage.getItem(key)||'null')}catch{}
    const choices=metrics.map((metric,i)=>({metric:metrics.some(m=>m.id===stored?.[i]?.metric)?stored[i].metric:metric.id,period:periods.some(p=>p[0]===stored?.[i]?.period)?stored[i].period:'30'}));
    const cache=new Map(),cards=[];let stopped=false,visible=!section?.hidden&&!document.hidden;
    host.className='overview-metric-row';host.setAttribute('role','region');host.setAttribute('aria-label','Overview metrics');
    const valid=()=>!stopped&&host.isConnected&&location.hash==='#admin'&&currentUser?.id===actor&&!!actor&&VACANCY_BACKEND.assuranceLevel()==='aal2'&&(!VACANCY_BACKEND.session?.()?.user?.id||VACANCY_BACKEND.session().user.id===actor);
    function save(){try{sessionStorage.setItem(key,JSON.stringify(choices))}catch{}}
    function unavailable(card,message){card.body.innerHTML='<strong data-metric-value>—</strong><p class="overview-card-change">'+esc(message)+'</p><div class="overview-card-graph">'+graph(null)+'</div>';}
    async function read(metric){
      if(!cache.has(metric))cache.set(metric,Promise.resolve().then(()=>VACANCY_BACKEND.adminDailyMetrics(metric,180)).then(data=>validate(data,metric)).catch(error=>{cache.delete(metric);throw error}));
      return cache.get(metric);
    }
    async function load(card){
      const version=++card.request,choice=choices[card.index],metric=metrics.find(m=>m.id===choice.metric),period=choice.period;
      card.node.dataset.metric=metric.id;
      card.icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+metric.icon+'"/></svg>';
      card.node.setAttribute('aria-label',metric.label+' · '+periods.find(p=>p[0]===period)[1]);
      unavailable(card,'Loading…');
      if(!valid()||!visible)return;
      let timer;
      try{
        const values=await Promise.race([read(metric.id),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Daily data timed out')),15000)})]);
        if(card.request!==version||!valid()||!visible)return;
        const interval=range(period),current=points(values,interval.start,interval.end),previous=points(values,interval.previous,interval.start);
        if(!current){unavailable(card,'History unavailable for this period');return;}
        const value=current.reduce((a,b)=>a+b,0),before=previous?.reduce((a,b)=>a+b,0);
        let direction='same',change='Comparison unavailable';
        if(previous){
          direction=value>before?'up':value<before?'down':'same';
          change=before===0?(value===0?'No change':'New · previous 0'):(direction==='same'?'No change':(direction==='up'?'↑ ':'↓ ')+number(Math.abs(100*(value-before)/before))+'%');
        }
        const comparison=period==='today'?'vs yesterday’s full day':period==='yesterday'?'vs the day before':'vs previous '+interval.days+' days';
        card.body.innerHTML='<strong data-metric-value>'+number(value)+'</strong><p class="overview-card-change" data-direction="'+direction+'">'+change+'</p><small>'+(previous?comparison:'Earlier history unavailable')+'</small><div class="overview-card-graph">'+graph(current,metric.label+' · daily totals in UTC')+'</div>';
        card.node.title=date(interval.start)+' to '+date(interval.end-day)+' · UTC daily totals'+(period==='yesterday'?'':' · includes today so far');
      }catch{if(card.request===version&&valid()&&visible)unavailable(card,'Data unavailable. Refresh to retry.');}
      finally{clearTimeout(timer);}
    }
    choices.forEach((choice,index)=>{
      const node=document.createElement('article');node.className='overview-metric-card';
      node.innerHTML='<div class="overview-card-heading"><span class="overview-card-icon"></span><select data-card-metric aria-label="Data for card '+(index+1)+'">'+metrics.map(m=>'<option value="'+m.id+'">'+m.label+'</option>').join('')+'</select></div><div class="overview-card-body" aria-live="polite"></div><label class="overview-card-period"><span>Period · UTC</span><select data-card-period aria-label="Period for card '+(index+1)+'">'+periods.map(p=>'<option value="'+p[0]+'">'+p[1]+'</option>').join('')+'</select></label>';
      const metric=node.querySelector('[data-card-metric]'),period=node.querySelector('[data-card-period]');metric.value=choice.metric;period.value=choice.period;
      const card={node,index,request:0,icon:node.querySelector('.overview-card-icon'),body:node.querySelector('.overview-card-body')};cards.push(card);host.append(node);
      metric.onchange=()=>{choice.metric=metric.value;save();void load(card)};
      period.onchange=()=>{choice.period=period.value;save();void load(card)};
    });
    const activity=document.createElement('section');activity.className='overview-activity-graph';
    activity.innerHTML='<div class="section-head"><div><h3>Recorded activity</h3><p>New accounts, new listings and enquiries · daily totals in UTC</p></div><label>Period <select aria-label="Activity graph period"><option value="7">7 days</option><option value="30" selected>30 days</option><option value="90">90 days</option></select></label></div><div data-activity-body aria-live="polite"></div>';
    host.after(activity);let graphRequest=0;
    async function activityGraph(){
      const version=++graphRequest,target=activity.querySelector('[data-activity-body]'),period=activity.querySelector('select').value;
      target.textContent='Loading activity…';
      try{
        const values=await Promise.all(metrics.slice(0,3).map(metric=>read(metric.id)));
        if(version!==graphRequest||!valid()||!visible)return;
        const interval=range(period),series=values.map(value=>points(value,interval.start,interval.end));
        if(series.some(value=>!value)){target.textContent='History unavailable for this period';return;}
        const max=Math.max(...series.flat(),1),colours=['#ff6b22','#347ef0','#2fa586'];
        let svg='<svg viewBox="0 0 800 280" role="img" aria-label="Recorded daily accounts, listings and enquiries"><title>Recorded activity · daily totals in UTC</title>';
        for(let i=0;i<=4;i++){const y=20+i*54;svg+='<line x1="50" x2="780" y1="'+y+'" y2="'+y+'" stroke="#e1e7f0"/><text x="40" y="'+(y+4)+'" text-anchor="end" fill="#637087" font-size="11">'+Math.round(max*(4-i)/4)+'</text>';}
        series.forEach((values,index)=>{const coords=values.map((value,i)=>(50+i*730/(values.length-1))+','+(236-value/max*216)).join(' ');svg+='<polyline points="'+coords+'" fill="none" stroke="'+colours[index]+'" stroke-width="2.5"/>';});
        svg+='<text x="50" y="265" font-size="11" fill="#637087">'+date(interval.start)+'</text><text x="780" y="265" text-anchor="end" font-size="11" fill="#637087">'+date(interval.end-day)+'</text></svg>';
        target.innerHTML='<p class="overview-activity-legend">'+metrics.slice(0,3).map((metric,i)=>'<span style="--series-colour:'+colours[i]+'">'+esc(metric.label)+'</span>').join('')+'</p>'+svg+'<details><summary>View activity data table</summary><div class="journey-table-wrap"><table><thead><tr><th>Date · UTC</th>'+metrics.slice(0,3).map(m=>'<th>'+esc(m.label)+'</th>').join('')+'</tr></thead><tbody>'+series[0].map((_,i)=>'<tr><th>'+date(interval.start+i*day)+'</th>'+series.map(values=>'<td>'+values[i]+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></details>';
      }catch{if(version===graphRequest&&valid()&&visible)target.textContent='Activity unavailable. Refresh to retry.';}
    }
    activity.querySelector('select').onchange=()=>void activityGraph();
    function refresh(){cache.clear();cards.forEach(card=>void load(card));void activityGraph();}
    function cleanup(){if(stopped)return;stopped=true;++graphRequest;activity.remove();cards.forEach(card=>++card.request);observer.disconnect();document.removeEventListener('visibilitychange',sync);window.removeEventListener('hashchange',sync);window.removeEventListener('storage',sync);host.replaceChildren();}
    function sync(){
      if(!valid()){cleanup();return;}
      const next=!document.hidden&&!section?.hidden;
      if(!next&&visible){visible=false;++graphRequest;activity.querySelector('[data-activity-body]').textContent='Refresh when visible';cards.forEach(card=>{++card.request;unavailable(card,'Refresh when visible');});}
      else if(next&&!visible){visible=true;refresh();}
    }
    const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});document.addEventListener('visibilitychange',sync);window.addEventListener('hashchange',sync);window.addEventListener('storage',sync);
    const api={refresh,cleanup};mounted.set(host,api);refresh();return api;
  }
  window.VACANCY_OVERVIEW_CARDS={mount};
})();
