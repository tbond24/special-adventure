// Historical journeys and separately expiring active-page presence.
(() => {
 const labels={find:'Find',listing:'Listing',list:'Your listings',create:'Create listing',auth:'Account',other:'Other pages','step:0':'Location','step:1':'Details','step:2':'Review','step:3':'Publish attempt'};
 const safe=s=>escapeHtml(String(s)),count=n=>Number.isSafeInteger(n)&&n>=0;
 function validate(data){
  if(data?.schemaVersion!==1||!count(data.total)||!Number.isFinite(Date.parse(data.generatedAt))||!Array.isArray(data.nodes)||data.nodes.length>10||!Array.isArray(data.edges)||data.edges.length>100)throw Error('Invalid map');
  const nodes=new Map();for(const n of data.nodes){if(!Object.hasOwn(labels,n.id)||nodes.has(n.id)||!count(n.count)||n.count>data.total)throw Error('Invalid node');nodes.set(n.id,n)}
  const edges=new Set();for(const e of data.edges){const key=e.from+'>'+e.to;if(!nodes.has(e.from)||!nodes.has(e.to)||e.from===e.to||!count(e.count)||e.count>Math.min(nodes.get(e.from).count,nodes.get(e.to).count)||edges.has(key))throw Error('Invalid transition');edges.add(key)}
  if((data.total===0&&nodes.size)||[...nodes.values()].reduce((sum,n)=>sum+n.count,0)<data.total)throw Error('Missing nodes');return data;
 }
 function mount(after){
  const actor=currentUser?.id,section=after.closest('[data-admin-section]'),host=document.createElement('section');host.className='overview-journey-map';host.setAttribute('aria-label','Visitor journey map');after.after(host);
  host.innerHTML='<div class="journey-map-heading"><h3>Visitor journey map</h3><div class="journey-map-controls"><label>Period<select data-map-period><option value="today">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label><label>Device<select data-map-device><option value="">All devices</option><option value="desktop">Desktop</option><option value="mobile">Mobile</option><option value="tablet">Tablet</option></select></label><button type="button" data-map-refresh>Refresh map</button></div></div><div class="journey-map-toolbar"><button type="button" data-map-reset hidden disabled>All pages</button><label class="journey-map-switch"><input type="checkbox" role="switch" data-analytics-enabled>Exclude this browser</label></div><p data-map-status role="status">Loading recorded journeys…</p><div data-map-canvas></div>';
  const canvas=host.querySelector('[data-map-canvas]'),status=host.querySelector('[data-map-status]'),period=host.querySelector('[data-map-period]'),device=host.querySelector('[data-map-device]'),toggle=host.querySelector('[data-analytics-enabled]'),reset=host.querySelector('[data-map-reset]');
  const preferenceKey='vacancy-journey-map-preferences:'+actor;try{const saved=JSON.parse(localStorage.getItem(preferenceKey)||'null');if(['today','7','30','90'].includes(saved?.period))period.value=saved.period;if(['','desktop','mobile','tablet'].includes(saved?.device))device.value=saved.device}catch{}
  toggle.checked=!!window.VACANCY_ANALYTICS_PREFERENCES?.disabled;toggle.onchange=()=>{try{VACANCY_ANALYTICS_PREFERENCES.setDisabled(toggle.checked)}catch{toggle.checked=!toggle.checked;status.textContent='Browser storage unavailable. Analytics setting was not changed.'}};
  toggle.checked=true;toggle.disabled=true;toggle.title='Admin browsers are always excluded, including after sign-out.';
  let data=null,focus=null,controller=null,cycle=0,stopped=false,presence=null,presenceTimer=null,expiryTimer=null,presenceCycle=0,dataScope=null,wasVisible=!document.hidden&&!section?.hidden;
  const valid=()=>!stopped&&host.isConnected&&location.hash==='#admin'&&actor&&currentUser?.id===actor&&VACANCY_BACKEND.assuranceLevel()==='aal2'&&(!VACANCY_BACKEND.session?.()?.user?.id||VACANCY_BACKEND.session().user.id===actor);
 function clear(){++presenceCycle;clearTimeout(presenceTimer);clearTimeout(expiryTimer);presence=null;++cycle;controller?.abort();data=null;dataScope=null;focus=null;canvas.replaceChildren();canvas.removeAttribute('aria-busy');reset.disabled=true;reset.hidden=true;status.textContent='Journey map unavailable.'}
 function paint(){
  reset.disabled=!focus;reset.hidden=!focus;
  const live=presence&&Date.parse(presence.expiresAt)>Date.now()?presence:{total:0,nodes:[]};
  const all=data.nodes.map(n=>({...n}));for(const n of live.nodes)if(!all.some(p=>p.id===n.id))all.push({id:n.id,count:0});
  const branches=focus?data.edges.filter(e=>e.from===focus).map(e=>({...all.find(n=>n.id===e.to),count:e.count})):all;
  // Keep controls, graph nodes, disclosure and scroll container alive across reads.
  if(!canvas.querySelector('.journey-map-graph'))canvas.innerHTML='<div class="journey-map-graph"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg><div class="journey-map-centre"><strong></strong><span></span></div></div><p data-map-empty hidden>No recorded journeys in this period.</p><p data-map-branch-empty hidden>No next transition recorded for this page.</p><details><summary>View transition counts</summary><div class="journey-map-table"><table><thead><tr><th>From</th><th>To</th><th>Browsers</th></tr></thead><tbody></tbody></table></div></details>';
  const graph=canvas.querySelector('.journey-map-graph'),centre=graph.querySelector('.journey-map-centre'),details=canvas.querySelector('details'),hasData=!!(data.total||live.total);
  graph.hidden=!hasData;details.hidden=!hasData;canvas.querySelector('[data-map-empty]').hidden=hasData;canvas.querySelector('[data-map-branch-empty]').hidden=!hasData||!!branches.length;
  const centreActive=focus?(live.nodes.find(n=>n.id===focus)?.count||0):live.total;centre.classList.toggle('is-active',centreActive>0);centre.title=centreActive+' active now';centre.querySelector('strong').textContent=Number(focus?(all.find(n=>n.id===focus)?.count||0):data.total).toLocaleString();centre.querySelector('span').textContent=focus?labels[focus]:'Visitors';
  const positions=branches.map((n,i)=>{const angle=-Math.PI/2+i*2*Math.PI/branches.length;return {n,x:50+38*Math.cos(angle),y:50+36*Math.sin(angle)}});
  const max=Math.max(...branches.map(n=>n.count),1),svg=graph.querySelector('svg'),paths=positions.map(({n,x,y})=>'<path d="M50 50 Q50 '+y+' '+x+' '+y+'" fill="none" stroke="#ccd5df" stroke-width="'+(.2+1.1*n.count/max)+'"/>').join('');if(svg.innerHTML!==paths)svg.innerHTML=paths;
  const existing=new Map([...graph.querySelectorAll('[data-node]')].map(node=>[node.dataset.node,node]));
  for(const {n,x,y} of positions){let button=existing.get(n.id);if(!button){button=document.createElement('button');button.type='button';button.className='journey-map-node';button.dataset.node=n.id;button.innerHTML='<strong></strong><span></span>';button.querySelector('span').textContent=labels[n.id];button.onclick=()=>{focus=n.id;paint();reset.focus()};graph.append(button)}existing.delete(n.id);const active=live.nodes.find(p=>p.id===n.id)?.count||0;button.classList.toggle('is-active',active>0);button.title=active?active+' active now':'';button.style.left=x+'%';button.style.top=y+'%';button.querySelector('strong').textContent=n.count.toLocaleString();button.setAttribute('aria-label',labels[n.id]+': '+n.count+' browsers. Explore next steps');}
  for(const node of existing.values()){if(node===document.activeElement){if(!reset.hidden)reset.focus();else host.querySelector('[data-map-refresh]').focus()}node.remove()}
  const tbody=details.querySelector('tbody'),rows=data.edges.filter(e=>!focus||e.from===focus).map(e=>'<tr><td>'+safe(labels[e.from])+'</td><td>'+safe(labels[e.to])+'</td><td>'+e.count+'</td></tr>').join('');if(tbody.innerHTML!==rows){const scroller=details.querySelector('.journey-map-table'),top=scroller.scrollTop,left=scroller.scrollLeft;tbody.innerHTML=rows;scroller.scrollTop=top;scroller.scrollLeft=left;}
 }
  // Presence changes classes/count hints, preserving graph nodes, focus and open details.
  function updatePresence(){
   if(!data)return;
   const live=presence&&Date.parse(presence.expiresAt)>Date.now()?presence:{total:0,nodes:[]};
   const nodes=[...data.nodes];for(const n of live.nodes)if(!nodes.some(p=>p.id===n.id))nodes.push({id:n.id,count:0});
   const expected=focus?data.edges.filter(e=>e.from===focus).map(e=>e.to):nodes.map(n=>n.id);
   const drawn=[...canvas.querySelectorAll('.journey-map-node')];
   if(!canvas.querySelector('.journey-map-graph')||drawn.length!==expected.length||drawn.some(n=>!expected.includes(n.dataset.node))){if(canvas.querySelector('.journey-map-graph')||data.total||live.total)paint();return}
   const centre=canvas.querySelector('.journey-map-centre'),active=focus?(live.nodes.find(n=>n.id===focus)?.count||0):live.total;
   centre.classList.toggle('is-active',active>0);centre.title=active+' active now';
   for(const node of drawn){const count=live.nodes.find(n=>n.id===node.dataset.node)?.count||0;node.classList.toggle('is-active',count>0);node.title=count?count+' active now':'';}
  }
 async function refresh(at=null){
  if(!valid()||document.hidden||section?.hidden)return;controller?.abort();const request=controller=new AbortController(),signal=request.signal,id=++cycle;
  const end=new Date(typeof at==='string'?at:Date.now()),start=new Date(end);start.setHours(0,0,0,0);if(period.value!=='today')start.setDate(start.getDate()-Number(period.value)+1);const scope=period.value+':'+device.value+':'+start.toISOString();
  // A different filter must never present the previous filter's data as current.
  if(dataScope!==scope){data=null;focus=null;canvas.replaceChildren();reset.disabled=true;reset.hidden=true;++presenceCycle;clearTimeout(presenceTimer);clearTimeout(expiryTimer);presence=null;}
  canvas.setAttribute('aria-busy','true');status.textContent=data?'Updating…':'Loading recorded journeys…';
  const deadline=setTimeout(()=>request.abort(),15000);
  try{const report=await Promise.race([VACANCY_BACKEND.adminJourneyMap({p_from:start.toISOString(),p_to:end.toISOString(),p_device:device.value||null},{signal}),new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('Journey read cancelled or timed out')),{once:true}))]);if(id!==cycle||!valid()||document.hidden||section?.hidden||signal.aborted)return;
   const next=validate(report);if(Date.parse(next.from)!==+start||Date.parse(next.to)!==+end||next.device!==(device.value||null))throw Error('Wrong map period');
   data=next;dataScope=scope;const removed=focus&&!data.nodes.some(n=>n.id===focus)&&!presence?.nodes.some(n=>n.id===focus);if(removed)focus=null;paint();status.textContent=removed?'Selected page no longer appears in this period. Showing all pages.':'Updated '+new Date(data.generatedAt).toLocaleTimeString();void refreshPresence();
  }catch(error){if(id===cycle&&valid()&&!document.hidden&&!section?.hidden){if(error.status===401||error.status===403||['42501','PGRST301'].includes(error.code))clear();else status.textContent=data?'Journey map unavailable. Showing the last successful update.':'Journey map unavailable. Refresh to retry.';}}
  finally{clearTimeout(deadline);if(id===cycle){canvas.removeAttribute('aria-busy');if(controller===request)controller=null;}}
 }
  async function refreshPresence(){
   clearTimeout(presenceTimer);const request=++presenceCycle;
   if(!valid()||document.hidden||section?.hidden)return;
   try{const report=await Promise.race([VACANCY_BACKEND.adminVisitorPresence(device.value||null),new Promise((_,reject)=>setTimeout(()=>reject(Error('Presence timeout')),5000))]);if(request!==presenceCycle||!valid()||document.hidden)return;
    if(!count(report?.total)||!Array.isArray(report.nodes)||report.nodes.length>10||report.nodes.some(n=>!Object.hasOwn(labels,n.id)||!count(n.count)||n.count>report.total)||!Number.isFinite(Date.parse(report.expiresAt)))throw Error('Invalid presence');
    const lifetime=Math.min(10000,Date.parse(report.expiresAt)-Date.now());if(lifetime>0){clearTimeout(expiryTimer);presence=report;updatePresence();expiryTimer=setTimeout(()=>{presence=null;if(data&&valid())updatePresence()},lifetime)}
   }catch{if(request!==presenceCycle)return;presence=null;if(data&&valid())updatePresence()}
   if(valid()&&!document.hidden&&!section?.hidden)presenceTimer=setTimeout(refreshPresence,10000);
  }
 function visibility(){wasVisible=!document.hidden&&!section?.hidden;if(!wasVisible){++cycle;controller?.abort();canvas.removeAttribute('aria-busy');++presenceCycle;clearTimeout(presenceTimer);clearTimeout(expiryTimer);presence=null;if(data&&valid()){updatePresence();status.textContent='Updates paused.'}}else void refresh()}
  const sharedRefresh=event=>void refresh(event.detail?.at);window.addEventListener('vacancy:refresh-data',sharedRefresh);document.addEventListener('visibilitychange',visibility);
  reset.onclick=()=>{focus=null;paint()};period.onchange=device.onchange=()=>{try{localStorage.setItem(preferenceKey,JSON.stringify({period:period.value,device:device.value}))}catch{}void refresh()};host.querySelector('[data-map-refresh]').onclick=refresh;
  function sync(){if(!valid()){clear();stopped=true;observer.disconnect();intersection?.disconnect();window.removeEventListener('vacancy:refresh-data',sharedRefresh);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('hashchange',sync);window.removeEventListener('storage',sync)}else if(wasVisible!==(!document.hidden&&!section?.hidden))visibility()}
  const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});window.addEventListener('hashchange',sync);window.addEventListener('storage',sync);
  let intersection=null;if('IntersectionObserver'in window){intersection=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){intersection.disconnect();void refresh()}});intersection.observe(host)}else void refresh();
  return {refresh,destroy(){clear();stopped=true;observer.disconnect();intersection?.disconnect();window.removeEventListener('vacancy:refresh-data',sharedRefresh);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('hashchange',sync);window.removeEventListener('storage',sync);host.remove()}};
 }
 window.VACANCY_JOURNEY_MAP=Object.freeze({mount,validate});
})();
