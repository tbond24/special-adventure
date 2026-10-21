// Presentation of existing protected reads; no collection or geographic inference.
(() => {
 const safe=x=>escapeHtml(String(x??'')),count=x=>Number.isSafeInteger(x)&&x>=0;
 window.mountVacancyOverviewInsights=function(root){
  const actor=currentUser?.id,section=root.closest('[data-admin-section]');
  void import('./admin-activity-feeds.js?v=20261021').then(()=>{if(root.isConnected&&currentUser?.id===actor&&location.hash==='#admin')window.mountVacancyActivityFeeds(root);});
  const gallery=document.createElement('div');gallery.className='overview-insight-grid';
  gallery.innerHTML='<section class="overview-insight-card overview-live-card"><div class="section-head"><h3>Live activity</h3><button type="button" data-live-refresh>Refresh live activity</button></div><p>Browser IDs seen in the last 5 minutes · not people online. Refreshes every 30 seconds while Overview is visible.</p><div data-live-body role="status">Loading live activity…</div></section><section class="overview-insight-card overview-location-card"><div class="section-head"><h3>Listings by location</h3><button type="button" data-location-refresh>Refresh locations</button></div><p>Listings marked active, grouped by city in the returned records. This is not a verified total of all listings or visitor locations.</p><div data-location-body role="status">Loading locations…</div></section>';
  root.querySelector('.overview-activity-graph').after(gallery);
  const live=gallery.querySelector('[data-live-body]'),locations=gallery.querySelector('[data-location-body]');
  let stopped=false,timer=null,liveCycle=0,samples=[],requests={live:null,location:null};
  const valid=()=>!stopped&&gallery.isConnected&&location.hash==='#admin'&&!!actor&&currentUser?.id===actor&&VACANCY_BACKEND.assuranceLevel()==='aal2'&&(!VACANCY_BACKEND.session?.()?.user?.id||VACANCY_BACKEND.session().user.id===actor);
  const visible=()=>!document.hidden&&!section?.hidden;
  function cancel(){++liveCycle;clearTimeout(timer);for(const k of Object.keys(requests)){requests[k]?.abort();requests[k]=null;}}
  async function read(kind,method,render){
   if(!valid()||!visible())return;
   requests[kind]?.abort();const controller=new AbortController();requests[kind]=controller;
   const target=kind==='live'?live:locations;target.textContent='Loading…';
   let deadline;
   try{
    const data=await Promise.race([method(controller.signal),new Promise((_,reject)=>{controller.signal.addEventListener('abort',()=>reject(Error('Read cancelled or timed out')),{once:true});deadline=setTimeout(()=>controller.abort(),15000);})]);
    if(requests[kind]!==controller||!valid()||!visible())return;
    render(data);
   }catch{if(requests[kind]===controller&&valid()&&visible())target.textContent=kind==='live'?'Live activity unavailable. Refresh to retry.':'Location data unavailable. Refresh to retry.';}
   finally{clearTimeout(deadline);if(requests[kind]===controller)requests[kind]=null;}
  }
  async function refreshLive(){
   const cycle=++liveCycle;clearTimeout(timer);
   await read('live',signal=>VACANCY_BACKEND.recentActivity({signal}),data=>{
    if(!count(data?.browsers_recent)||!Number.isFinite(Date.parse(data.generated_at)))throw Error('Invalid live count');
    const stamp=Date.parse(data.generated_at),last=samples.at(-1);if(last&&stamp<last.time)throw Error('Older live snapshot');
    if(last?.time===stamp)last.value=data.browsers_recent;else samples.push({time:stamp,value:data.browsers_recent});samples=samples.slice(-20);
    const max=Math.max(...samples.map(s=>s.value),1),first=samples[0].time,span=Math.max(stamp-first,1);
    const points=samples.map(s=>`${samples.length===1?162:32+(s.time-first)*260/span},${82-s.value/max*64}`).join(' ');
    const grid=[1,2,3].map(i=>'<line x1="32" x2="292" y1="'+(18+i*16)+'" y2="'+(18+i*16)+'" stroke="#e5e7eb"/>').join('');
    const clock=t=>new Date(t).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit',hour12:true});
    live.innerHTML='<strong class="overview-live-value">'+data.browsers_recent+'</strong><p>Browser IDs · snapshot '+safe(new Date(stamp).toLocaleTimeString())+'</p><svg viewBox="0 0 300 110" role="img" aria-label="Browser activity snapshots collected while this Overview is open"><title>Observed five-minute browser counts · this open Overview only</title>'+grid+'<text x="26" y="21" text-anchor="end" fill="#737b89" font-size="10">'+new Intl.NumberFormat(undefined,{notation:'compact'}).format(max)+'</text><text x="26" y="85" text-anchor="end" fill="#737b89" font-size="10">0</text><text x="32" y="105" fill="#737b89" font-size="10">'+clock(first)+'</text>'+ (samples.length>1?'<polyline points="'+points+'" fill="none" stroke="#2fa586" stroke-width="3"/>':'')+samples.map(s=>'<circle cx="'+(samples.length===1?162:32+(s.time-first)*260/span)+'" cy="'+(82-s.value/max*64)+'" r="4" fill="#2fa586"/>').join('')+'</svg><small>'+(samples.length===1?'First snapshot. Further points appear as reports refresh.':'Recent snapshots from this open Overview; not historical analytics.')+'</small>';
   });
   if(cycle===liveCycle&&valid()&&visible())timer=setTimeout(refreshLive,30000);
  }
  const refreshLocations=()=>read('location',()=>VACANCY_BACKEND.adminVacancies(),rows=>{
   if(!Array.isArray(rows)||rows.some(r=>!r||typeof r.id!=='string'||typeof r.status!=='string'))throw Error('Invalid listings');
   const unique=new Map(rows.map(row=>[row.id,row])),groups=new Map();
   for(const row of unique.values())if(row.status==='active'){
    const p=row.rooms?.properties,city=typeof p?.city==='string'&&p.city.trim()?p.city.trim():'Unknown city';groups.set(city,(groups.get(city)||0)+1);
   }
   const data=[...groups].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])),max=Math.max(...data.map(r=>r[1]),1);
   locations.innerHTML=data.length?'<ul class="overview-location-bars">'+data.map(([city,n])=>'<li><span>'+safe(city)+'</span><meter min="0" max="'+max+'" value="'+n+'" aria-label="'+safe(city)+' listings">'+n+'</meter><strong>'+n+'</strong></li>').join('')+'</ul><small>'+unique.size+' distinct returned listing records · active status only · manual refresh</small>':'<p>No listings marked active in the returned records.</p>';
  });
  const sharedRefresh=()=>{wasVisible=visible();void refreshLive();void refreshLocations()};window.addEventListener('vacancy:refresh-data',sharedRefresh);
  function cleanup(){window.removeEventListener('vacancy:refresh-data',sharedRefresh);if(stopped)return;stopped=true;cancel();samples=[];gallery.replaceChildren();observer.disconnect();document.removeEventListener('visibilitychange',sync);window.removeEventListener('hashchange',sync);window.removeEventListener('storage',sync);}
  let wasVisible=visible();
  function sync(){if(!valid()){cleanup();return;}const next=visible();if(!next&&wasVisible){cancel();samples=[];live.textContent='Live activity paused. Refresh when visible.';locations.textContent='Location results are stale. Refresh when visible.';}else if(next&&!wasVisible){void refreshLive();void refreshLocations();}wasVisible=next;}
  const observer=new MutationObserver(sync);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});document.addEventListener('visibilitychange',sync);window.addEventListener('hashchange',sync);window.addEventListener('storage',sync);
  gallery.querySelector('[data-live-refresh]').onclick=refreshLive;gallery.querySelector('[data-location-refresh]').onclick=refreshLocations;
  void refreshLive();void refreshLocations();return {cleanup};
 };
})();
